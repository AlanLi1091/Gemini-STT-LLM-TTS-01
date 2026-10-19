// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BackendClient, BackendError } from '../backend-client';

const input = { id: 'm1', userId: 'u1', guildId: '111111111111111111', channelId: '222222222222222222', content: '本轮' };
const sessionId = '12345678-1234-1234-1234-123456789012';
function sse(frames: string[]) {
  return new Response(new ReadableStream({ start(controller) {
    for (const frame of frames) controller.enqueue(new TextEncoder().encode(frame));
    controller.close();
  } }));
}
const resolved = () => new Response(JSON.stringify({ sessionId }));
afterEach(() => vi.useRealTimers());
describe('Task 16 Step 2: Bot 后端与 SSE 对话', () => {
  it.each(['AUTH_ERROR', 'NETWORK_ERROR', 'MODEL_ERROR'])('保留%s分类且不泄露服务端原文', async kind => {
    const fetcher = vi.fn().mockResolvedValueOnce(resolved()).mockResolvedValueOnce(sse([`event: error\ndata: ${JSON.stringify({ error: { code: kind, message: 'fake-secret' } })}\n\n`]));
    try { await new BackendClient({ fetch: fetcher }).chat(input); throw new Error('Expected failure'); }
    catch (error) { expect(error).toBeInstanceOf(BackendError); expect((error as BackendError).kind).toBe(kind); expect((error as Error).message).not.toContain('fake-secret'); }
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('HTTP 鉴权错误返回安全分类', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('fake-secret', { status: 403 }));
    await expect(new BackendClient({ fetch: fetcher }).chat(input)).rejects.toMatchObject({ kind: 'AUTH_ERROR' });
  });
  it('读取 SSE 期间主动中止会取消 reader 且不重发', async () => {
    const cancel = vi.fn(); const stream = new ReadableStream({ start() {}, cancel });
    const fetcher = vi.fn().mockResolvedValueOnce(resolved()).mockResolvedValueOnce(new Response(stream));
    const controller = new AbortController(); const pending = expect(new BackendClient({ fetch: fetcher }).chat(input, controller.signal)).rejects.toMatchObject({ kind: 'ABORTED' });
    for (let i = 0; i < 20; i++) await Promise.resolve(); controller.abort(); await pending;
    expect(cancel).toHaveBeenCalledOnce(); expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('跨 UTF-8 字节边界读取中文最终回复', async () => {
    const bytes = new TextEncoder().encode('event: done\ndata: {"content":"中文回复"}\n\n');
    const stream = new ReadableStream({ start(controller) {
      for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
      controller.close();
    } });
    const fetcher = vi.fn().mockResolvedValueOnce(resolved()).mockResolvedValueOnce(new Response(stream));
    await expect(new BackendClient({ fetch: fetcher }).chat(input)).resolves.toEqual({ content: '中文回复' });
  });
  it('读取未结束的 SSE 时超时会取消 reader 并清理请求', async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const stream = new ReadableStream({ start() {}, cancel });
    const fetcher = vi.fn().mockResolvedValueOnce(resolved()).mockResolvedValueOnce(new Response(stream));
    const pending = expect(new BackendClient({ fetch: fetcher, timeoutMs: 100 }).chat(input)).rejects.toThrow('超时');
    await vi.advanceTimersByTimeAsync(100); await pending;
    expect(cancel).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });
  it('解析频道后只提交本轮输入，忽略心跳和 chunk，等待 done', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(resolved()).mockResolvedValueOnce(sse([
      ': ping\r\n\r\nevent: chunk\r\ndata: {"delta":"半","accumulated":"半"}\r\n\r\n',
      'event: do', 'ne\r\ndata: {"content":"最终回复"}\r\n\r\n',
    ]));
    const client = new BackendClient({ fetch: fetcher });
    await expect(client.chat(input)).resolves.toEqual({ content: '最终回复' });
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ guildId: input.guildId, channelId: input.channelId });
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ sessionId, messages: [{ role: 'user', content: '本轮' }] });
  });
  it('新 Bot 实例重新解析服务端关联，不保存本地会话文件', async () => {
    const fetcher = vi.fn().mockImplementation(async (url: string) => url.endsWith('/resolve') ? resolved() : sse(['event: done\ndata: {"content":"回复"}\n\n']));
    await new BackendClient({ fetch: fetcher }).chat(input);
    await new BackendClient({ fetch: fetcher }).chat(input);
    expect(fetcher.mock.calls.filter(([url]) => url.endsWith('/resolve'))).toHaveLength(2);
  });
  it('服务端 error 转成可读错误，不自动重发聊天 POST', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(resolved()).mockResolvedValueOnce(sse(['event: error\ndata: {"error":{"code":"RATE_LIMIT","message":"secret"}}\n\n']));
    await expect(new BackendClient({ fetch: fetcher }).chat(input)).rejects.toThrow('限额');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it.each([
    ['结束缺少 done', 'event: chunk\ndata: {"delta":"x","accumulated":"x"}\n\n'],
    ['损坏 JSON', 'event: done\ndata: bad\n\n'],
    ['无效 done', 'event: done\ndata: {}\n\n'],
  ])('拒绝%s', async (_name, frame) => {
    const fetcher = vi.fn().mockResolvedValueOnce(resolved()).mockResolvedValueOnce(sse([frame]));
    await expect(new BackendClient({ fetch: fetcher }).chat(input)).rejects.toBeInstanceOf(BackendError);
  });
  it('HTTP 或网络失败给出固定指引且不暴露响应原文', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('secret', { status: 503 }));
    await expect(new BackendClient({ fetch: fetcher }).chat(input)).rejects.toThrow('后端');
    const offline = vi.fn().mockRejectedValue(new Error('secret'));
    await expect(new BackendClient({ fetch: offline }).chat(input)).rejects.toThrow('后端');
  });
  it('中止和超时结束请求，不重试', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn((_url, options) => new Promise<Response>((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }));
    const client = new BackendClient({ fetch: fetcher, timeoutMs: 100 });
    const pending = expect(client.chat(input)).rejects.toThrow('超时');
    await vi.advanceTimersByTimeAsync(100); await pending;
    const controller = new AbortController(); controller.abort();
    await expect(client.chat(input, controller.signal)).rejects.toThrow('取消');
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it('只接受无凭据的本机后端地址', () => {
    expect(() => new BackendClient({ baseUrl: 'https://remote.example' })).toThrow();
    expect(() => new BackendClient({ baseUrl: 'http://u:p@localhost:3001' })).toThrow();
    expect(() => new BackendClient({ baseUrl: 'http://localhost:3001' })).not.toThrow();
  });
  it('拒绝无效的会话解析响应', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}'));
    await expect(new BackendClient({ fetch: fetcher }).chat(input)).rejects.toThrow('会话');
    expect(fetcher).toHaveBeenCalledOnce();
  });
});

describe('P0-1: Bot 输入超限', () => {
  it('CONTEXT_LIMIT 映射为缩短输入提示且不自动重发', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(resolved()).mockResolvedValueOnce(sse(['event: error\ndata: {"error":{"code":"CONTEXT_LIMIT","message":"raw-secret"}}\n\n']));
    await expect(new BackendClient({ fetch: fetcher }).chat(input)).rejects.toMatchObject({ kind: 'CONTEXT_LIMIT', message: '本轮输入过长，请缩短内容后重新提问。' });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe('P0-1 Step 2: 重置后端客户端', () => {
  const oldId = '11111111-1111-4111-8111-111111111111';
  const newId = '22222222-2222-4222-8222-222222222222';
  const jsonResponse = (body: unknown) => new Response(JSON.stringify(body));
  it('先解析再重置明确目标仅新会话确认后返回成功且不调用模型', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(jsonResponse({ sessionId: oldId })).mockResolvedValueOnce(jsonResponse({ archivedSessionId: oldId, sessionId: newId }));
    expect(await new BackendClient({ fetch: fetcher }).reset(input)).toContain('已重置');
    expect(fetcher.mock.calls.map(call => call[0])).toEqual(['http://127.0.0.1:3001/api/discord/sessions/resolve', 'http://127.0.0.1:3001/api/discord/sessions/reset']);
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ guildId: input.guildId, channelId: input.channelId, sessionId: oldId });
    expect(fetcher.mock.calls[1][1].redirect).toBe('error');
  });
  it('重置409用固定冲突提示500不透传原文且不自动重发', async () => {
    for (const status of [409, 500]) {
      const fetcher = vi.fn().mockResolvedValueOnce(jsonResponse({ sessionId: oldId })).mockResolvedValueOnce(new Response('raw-secret', { status }));
      await expect(new BackendClient({ fetch: fetcher }).reset(input)).rejects.toMatchObject({ kind: status === 409 ? 'REQUEST_CONFLICT' : 'BACKEND' });
      expect(fetcher).toHaveBeenCalledTimes(2);
    }
  });
  it('非法解析或重置响应不能宣称成功且不追加重试', async () => {
    const badResolve = vi.fn().mockResolvedValue(jsonResponse({ sessionId: 'bad' }));
    await expect(new BackendClient({ fetch: badResolve }).reset(input)).rejects.toMatchObject({ kind: 'PROTOCOL' });
    expect(badResolve).toHaveBeenCalledOnce();
    for (const response of [{ sessionId: newId }, { sessionId: oldId, archivedSessionId: oldId }, { sessionId: newId, archivedSessionId: newId }, null]) {
      const fetcher = vi.fn().mockResolvedValueOnce(jsonResponse({ sessionId: oldId })).mockResolvedValueOnce(jsonResponse(response));
      await expect(new BackendClient({ fetch: fetcher }).reset(input)).rejects.toMatchObject({ kind: 'PROTOCOL' });
      expect(fetcher).toHaveBeenCalledTimes(2);
    }
  });
  it('取消和超时均中止重置不自动重发并清理定时器', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Promise<Response>(() => {}));
    const controller = new AbortController();
    const cancelled = expect(new BackendClient({ fetch: fetcher }).reset(input, controller.signal)).rejects.toMatchObject({ kind: 'ABORTED' });
    controller.abort(); await cancelled; expect(vi.getTimerCount()).toBe(0);
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
    const timedOut = expect(new BackendClient({ fetch: fetcher, timeoutMs: 100 }).reset(input)).rejects.toMatchObject({ kind: 'TIMEOUT' });
    await vi.advanceTimersByTimeAsync(100); await timedOut; expect(vi.getTimerCount()).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('解析已取消或网络失败时不继续发送重置', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('raw-secret')); const controller = new AbortController(); controller.abort();
    await expect(new BackendClient({ fetch: fetcher }).reset(input, controller.signal)).rejects.toMatchObject({ kind: 'ABORTED' });
    expect(fetcher).not.toHaveBeenCalled();
    await expect(new BackendClient({ fetch: fetcher }).reset(input)).rejects.toMatchObject({ kind: 'NETWORK_ERROR' });
    expect(fetcher).toHaveBeenCalledOnce();
  });
});

describe('P0-1 Step 2: 取消后的迟到响应', () => {
  it('解析响应在取消后才到达时不会继续发送重置请求', async () => {
    let finish!: (response: Response) => void;
    const fetcher = vi.fn(async () => new Promise<Response>(resolve => { finish = resolve; }));
    const controller = new AbortController();
    const pending = expect(new BackendClient({ fetch: fetcher }).reset(input, controller.signal)).rejects.toMatchObject({ kind: 'ABORTED' });
    controller.abort(); await pending;
    finish(new Response(JSON.stringify({ sessionId: '11111111-1111-4111-8111-111111111111' })));
    for (let i = 0; i < 30; i++) await Promise.resolve();
    expect(fetcher).toHaveBeenCalledOnce();
  });
});


describe('P1-3: Bot 存储失败提示', () => {
  it('存储 UNKNOWN 映射可读 BACKEND 文案且忽略 SSE 原文', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(resolved()).mockResolvedValueOnce(sse([
      'event: error\ndata: {"error":{"code":"UNKNOWN","message":"会话读取或保存失败，请稍后重试。 AIzaFAKE_BOT_SECRET /var/lib/private"}}\n\n',
    ]));
    await expect(new BackendClient({ fetch: fetcher }).chat(input)).rejects.toMatchObject({
      kind: 'BACKEND', message: '后端对话失败，请检查服务状态后再试。',
    });
  });
});

describe('Task 21 Step 2: Bot搜索请求和最终来源', () => {
  const search = { status: 'succeeded', sources: [{ provider: 'tavily', retrievedAt: 1, index: 1, title: '标题', summary: '摘要', url: 'https://example.com', domain: 'example.com' }] };
  it.each([true, false])('仅搜索请求发送搜索标记及作者身份 %s', async requested => {
    const fetcher = vi.fn().mockResolvedValueOnce(resolved()).mockResolvedValueOnce(sse([`event: done\ndata: ${JSON.stringify({ content: '正文', search })}\n\n`]));
    const result = await new BackendClient({ fetch: fetcher }).chat({ ...input, userId: '333333333333333333' }, undefined, { search: requested });
    expect(result).toEqual({ content: '正文', search });
    const body = JSON.parse(fetcher.mock.calls[1][1].body);
    if (requested) expect(body).toMatchObject({ search: true, discordUserId: '333333333333333333' });
    else { expect(body).not.toHaveProperty('search'); expect(body).not.toHaveProperty('discordUserId'); }
    expect(body).not.toHaveProperty('channelId'); expect(body).not.toHaveProperty('requestId');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it.each([undefined, null, { status: 'succeeded', sources: [] }, { status: 'degraded', sources: [], reason: 'SECRET', notice: 'SECRET' }])('坏或缺失search只返回正文 %j', async search => {
    const fetcher = vi.fn().mockResolvedValueOnce(resolved()).mockResolvedValueOnce(sse([`event: done\ndata: ${JSON.stringify({ content: '正文', search })}\n\n`]));
    expect(await new BackendClient({ fetch: fetcher }).chat(input)).toEqual({ content: '正文' });
  });
  it('只读取done的元数据，不接受chunk伪造来源', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(resolved()).mockResolvedValueOnce(sse([
      `event: chunk\ndata: ${JSON.stringify({ delta: '片段', accumulated: '片段', search })}\n\n`,
      'event: done\ndata: {"content":"正文"}\n\n',
    ]));
    expect(await new BackendClient({ fetch: fetcher }).chat(input)).toEqual({ content: '正文' });
  });
  it('降级元数据采用共享固定文案，空正文仍拒绝', async () => {
    const { SEARCH_DEGRADED_NOTICE } = await import('@gemini-chat/core');
    const search = { status: 'degraded', sources: [], reason: 'unavailable', notice: SEARCH_DEGRADED_NOTICE };
    for (const content of ['正文', ' ']) {
      const fetcher = vi.fn().mockResolvedValueOnce(resolved()).mockResolvedValueOnce(sse([`event: done\ndata: ${JSON.stringify({ content, search })}\n\n`]));
      const pending = new BackendClient({ fetch: fetcher }).chat(input);
      if (content.trim()) expect(await pending).toEqual({ content, search });
      else await expect(pending).rejects.toMatchObject({ kind: 'PROTOCOL' });
    }
  });
});

describe('Task 21 Step 2: 默认期限兼容', () => {
  it('默认120秒期限不因搜索字段改变且不自动重试', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn((_url, init) => new Promise<Response>((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true });
    }));
    const client = new BackendClient({ fetch: fetcher });
    const pending = expect(client.chat(input, undefined, { search: true })).rejects.toMatchObject({ kind: 'TIMEOUT' });
    await vi.advanceTimersByTimeAsync(119999);
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1); await pending;
    expect(fetcher).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });
});
