import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatError, type Message } from '../types';
import { RemoteChatAdapter } from '../adapters/RemoteChatAdapter';

const messages: Message[] = [
  { id: 'message-1', role: 'user', content: '你好', createdAt: 1 },
];

function sseResponse(...frames: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const frame of frames) controller.enqueue(encoder.encode(frame));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

afterEach(() => vi.unstubAllGlobals());

describe('Task 13 Step 1: RemoteChatAdapter', () => {
  it('应以完整消息历史 POST 到服务端 SSE 端点', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      sseResponse('event: done\ndata: {"content":"已完成"}\n\n'),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await new RemoteChatAdapter({ baseUrl: 'http://localhost:3001/' }).send(messages);

    expect(response).toEqual({ content: '已完成', usage: undefined });
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ messages: [{ role: 'user', content: '你好' }] }),
      signal: undefined,
    });
  });

  it('会话模式应携带 sessionId，且只提交本轮最后一条消息', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      sseResponse('event: done\ndata: {"content":"已完成"}\n\n'),
    );
    vi.stubGlobal('fetch', fetchMock);
    const history: Message[] = [
      { id: 'message-1', role: 'user', content: '第一轮', createdAt: 1 },
      { id: 'message-2', role: 'assistant', content: '第一轮回复', createdAt: 2 },
      { id: 'message-3', role: 'user', content: '第二轮', createdAt: 3 },
    ];

    await new RemoteChatAdapter({ sessionId: 'session-123' }).send(history);

    expect(fetchMock).toHaveBeenCalledWith('/api/chat/stream', expect.objectContaining({
      body: JSON.stringify({
        sessionId: 'session-123',
        messages: [{ role: 'user', content: '第二轮' }],
      }),
    }));
  });

  it('应跨 ReadableStream 分段解析 chunk 与 done 事件及用量', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        sseResponse(
          'event: chunk\ndata: {"delta":"你",',
          '"accumulated":"你"}\n\nevent: done\ndata: {"content":"你好",',
          '"usage":{"totalTokens":2}}\n\n',
        ),
      ),
    );

    const chunks = [];
    for await (const chunk of new RemoteChatAdapter().stream(messages)) chunks.push(chunk);

    expect(chunks).toEqual([
      { delta: '你', accumulated: '你', done: false },
      { delta: '', accumulated: '你好', usage: { totalTokens: 2 }, done: true },
    ]);
  });

  it('应保留服务端标准错误码与消息', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        sseResponse('event: error\ndata: {"error":{"code":"RATE_LIMIT","message":"请稍后再试"}}\n\n'),
      ),
    );

    await expect(async () => {
      for await (const _ of new RemoteChatAdapter().stream(messages)) {
        // 消费流以触发服务端错误事件。
      }
    }).rejects.toMatchObject({ name: 'ChatError', code: 'RATE_LIMIT', message: '请稍后再试' });
  });

  it('应将 HTTP 状态映射为统一 ChatError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 429 })));

    await expect(new RemoteChatAdapter().send(messages)).rejects.toMatchObject({
      name: 'ChatError',
      code: 'RATE_LIMIT',
      status: 429,
    });
  });

  it('应将网络失败映射为 NETWORK_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(new RemoteChatAdapter().send(messages)).rejects.toMatchObject({
      name: 'ChatError',
      code: 'NETWORK_ERROR',
      message: 'Failed to fetch',
    });
  });

  it('应将 AbortSignal 传递给 fetch 并在中断时抛出 ABORTED', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('The operation was aborted.', 'AbortError')),
            { once: true },
          );
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const stream = new RemoteChatAdapter().stream(messages, { signal: controller.signal });
    const pending = (async () => {
      for await (const _ of stream) {
        // no-op
      }
    })();
    controller.abort();

    await expect(pending).rejects.toSatisfy(
      (error: unknown) => error instanceof ChatError && error.code === 'ABORTED',
    );
    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
  });
});
