// @vitest-environment node
import { GoogleGenAI } from '@google/genai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatSseEvent } from '@core/contracts/sse';
import { createChatStreamSourceFromEnv } from '../chat-adapter-stream-source';

const mockGenerateContentStream = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(function () {
    return {
      models: {
        generateContentStream: mockGenerateContentStream,
      },
    };
  }),
}));

async function collectEvents(
  source: ReturnType<typeof createChatStreamSourceFromEnv>,
): Promise<ChatSseEvent[]> {
  const events: ChatSseEvent[] = [];
  for await (const event of source(
    { messages: [{ role: 'user', content: '问候' }] },
    { signal: new AbortController().signal },
  )) {
    events.push(event);
  }
  return events;
}

describe('Task 12 Step 3: Adapter 自动选择与统一错误透传', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('有效服务端 Key 应选择 Gemini，并映射 chunk/done 与 AbortSignal', async () => {
    mockGenerateContentStream.mockResolvedValueOnce(
      (async function* () {
        yield {
          text: '你好',
          usageMetadata: {
            promptTokenCount: 2,
            candidatesTokenCount: 1,
            totalTokenCount: 3,
          },
        };
      })(),
    );
    const source = createChatStreamSourceFromEnv({
      GEMINI_API_KEY: ' server-secret-key ',
    });
    const events = await collectEvents(source);

    expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'server-secret-key' });
    expect(mockGenerateContentStream).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-3.8-flash',
        contents: [{ role: 'user', parts: [{ text: '问候' }] }],
        config: expect.objectContaining({ abortSignal: expect.any(AbortSignal) }),
      }),
    );
    expect(events).toEqual([
      {
        event: 'chunk',
        data: { delta: '你好', accumulated: '你好' },
      },
      {
        event: 'done',
        data: {
          content: '你好',
          usage: { promptTokens: 2, completionTokens: 1, totalTokens: 3 },
        },
      },
    ]);
  });

  it('缺少、空白或不可见字符 Key 时应自动降级共享 MockAdapter', async () => {
    for (const apiKey of [undefined, '   ', '\u200B']) {
      const source = createChatStreamSourceFromEnv(
        { GEMINI_API_KEY: apiKey },
        { mockAdapterOptions: { delayMs: 0, streamChunkDelayMs: 0 } },
      );
      const events = await collectEvents(source);
      const finalEvent = events.at(-1);

      expect(events.some((event) => event.event === 'chunk')).toBe(true);
      expect(finalEvent?.event).toBe('done');
      if (finalEvent?.event === 'done') {
        expect(finalEvent.data.content).toContain('Mock');
      }
    }

    expect(GoogleGenAI).not.toHaveBeenCalled();
    expect(mockGenerateContentStream).not.toHaveBeenCalled();
  });

  it('Gemini 错误应通过 SSE error 事件透传标准 code 与 message', async () => {
    mockGenerateContentStream.mockRejectedValueOnce({
      status: 429,
      message: 'Quota exceeded',
    });
    const source = createChatStreamSourceFromEnv({ GEMINI_API_KEY: 'server-key' });

    await expect(collectEvents(source)).resolves.toEqual([
      {
        event: 'error',
        data: {
          error: {
            code: 'RATE_LIMIT',
            message: 'Quota exceeded',
          },
        },
      },
    ]);
  });
});
