import { describe, it, expect } from 'vitest';
import { ChatAdapter, Message } from '../types';
import { MockChatAdapter } from '../adapters/MockChatAdapter';

/**
 * ChatAdapter 通用契约测试套件 (ADR-003, ADR-007)
 * 供 MockChatAdapter 与未来的 GeminiChatAdapter 复用
 */
export function describeChatAdapterContract(
  suiteName: string,
  createAdapter: () => ChatAdapter
) {
  describe(`ChatAdapter Contract: ${suiteName}`, () => {
    it('必须提供非空的唯一 id 与展示名称 name', () => {
      const adapter = createAdapter();
      expect(typeof adapter.id).toBe('string');
      expect(adapter.id.length).toBeGreaterThan(0);
      expect(typeof adapter.name).toBe('string');
      expect(adapter.name.length).toBeGreaterThan(0);
    });

    describe('send (非流式契约)', () => {
      it('接收消息历史并返回合法的 ChatResponse，包含 content 与用量统计', async () => {
        const adapter = createAdapter();
        const testMessages: Message[] = [
          {
            id: 'msg-1',
            role: 'user',
            content: '你好，请做个自我介绍',
            createdAt: Date.now(),
          },
        ];

        const response = await adapter.send(testMessages, { delayMs: 0 });
        expect(response).toBeDefined();
        expect(typeof response.content).toBe('string');
        expect(response.content.length).toBeGreaterThan(0);

        if (response.usage) {
          expect(typeof response.usage.promptTokens).toBe('number');
          expect(typeof response.usage.completionTokens).toBe('number');
          expect(typeof response.usage.totalTokens).toBe('number');
        }
      });

      it('当传入已中止的 AbortSignal 时，应立即抛出 AbortError', async () => {
        const adapter = createAdapter();
        const controller = new AbortController();
        controller.abort();

        const testMessages: Message[] = [
          { id: 'msg-1', role: 'user', content: '测试中断', createdAt: Date.now() },
        ];

        await expect(
          adapter.send(testMessages, { signal: controller.signal, delayMs: 100 })
        ).rejects.toThrow();
      });

      it('在延迟等待过程中触发 AbortSignal，应正确中断并抛出异常', async () => {
        const adapter = createAdapter();
        const controller = new AbortController();

        const testMessages: Message[] = [
          { id: 'msg-1', role: 'user', content: '测试异步中断', createdAt: Date.now() },
        ];

        const sendPromise = adapter.send(testMessages, {
          signal: controller.signal,
          delayMs: 200,
        });

        setTimeout(() => controller.abort(), 20);

        await expect(sendPromise).rejects.toThrow();
      });
    });

    describe('stream (流式契约)', () => {
      it('返回 AsyncIterable，逐步产出 ChatChunk，最终 chunk 标记 done: true 并提供累积内容与用量', async () => {
        const adapter = createAdapter();
        const testMessages: Message[] = [
          {
            id: 'msg-stream-1',
            role: 'user',
            content: '测试流式回复',
            createdAt: Date.now(),
          },
        ];

        const chunks: string[] = [];
        let lastChunkDone = false;
        let lastAccumulated = '';
        let finalUsageFound = false;

        for await (const chunk of adapter.stream(testMessages, {
          delayMs: 0,
          streamChunkDelayMs: 5,
        })) {
          expect(typeof chunk.delta).toBe('string');
          expect(typeof chunk.accumulated).toBe('string');
          chunks.push(chunk.delta);
          lastAccumulated = chunk.accumulated;

          if (chunk.done) {
            lastChunkDone = true;
            if (chunk.usage) {
              finalUsageFound = true;
              expect(chunk.usage.totalTokens).toBeGreaterThan(0);
            }
          }
        }

        expect(chunks.length).toBeGreaterThan(0);
        expect(lastChunkDone).toBe(true);
        expect(chunks.join('')).toBe(lastAccumulated);
        expect(finalUsageFound).toBe(true);
      });

      it('当传入已中止的 AbortSignal 时，stream 应立即中断', async () => {
        const adapter = createAdapter();
        const controller = new AbortController();
        controller.abort();

        const testMessages: Message[] = [
          { id: 'msg-stream-2', role: 'user', content: '提前中断流式', createdAt: Date.now() },
        ];

        const streamGen = adapter.stream(testMessages, {
          signal: controller.signal,
          delayMs: 50,
        });

        await expect(async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          for await (const _ of streamGen) {
            // no-op
          }
        }).rejects.toThrow();
      });

      it('在流式 chunk 产出过程中触发 AbortSignal，应成功打断后续迭代', async () => {
        const adapter = createAdapter();
        const controller = new AbortController();

        const testMessages: Message[] = [
          { id: 'msg-stream-3', role: 'user', content: '流式进行中打断', createdAt: Date.now() },
        ];

        const streamGen = adapter.stream(testMessages, {
          signal: controller.signal,
          delayMs: 0,
          streamChunkDelayMs: 30,
        });

        let receivedCount = 0;
        await expect(async () => {
          for await (const _ of streamGen) {
            receivedCount++;
            if (receivedCount >= 1) {
              controller.abort();
            }
          }
        }).rejects.toThrow();
      });
    });
  });
}

// 挂载 MockChatAdapter 契约测试
describeChatAdapterContract('MockChatAdapter', () => new MockChatAdapter({ delayMs: 0, streamChunkDelayMs: 5 }));
