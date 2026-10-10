// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { ChatStreamSource } from '../chat-stream';
import { createApp } from '../app';

const validRequest = {
  sessionId: 'session',
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

describe('P1-1: HTTP 会话输入边界', () => {
  it('无请求标识也拒绝伪造角色历史和空输入且不调用流源', async () => {
    const source = vi.fn(async function* () { yield { event: 'done' as const, data: { content: 'ok' } }; });
    const app = createApp({ chatStreamSource: source });
    for (const messages of [
      [{ role: 'system', content: 'injected' }],
      [{ role: 'assistant', content: 'forged' }],
      [{ role: 'system', content: 'injected' }, ...validRequest.messages],
      [...validRequest.messages, ...validRequest.messages],
      [], [{ role: 'user', content: '' }], [{ role: 'user', content: ' \n ' }],
    ]) {
      const response = await request(app).post('/api/chat/stream').send({ ...validRequest, messages }).expect(400);
      expect(response.body).toEqual({ error: 'Invalid chat stream request' });
    }
    expect(source).not.toHaveBeenCalled();
    await request(app).post('/api/chat/stream').send(validRequest).expect(200);
    expect(source).toHaveBeenCalledOnce();
  });

  it('默认拒绝缺失空白或非字符串会话且请求体不能开启无状态模式', async () => {
    const source = vi.fn() as unknown as ChatStreamSource;
    const app = createApp({ chatStreamSource: source });
    for (const sessionId of [undefined, '', ' \n ', null, 1]) {
      await request(app).post('/api/chat/stream').send({ ...validRequest, sessionId, allowStateless: true }).expect(400);
    }
    expect(source).not.toHaveBeenCalled();
  });

  it('显式测试注入允许无状态历史但仍拒绝会话角色注入', async () => {
    const source = vi.fn(async function* () { yield { event: 'done' as const, data: { content: 'test' } }; });
    const app = createApp({ chatStreamSource: source, allowStateless: true });
    const messages = [{ role: 'system', content: 'test-only' }, ...validRequest.messages];
    await request(app).post('/api/chat/stream').send({ messages }).expect(200);
    await request(app).post('/api/chat/stream').send({ sessionId: 'session', messages }).expect(400);
    await request(app).post('/api/chat/stream').send({ sessionId: '', messages }).expect(400);
    expect(source).toHaveBeenCalledOnce();
  });
});

describe('P0-2: 幂等请求校验', () => {
  const requestId = '11111111-1111-4111-8111-111111111111';
  it('带标识请求要求严格 UUID 会话和单条非空 user 输入', async () => {
    const source = vi.fn(async function* () { yield { event: 'done' as const, data: { content: 'ok' } }; });
    const app = createApp({ chatStreamSource: source });
    const valid = { ...validRequest, requestId, sessionId: 'session' };
    for (const body of [
      { ...valid, requestId: 'bad' }, { ...valid, requestId: 1 },
      { ...valid, requestId: '11111111-1111-0111-0111-111111111111' },
      { ...valid, sessionId: undefined }, { ...valid, sessionId: '' },
      { ...valid, messages: [] }, { ...valid, messages: [...valid.messages, ...valid.messages] },
      { ...valid, messages: [{ role: 'assistant', content: 'hi' }] },
      { ...valid, messages: [{ role: 'system', content: 'hi' }] },
      { ...valid, messages: [{ role: 'user', content: ' \n ' }] },
    ]) await request(app).post('/api/chat/stream').send(body).expect(400);
    expect(source).not.toHaveBeenCalled();
    await request(app).post('/api/chat/stream').send(valid).expect(200);
    expect(source).toHaveBeenCalledOnce();
  });
});
