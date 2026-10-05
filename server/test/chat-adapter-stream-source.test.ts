// @vitest-environment node
import { GoogleGenAI } from '@google/genai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatSseEvent } from '@core/contracts/sse';
import { createChatStreamSourceFromEnv } from '../chat-adapter-stream-source';
import { RequestBudget } from '../request-budget';
import { JsonSessionStorage } from '../storage/json-session-storage';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

  it('Web 与频道共用预算，超限不调用 SDK 或追加会话输入', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'gemini-budget-'));
    try {
      const storage = new JsonSessionStorage(directory); const session = await storage.resolveDiscordSession('111111111111111111', '222222222222222222');
      mockGenerateContentStream.mockResolvedValueOnce((async function* () { yield { text: '回复' }; })());
      const source = createChatStreamSourceFromEnv({ GEMINI_API_KEY: 'fake' }, { sessionStorage: storage, requestBudget: new RequestBudget({ requestsPerMinute: 1 }) });
      await collectEvents(source);
      const events = [];
      for await (const event of source({ sessionId: session.id, messages: [{ role: 'user', content: '不应写入' }] }, { signal: new AbortController().signal })) events.push(event);
      expect(events).toEqual([expect.objectContaining({ event: 'error', data: { error: { code: 'RATE_LIMIT', message: expect.stringContaining('预算') } } })]);
      expect(mockGenerateContentStream).toHaveBeenCalledOnce(); expect((await storage.getSession(session.id))?.messages).toEqual([]);
    } finally { await rm(directory, { recursive: true }); }
  });
  it('上游 429 后暂停，期间不调用 SDK，到期可恢复', async () => {
    let now = 0; const budget = new RequestBudget({ now: () => now });
    const source = createChatStreamSourceFromEnv({ GEMINI_API_KEY: 'fake' }, { requestBudget: budget });
    mockGenerateContentStream.mockRejectedValueOnce({ status: 429 }); await collectEvents(source);
    await collectEvents(source); expect(mockGenerateContentStream).toHaveBeenCalledOnce();
    now = 60000; mockGenerateContentStream.mockResolvedValueOnce((async function* () { yield { text: '恢复' }; })());
    expect((await collectEvents(source)).at(-1)?.event).toBe('done'); expect(mockGenerateContentStream).toHaveBeenCalledTimes(2);
  });
  it('Mock 不消耗或受 Gemini 预算影响', async () => {
    const budget = new RequestBudget({ requestsPerMinute: 1 }); budget.pause();
    const source = createChatStreamSourceFromEnv({}, { requestBudget: budget, mockAdapterOptions: { delayMs: 0, streamChunkDelayMs: 0 } });
    expect((await collectEvents(source)).at(-1)?.event).toBe('done'); expect((await collectEvents(source)).at(-1)?.event).toBe('done');
    expect(mockGenerateContentStream).not.toHaveBeenCalled();
  });
  it('已中止请求不消耗预算或调用 SDK', async () => {
    const budget = new RequestBudget({ requestsPerMinute: 1 }); const controller = new AbortController(); controller.abort();
    const source = createChatStreamSourceFromEnv({ GEMINI_API_KEY: 'fake' }, { requestBudget: budget });
    const events = []; for await (const event of source({ messages: [] }, { signal: controller.signal })) events.push(event);
    expect(events).toEqual([]); expect(mockGenerateContentStream).not.toHaveBeenCalled(); expect(budget.acquire()).toBe(0);
  });
  it('非法服务端预算配置在启动时拒绝', () => {
    expect(() => createChatStreamSourceFromEnv({ GEMINI_API_KEY: 'fake', GEMINI_REQUESTS_PER_MINUTE: '0' })).toThrow('budget configuration');
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
