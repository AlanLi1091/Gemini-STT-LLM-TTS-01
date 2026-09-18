// @vitest-environment node
import { GoogleGenAI } from '@google/genai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatError } from '@core/chat';
import { createGeminiStreamSourceFromEnv } from '../gemini-stream-source';

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

describe('Task 12 Step 2: Gemini 服务端流源', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应从服务端环境变量注入 Key，并映射 Gemini chunk/done 与 AbortSignal', async () => {
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
    const controller = new AbortController();
    const source = createGeminiStreamSourceFromEnv({
      GEMINI_API_KEY: ' server-secret-key ',
    });
    const events = [];

    for await (const event of source(
      { messages: [{ role: 'user', content: '问候' }] },
      { signal: controller.signal },
    )) {
      events.push(event);
    }

    expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'server-secret-key' });
    expect(mockGenerateContentStream).toHaveBeenCalledWith({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: '问候' }] }],
      config: {
        systemInstruction: undefined,
        temperature: undefined,
        maxOutputTokens: undefined,
        abortSignal: controller.signal,
      },
    });
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

  it('缺少服务端 Key 时应抛出 AUTH_ERROR 且不调用 Gemini SDK', async () => {
    const source = createGeminiStreamSourceFromEnv({});

    await expect(async () => {
      for await (const _event of source(
        { messages: [{ role: 'user', content: '你好' }] },
        { signal: new AbortController().signal },
      )) {
        // no-op
      }
    }).rejects.toSatisfy(
      (error: unknown) => error instanceof ChatError && error.code === 'AUTH_ERROR',
    );
    expect(GoogleGenAI).not.toHaveBeenCalled();
    expect(mockGenerateContentStream).not.toHaveBeenCalled();
  });
});
