// @vitest-environment node
import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  ChatSseEvent,
  ChatStreamRequest,
  SseChunkEvent,
  SseDoneEvent,
  SseErrorEvent,
} from '../contracts/sse';
import {
  SSE_DEFAULT_HEARTBEAT_MS,
  SSE_SUPPORTS_RESUMPTION,
} from '../contracts/sse';

describe('Task 11 Step 2: 共享 SSE 契约', () => {
  it('chunk 事件应携带增量文本与累积文本', () => {
    const event: SseChunkEvent = {
      event: 'chunk',
      data: { delta: '你', accumulated: '你好' },
    };

    expect(event).toEqual({
      event: 'chunk',
      data: { delta: '你', accumulated: '你好' },
    });
  });

  it('done 事件应携带最终文本与可选 Token 用量', () => {
    const event: SseDoneEvent = {
      event: 'done',
      data: {
        content: '你好',
        usage: { promptTokens: 2, completionTokens: 1, totalTokens: 3 },
      },
    };

    expect(event.data.usage?.totalTokens).toBe(3);
  });

  it('error 事件应内嵌 ChatError 的 code 与 message', () => {
    const event: SseErrorEvent = {
      event: 'error',
      data: {
        error: { code: 'RATE_LIMIT', message: '请求过于频繁' },
      },
    };

    expect(event.data.error).toEqual({
      code: 'RATE_LIMIT',
      message: '请求过于频繁',
    });
  });

  it('应声明 Task 13 无状态请求向 Task 14 sessionId 的兼容演进路径', () => {
    const statelessRequest: ChatStreamRequest = {
      messages: [{ role: 'user', content: '你好' }],
    };
    const sessionRequest: ChatStreamRequest = {
      ...statelessRequest,
      sessionId: 'session-123',
    };

    expect(statelessRequest.sessionId).toBeUndefined();
    expect(sessionRequest.sessionId).toBe('session-123');
    expectTypeOf<ChatSseEvent['event']>().toEqualTypeOf<'chunk' | 'done' | 'error'>();
  });

  it('应声明 15 秒默认心跳且明确不支持断点续传', () => {
    expect(SSE_DEFAULT_HEARTBEAT_MS).toBe(15_000);
    expect(SSE_SUPPORTS_RESUMPTION).toBe(false);
  });
});
