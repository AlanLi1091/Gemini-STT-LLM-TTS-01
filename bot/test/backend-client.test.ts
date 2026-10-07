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
    await expect(new BackendClient({ fetch: fetcher }).chat(input)).resolves.toBe('中文回复');
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
    await expect(client.chat(input)).resolves.toBe('最终回复');
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
