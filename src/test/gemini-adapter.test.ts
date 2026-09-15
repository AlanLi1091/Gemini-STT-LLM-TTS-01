import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GeminiChatAdapter,
  formatGeminiContents,
  resolveSystemInstruction,
  classifyGeminiError,
} from '../adapters/GeminiChatAdapter';
import { ChatError, Message } from '../types';

// Mock @google/genai
const mockGenerateContent = vi.fn();
const mockGenerateContentStream = vi.fn();

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn(function () {
      return {
        models: {
          generateContent: mockGenerateContent,
          generateContentStream: mockGenerateContentStream,
        },
      };
    }),
  };
});

describe('GeminiChatAdapter Unit Tests (Task 7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('辅助方法测试', () => {
    it('formatGeminiContents: 正确映射 user 为 user，assistant 为 model，过滤 system', () => {
      const messages: Message[] = [
        { id: '1', role: 'system', content: 'You are an actor', createdAt: 1 },
        { id: '2', role: 'user', content: 'Hello', createdAt: 2 },
        { id: '3', role: 'assistant', content: 'Hi there', createdAt: 3 },
      ];

      const contents = formatGeminiContents(messages);
      expect(contents).toEqual([
        { role: 'user', parts: [{ text: 'Hello' }] },
        { role: 'model', parts: [{ text: 'Hi there' }] },
      ]);
    });

    it('resolveSystemInstruction: 合并配置项与历史中的 system 角色指令', () => {
      const messages: Message[] = [
        { id: '1', role: 'system', content: 'Rule 1: Be polite', createdAt: 1 },
        { id: '2', role: 'user', content: 'Hello', createdAt: 2 },
        { id: '3', role: 'system', content: 'Rule 2: Speak concisely', createdAt: 3 },
      ];

      const instruction = resolveSystemInstruction(messages, 'Base instruction');
      expect(instruction).toBe('Base instruction\n\nRule 1: Be polite\n\nRule 2: Speak concisely');
    });

    it('resolveSystemInstruction: 无 system 角色及配置时返回 undefined', () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: 'Hello', createdAt: 1 },
      ];

      expect(resolveSystemInstruction(messages, undefined)).toBeUndefined();
    });

    describe('classifyGeminiError 错误分类器', () => {
      it('识别用户中断 ABORTED', () => {
        const controller = new AbortController();
        controller.abort();
        const err = classifyGeminiError(new Error('User cancelled'), controller.signal);
        expect(err.code).toBe('ABORTED');
      });

      it('识别鉴权与 Key 错误 AUTH_ERROR (401, 403, API_KEY_INVALID)', () => {
        const err401 = classifyGeminiError({ status: 401, message: 'Unauthorized' });
        expect(err401.code).toBe('AUTH_ERROR');

        const errKey = classifyGeminiError(new Error('API key not valid. Please pass a valid API key.'));
        expect(errKey.code).toBe('AUTH_ERROR');
      });

      it('识别配额与频控错误 RATE_LIMIT (429, RESOURCE_EXHAUSTED)', () => {
        const err429 = classifyGeminiError({ status: 429, message: 'Too many requests' });
        expect(err429.code).toBe('RATE_LIMIT');

        const errQuota = classifyGeminiError(new Error('Resource has been exhausted (e.g. check quota).'));
        expect(errQuota.code).toBe('RATE_LIMIT');
      });

      it('识别网络错误 NETWORK_ERROR', () => {
        const netErr = classifyGeminiError(new TypeError('Failed to fetch'));
        expect(netErr.code).toBe('NETWORK_ERROR');

        const connErr = classifyGeminiError({ code: 'ECONNREFUSED', message: 'connect ECONNREFUSED' });
        expect(connErr.code).toBe('NETWORK_ERROR');
      });

      it('识别服务端与模型拦截错误 MODEL_ERROR', () => {
        const serverErr = classifyGeminiError({ status: 503, message: 'Model is overloaded' });
        expect(serverErr.code).toBe('MODEL_ERROR');

        const safetyErr = classifyGeminiError(new Error('Candidate was blocked due to SAFETY'));
        expect(safetyErr.code).toBe('MODEL_ERROR');
      });

      it('未知异常归类为 UNKNOWN', () => {
        const unknownErr = classifyGeminiError(new Error('Something random happened'));
        expect(unknownErr.code).toBe('UNKNOWN');
      });
    });
  });

  describe('GeminiChatAdapter 实例与属性', () => {
    it('初始化时设置正确的 id、name，默认模型为 gemini-3.8-flash', () => {
      const adapter = new GeminiChatAdapter({ apiKey: 'fake-key' });
      expect(adapter.id).toBe('gemini-gemini-3.8-flash');
      expect(adapter.name).toBe('Gemini (gemini-3.8-flash)');
    });

    it('支持传入自定义模型名称', () => {
      const adapter = new GeminiChatAdapter({ apiKey: 'fake-key', model: 'gemini-2.5-pro' });
      expect(adapter.id).toBe('gemini-gemini-2.5-pro');
      expect(adapter.name).toBe('Gemini (gemini-2.5-pro)');
    });
  });

  describe('GeminiChatAdapter.send', () => {
    it('当未配置 apiKey 时，抛出 AUTH_ERROR 类型的 ChatError', async () => {
      const adapter = new GeminiChatAdapter({ apiKey: '' });
      await expect(
        adapter.send([{ id: '1', role: 'user', content: 'test', createdAt: 1 }])
      ).rejects.toMatchObject({
        code: 'AUTH_ERROR',
      });
    });

    it('当 apiKey 仅含空白字符时，send 抛出 AUTH_ERROR 且不发请求', async () => {
      const adapter = new GeminiChatAdapter({ apiKey: '    ' });
      await expect(
        adapter.send([{ id: '1', role: 'user', content: 'test', createdAt: 1 }])
      ).rejects.toMatchObject({
        code: 'AUTH_ERROR',
      });
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('当未配置 apiKey 时，stream 迭代抛出 AUTH_ERROR 类型的 ChatError', async () => {
      const adapter = new GeminiChatAdapter({ apiKey: '   ' });
      const streamGen = adapter.stream([{ id: '1', role: 'user', content: 'test', createdAt: 1 }]);
      await expect(streamGen[Symbol.asyncIterator]().next()).rejects.toMatchObject({
        code: 'AUTH_ERROR',
      });
    });

    it('当传入已 aborted 的 signal 时，抛出 ABORTED 类型的 ChatError', async () => {
      const adapter = new GeminiChatAdapter({ apiKey: 'valid-key' });
      const controller = new AbortController();
      controller.abort();

      await expect(
        adapter.send([{ id: '1', role: 'user', content: 'test', createdAt: 1 }], {
          signal: controller.signal,
        })
      ).rejects.toMatchObject({
        code: 'ABORTED',
      });
    });

    it('正常调用：传递正确的参数，并正确提取 content 与 usageMetadata', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: '这是来自 Gemini 的智能回复',
        usageMetadata: {
          promptTokenCount: 15,
          candidatesTokenCount: 25,
          totalTokenCount: 40,
        },
      });

      const adapter = new GeminiChatAdapter({
        apiKey: 'test-api-key',
        model: 'gemini-3.8-flash',
        systemInstruction: 'You are a pirate.',
      });

      const messages: Message[] = [
        { id: '1', role: 'user', content: 'Ahoy!', createdAt: 1 },
      ];

      const response = await adapter.send(messages, {
        temperature: 0.7,
        maxTokens: 100,
      });

      expect(mockGenerateContent).toHaveBeenCalledWith({
        model: 'gemini-3.8-flash',
        contents: [{ role: 'user', parts: [{ text: 'Ahoy!' }] }],
        config: {
          systemInstruction: 'You are a pirate.',
          temperature: 0.7,
          maxOutputTokens: 100,
          abortSignal: undefined,
        },
      });

      expect(response.content).toBe('这是来自 Gemini 的智能回复');
      expect(response.usage).toEqual({
        promptTokens: 15,
        completionTokens: 25,
        totalTokens: 40,
      });
    });

    it('当 SDK 抛出 401 鉴权异常时，转译为 AUTH_ERROR 的 ChatError', async () => {
      mockGenerateContent.mockRejectedValueOnce({
        status: 401,
        message: 'Invalid API Key',
      });

      const adapter = new GeminiChatAdapter({ apiKey: 'invalid-key' });

      await expect(
        adapter.send([{ id: '1', role: 'user', content: 'hi', createdAt: 1 }])
      ).rejects.toSatisfy((err: unknown) => {
        return err instanceof ChatError && err.code === 'AUTH_ERROR' && err.status === 401;
      });
    });

    it('当 SDK 抛出 403 / PERMISSION_DENIED 异常时，转译为 AUTH_ERROR 的 ChatError', async () => {
      mockGenerateContent.mockRejectedValueOnce({
        status: 403,
        message: 'The caller does not have permission: PERMISSION_DENIED',
      });

      const adapter = new GeminiChatAdapter({ apiKey: 'denied-key' });

      await expect(
        adapter.send([{ id: '1', role: 'user', content: 'hi', createdAt: 1 }])
      ).rejects.toSatisfy((err: unknown) => {
        return err instanceof ChatError && err.code === 'AUTH_ERROR' && err.status === 403;
      });
    });

    it('当发生 Headers non ISO-8859-1 code point 异常时，转译为友好的 AUTH_ERROR ChatError', async () => {
      mockGenerateContent.mockRejectedValueOnce(
        new TypeError("Failed to execute 'append' on 'Headers': String contains non ISO-8859-1 code point.")
      );

      const adapter = new GeminiChatAdapter({ apiKey: 'key-with-unicode' });

      await expect(
        adapter.send([{ id: '1', role: 'user', content: 'hi', createdAt: 1 }])
      ).rejects.toSatisfy((err: unknown) => {
        return (
          err instanceof ChatError &&
          err.code === 'AUTH_ERROR' &&
          err.message.includes('不可见')
        );
      });
    });

    it('当 SDK 抛出 429 配额异常时，转译为 RATE_LIMIT 的 ChatError', async () => {
      mockGenerateContent.mockRejectedValueOnce({
        status: 429,
        message: 'Quota exceeded',
      });

      const adapter = new GeminiChatAdapter({ apiKey: 'valid-key' });

      await expect(
        adapter.send([{ id: '1', role: 'user', content: 'hi', createdAt: 1 }])
      ).rejects.toSatisfy((err: unknown) => {
        return err instanceof ChatError && err.code === 'RATE_LIMIT' && err.status === 429;
      });
    });

    it('当 SDK 抛出网络异常时，转译为 NETWORK_ERROR 的 ChatError', async () => {
      mockGenerateContent.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const adapter = new GeminiChatAdapter({ apiKey: 'valid-key' });

      await expect(
        adapter.send([{ id: '1', role: 'user', content: 'hi', createdAt: 1 }])
      ).rejects.toSatisfy((err: unknown) => {
        return err instanceof ChatError && err.code === 'NETWORK_ERROR';
      });
    });
  });

  describe('stream 流式接口测试 (Task 10)', () => {
    it('缺少有效 API Key 时，直接抛出 AUTH_ERROR 的 ChatError，不调用 SDK', async () => {
      const adapter = new GeminiChatAdapter({ apiKey: '   ' });

      await expect(async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of adapter.stream([{ id: '1', role: 'user', content: 'hi', createdAt: 1 }])) {
          // no-op
        }
      }).rejects.toSatisfy((err: unknown) => {
        return err instanceof ChatError && err.code === 'AUTH_ERROR';
      });

      expect(mockGenerateContentStream).not.toHaveBeenCalled();
    });

    it('已中断的 AbortSignal 传入时，直接抛出 ABORTED 的 ChatError', async () => {
      const controller = new AbortController();
      controller.abort();

      const adapter = new GeminiChatAdapter({ apiKey: 'valid-key' });

      await expect(async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of adapter.stream(
          [{ id: '1', role: 'user', content: 'hi', createdAt: 1 }],
          { signal: controller.signal }
        )) {
          // no-op
        }
      }).rejects.toSatisfy((err: unknown) => {
        return err instanceof ChatError && err.code === 'ABORTED';
      });

      expect(mockGenerateContentStream).not.toHaveBeenCalled();
    });

    it('空消息列表直接返回仅有 done: true 的空 chunk', async () => {
      const adapter = new GeminiChatAdapter({ apiKey: 'valid-key' });

      const chunks = [];
      for await (const chunk of adapter.stream([])) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([
        {
          delta: '',
          accumulated: '',
          done: true,
        },
      ]);
      expect(mockGenerateContentStream).not.toHaveBeenCalled();
    });

    it('正常流式调用：逐步输出 delta 与 accumulated，最后一个 chunk 带有 done: true 与 usageMetadata', async () => {
      mockGenerateContentStream.mockResolvedValueOnce(
        (async function* () {
          yield { text: 'Hello' };
          yield { text: ' World' };
          yield {
            text: '!',
            usageMetadata: {
              promptTokenCount: 5,
              candidatesTokenCount: 15,
              totalTokenCount: 20,
            },
          };
        })()
      );

      const adapter = new GeminiChatAdapter({
        apiKey: 'valid-key',
        model: 'gemini-3.8-flash',
        systemInstruction: 'You are helpful',
      });

      const chunks = [];
      for await (const chunk of adapter.stream(
        [{ id: '1', role: 'user', content: 'Say hello', createdAt: 1 }],
        { temperature: 0.7, maxTokens: 100 }
      )) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([
        { delta: 'Hello', accumulated: 'Hello', done: false },
        { delta: ' World', accumulated: 'Hello World', done: false },
        { delta: '!', accumulated: 'Hello World!', done: false },
        {
          delta: '',
          accumulated: 'Hello World!',
          done: true,
          usage: {
            promptTokens: 5,
            completionTokens: 15,
            totalTokens: 20,
          },
        },
      ]);

      expect(mockGenerateContentStream).toHaveBeenCalledWith({
        model: 'gemini-3.8-flash',
        contents: [{ role: 'user', parts: [{ text: 'Say hello' }] }],
        config: {
          systemInstruction: 'You are helpful',
          temperature: 0.7,
          maxOutputTokens: 100,
          abortSignal: undefined,
        },
      });
    });

    it('流式生成过程中触发 AbortSignal：正确中止并抛出 ABORTED 错误', async () => {
      const controller = new AbortController();

      mockGenerateContentStream.mockResolvedValueOnce(
        (async function* () {
          yield { text: 'Chunk 1' };
          // 模拟下个 chunk 到来前被打断
          controller.abort();
          yield { text: 'Chunk 2' };
        })()
      );

      const adapter = new GeminiChatAdapter({ apiKey: 'valid-key' });

      await expect(async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of adapter.stream(
          [{ id: '1', role: 'user', content: 'test', createdAt: 1 }],
          { signal: controller.signal }
        )) {
          // no-op
        }
      }).rejects.toSatisfy((err: unknown) => {
        return err instanceof ChatError && err.code === 'ABORTED';
      });
    });

    it('流式调用 SDK 抛出 403 / PERMISSION_DENIED 时转译为 AUTH_ERROR', async () => {
      mockGenerateContentStream.mockRejectedValueOnce({
        status: 403,
        message: 'The caller does not have permission: PERMISSION_DENIED',
      });

      const adapter = new GeminiChatAdapter({ apiKey: 'denied-key' });

      await expect(async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of adapter.stream([{ id: '1', role: 'user', content: 'test', createdAt: 1 }])) {
          // no-op
        }
      }).rejects.toSatisfy((err: unknown) => {
        return err instanceof ChatError && err.code === 'AUTH_ERROR' && err.status === 403;
      });
    });

    it('流式迭代过程中抛出网络异常时转译为 NETWORK_ERROR', async () => {
      mockGenerateContentStream.mockResolvedValueOnce(
        (async function* () {
          yield { text: 'Part 1' };
          throw new TypeError('Failed to fetch');
        })()
      );

      const adapter = new GeminiChatAdapter({ apiKey: 'valid-key' });

      await expect(async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of adapter.stream([{ id: '1', role: 'user', content: 'test', createdAt: 1 }])) {
          // no-op
        }
      }).rejects.toSatisfy((err: unknown) => {
        return err instanceof ChatError && err.code === 'NETWORK_ERROR';
      });
    });

    it('流式调用 SDK 抛出 429 配额异常时转译为 RATE_LIMIT', async () => {
      mockGenerateContentStream.mockRejectedValueOnce({
        status: 429,
        message: 'Resource has been exhausted',
      });

      const adapter = new GeminiChatAdapter({ apiKey: 'valid-key' });

      await expect(async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of adapter.stream([{ id: '1', role: 'user', content: 'test', createdAt: 1 }])) {
          // no-op
        }
      }).rejects.toSatisfy((err: unknown) => {
        return err instanceof ChatError && err.code === 'RATE_LIMIT' && err.status === 429;
      });
    });
  });
});
