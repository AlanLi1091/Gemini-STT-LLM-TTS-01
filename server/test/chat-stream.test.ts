// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { ChatStreamSource } from '../chat-stream';
import { createApp } from '../app';

const validRequest = {
  messages: [{ role: 'user' as const, content: '你好' }],
};

describe('Task 12 Step 1: 服务端 SSE 流式管道与生命周期管理', () => {
  it('应返回 SSE 响应头并依次输出 chunk 与 done 事件', async () => {
    const source: ChatStreamSource = async function* (chatRequest) {
      expect(chatRequest).toEqual(validRequest);
      yield {
        event: 'chunk',
        data: { delta: '你', accumulated: '你' },
      };
      yield {
        event: 'done',
        data: { content: '你好', usage: { totalTokens: 3 } },
      };
    };

    const response = await request(createApp({ chatStreamSource: source }))
      .post('/api/chat/stream')
      .send(validRequest);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/^text\/event-stream/);
    expect(response.headers['cache-control']).toBe('no-cache, no-transform');
    expect(response.headers['x-accel-buffering']).toBe('no');
    expect(response.headers['x-sse-resumable']).toBe('false');
    expect(response.text).toContain(
      'event: chunk\ndata: {"delta":"你","accumulated":"你"}\n\n',
    );
    expect(response.text).toContain(
      'event: done\ndata: {"content":"你好","usage":{"totalTokens":3}}\n\n',
    );
  });

  it('流保持打开时应定期输出 SSE 心跳注释行', async () => {
    const source: ChatStreamSource = async function* () {
      await new Promise((resolve) => setTimeout(resolve, 20));
      yield { event: 'done', data: { content: '完成' } };
    };

    const response = await request(
      createApp({ chatStreamSource: source, chatStreamHeartbeatIntervalMs: 5 }),
    )
      .post('/api/chat/stream')
      .send(validRequest);

    expect(response.status).toBe(200);
    expect(response.text).toContain(': ping\n\n');
  });

  it('携带 Last-Event-ID 的断点续传请求应被明确拒绝', async () => {
    const response = await request(createApp())
      .post('/api/chat/stream')
      .set('Last-Event-ID', 'event-123')
      .send(validRequest);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'SSE resume is not supported' });
  });

  it('请求体不符合共享契约时应返回 400', async () => {
    const source = vi.fn() as unknown as ChatStreamSource;
    const response = await request(createApp({ chatStreamSource: source }))
      .post('/api/chat/stream')
      .send({ messages: [{ role: 'invalid', content: 42 }] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid chat stream request' });
    expect(source).not.toHaveBeenCalled();
  });

  it('尚未注入流源时应返回 503', async () => {
    const response = await request(createApp()).post('/api/chat/stream').send(validRequest);

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'Chat stream source is not configured' });
  });

  it('上游异常应转换为标准 UNKNOWN error 事件且不泄漏内部错误', async () => {
    const source: ChatStreamSource = async function* () {
      throw new Error('secret upstream detail');
    };
    const response = await request(createApp({ chatStreamSource: source }))
      .post('/api/chat/stream')
      .send(validRequest);

    expect(response.status).toBe(200);
    expect(response.text).toContain(
      'event: error\ndata: {"error":{"code":"UNKNOWN","message":"Chat stream failed."}}\n\n',
    );
    expect(response.text).not.toContain('secret upstream detail');
  });

  it('客户端断开连接时应中止上游 AbortSignal', async () => {
    let resolveSignal!: (signal: AbortSignal) => void;
    const capturedSignal = new Promise<AbortSignal>((resolve) => {
      resolveSignal = resolve;
    });
    const source: ChatStreamSource = async function* (_chatRequest, { signal }) {
      resolveSignal(signal);
      yield { event: 'chunk', data: { delta: '开', accumulated: '开' } };
      await new Promise<void>((resolve) => {
        if (signal.aborted) resolve();
        else signal.addEventListener('abort', () => resolve(), { once: true });
      });
    };
    const testRequest = request(createApp({ chatStreamSource: source }))
      .post('/api/chat/stream')
      .send(validRequest);
    testRequest.end(() => undefined);

    const signal = await capturedSignal;
    testRequest.abort();

    await vi.waitFor(() => expect(signal.aborted).toBe(true));
  });
});
