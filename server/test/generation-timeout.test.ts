// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChatAdapter, ChatChunk, Message } from '@core/index';
import {
  DEFAULT_GENERATION_TIMEOUT_CONFIG,
  GenerationTimeoutError,
  readGenerationTimeoutConfig,
  streamWithGenerationTimeout,
} from '../generation-timeout';

const messages: Message[] = [{ id: 'message', role: 'user', content: 'hello', createdAt: 0 }];

function adapterWithStream(stream: ChatAdapter['stream']): ChatAdapter {
  return { id: 'timeout-test', name: 'Timeout test', send: async () => ({ content: '' }), stream };
}

async function next<T>(iterator: AsyncIterator<T>) {
  return iterator.next();
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('P1-2: 服务端生成超时守卫', () => {
  it('默认值保持首包60秒总计90秒，非法环境值在模型装配前被拒绝', () => {
    expect(readGenerationTimeoutConfig({})).toEqual(DEFAULT_GENERATION_TIMEOUT_CONFIG);
    for (const value of ['', '0', '-1', '1.5', 'NaN', 'Infinity', '110001']) {
      expect(() => readGenerationTimeoutConfig({ CHAT_GENERATION_FIRST_CHUNK_TIMEOUT_MS: value })).toThrow('timeout configuration');
      expect(() => readGenerationTimeoutConfig({ CHAT_GENERATION_TOTAL_TIMEOUT_MS: value })).toThrow('timeout configuration');
    }
    expect(() => readGenerationTimeoutConfig({
      CHAT_GENERATION_FIRST_CHUNK_TIMEOUT_MS: '90001', CHAT_GENERATION_TOTAL_TIMEOUT_MS: '90000',
    })).toThrow('timeout configuration');
    expect(() => readGenerationTimeoutConfig({ CHAT_GENERATION_TOTAL_TIMEOUT_MS: '110000' }, 3001)).toThrow('generation and count');
    expect(readGenerationTimeoutConfig({ CHAT_GENERATION_TOTAL_TIMEOUT_MS: '109000' }, 3000)).toEqual({
      firstChunkTimeoutMs: 60000, totalTimeoutMs: 109000,
    });
  });

  it('首包期限中止忽略 signal 的上游，同时不等待挂起的 return', async () => {
    vi.useFakeTimers();
    let upstreamSignal: AbortSignal | undefined;
    const adapter = adapterWithStream((_messages, options) => {
      upstreamSignal = options?.signal;
      return {
        [Symbol.asyncIterator]: () => ({
          next: () => new Promise<IteratorResult<ChatChunk>>(() => undefined),
          return: () => new Promise<IteratorResult<ChatChunk>>(() => undefined),
        }),
      };
    });
    const stream = streamWithGenerationTimeout(adapter, messages, {
      signal: new AbortController().signal,
    }, { firstChunkTimeoutMs: 5, totalTimeoutMs: 10 });
    const iterator = stream[Symbol.asyncIterator]();
    const pending = next(iterator);
    const expected = expect(pending).rejects.toBeInstanceOf(GenerationTimeoutError);

    await vi.advanceTimersByTimeAsync(5);

    await expected;
    // The wrapper owns and aborts the signal handed to an uncooperative adapter.
    expect(upstreamSignal?.aborted).toBe(true);
    await expect(iterator.next()).resolves.toEqual({ done: true, value: undefined });
  });

  it('总期限不会被中间 chunk 重置，已完成 done 不留下计时器', async () => {
    vi.useFakeTimers();
    const adapter = adapterWithStream(async function* () {
      yield { delta: 'a', accumulated: 'a', done: false };
      await new Promise<void>(resolve => setTimeout(resolve, 4));
      yield { delta: 'b', accumulated: 'ab', done: false };
      await new Promise<void>(() => undefined);
    });
    const iterator = streamWithGenerationTimeout(adapter, messages, {
      signal: new AbortController().signal,
    }, { firstChunkTimeoutMs: 5, totalTimeoutMs: 10 })[Symbol.asyncIterator]();

    await expect(iterator.next()).resolves.toMatchObject({ value: { delta: 'a' } });
    const second = iterator.next();
    await vi.advanceTimersByTimeAsync(4);
    await expect(second).resolves.toMatchObject({ value: { delta: 'b' } });
    const timed = iterator.next();
    const expected = expect(timed).rejects.toBeInstanceOf(GenerationTimeoutError);
    await vi.advanceTimersByTimeAsync(6);
    await expected;

    const complete = streamWithGenerationTimeout(adapterWithStream(async function* () {
      await new Promise<void>(resolve => setTimeout(resolve, 3));
      yield { delta: 'a', accumulated: 'a', done: false };
      await new Promise<void>(resolve => setTimeout(resolve, 3));
      yield { delta: '', accumulated: 'complete', done: true };
    }), messages, { signal: new AbortController().signal }, { firstChunkTimeoutMs: 5, totalTimeoutMs: 10 });
    const completeIterator = complete[Symbol.asyncIterator]();
    const completeFirst = completeIterator.next();
    await vi.advanceTimersByTimeAsync(3);
    await expect(completeFirst).resolves.toMatchObject({ value: { done: false } });
    const completeDone = completeIterator.next();
    await vi.advanceTimersByTimeAsync(3);
    await expect(completeDone).resolves.toMatchObject({ value: { done: true } });
    await vi.advanceTimersByTimeAsync(20);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('客户端主动中止不是超时，且迟到拒绝被收敛', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    let rejectLate!: (error: Error) => void;
    const adapter = adapterWithStream(() => ({
      [Symbol.asyncIterator]: () => ({
        next: () => new Promise<IteratorResult<ChatChunk>>((_resolve, reject) => { rejectLate = reject; }),
        return: () => Promise.reject(new Error('late cleanup failure')),
      }),
    }));
    const iterator = streamWithGenerationTimeout(adapter, messages, { signal: controller.signal }, {
      firstChunkTimeoutMs: 5, totalTimeoutMs: 10,
    })[Symbol.asyncIterator]();
    const pending = iterator.next();
    const expected = expect(pending).rejects.toMatchObject({ code: 'ABORTED' });
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();

    await expected;
    rejectLate(new Error('late upstream failure'));
    await vi.advanceTimersByTimeAsync(20);
    expect(vi.getTimerCount()).toBe(0);
  });
});
