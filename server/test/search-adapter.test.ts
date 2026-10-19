// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { TavilySearchAdapter, MockSearchAdapter } from '../search-adapter';

const query = '当前问题';
const response = () => Response.json({ results: [{ title: '标题', url: 'https://example.com/a', content: '摘要' }] });
describe('Task 20 Step 1: 搜索适配器（全Mock）', () => {
  it('只向固定端点发送当前问题且禁用答案全文与重定向', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response());
    const signal = new AbortController().signal;
    const adapter = new TavilySearchAdapter({ apiKey: 'test-only', fetcher });
    expect(await adapter.search(query, { signal })).toMatchObject([{ domain: 'example.com', summary: '摘要' }]);
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.tavily.com/search');
    expect(options).toMatchObject({ signal, redirect: 'error', method: 'POST' });
    expect(options?.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer test-only' });
    expect(JSON.parse(String(options?.body))).toEqual({ query, search_depth: 'basic', auto_parameters: false, chunks_per_source: 1, max_results: 3, include_raw_content: false, include_answer: false });
  });
  it('HTTP失败不重试且不读取供应商错误正文', async () => {
    const raw = new Response('secret query stack', { status: 429 }); const read = vi.spyOn(raw, 'text');
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(raw);
    await expect(new TavilySearchAdapter({ apiKey: 'test-only', fetcher }).search(query, { signal: new AbortController().signal })).rejects.toMatchObject({ status: 429 });
    expect(fetcher).toHaveBeenCalledOnce(); expect(read).not.toHaveBeenCalled();
  });
  it('响应流超过256KiB时停止读取', async () => {
    const cancel = vi.fn();
    const body = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(256 * 1024 + 1)); }, cancel });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(body));
    await expect(new TavilySearchAdapter({ apiKey: 'test-only', fetcher }).search(query, { signal: new AbortController().signal })).rejects.toThrow();
    expect(cancel).toHaveBeenCalledOnce();
  });
  it('坏JSON返回本地错误且不泄露原始文本', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('secret invalid json'));
    await expect(new TavilySearchAdapter({ apiKey: 'test-only', fetcher }).search(query, { signal: new AbortController().signal })).rejects.toThrow('搜索响应无效');
  });
  it('取消挂起的响应读取可结束本地等待', async () => {
    const controller = new AbortController(); let started!: () => void;
    const ready = new Promise<void>(resolve => { started = resolve; });
    const body = new ReadableStream({ pull() { started(); return new Promise(() => {}); } });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(body));
    const result = new TavilySearchAdapter({ apiKey: 'test-only', fetcher }).search(query, { signal: controller.signal });
    await ready; controller.abort(); await expect(result).rejects.toMatchObject({ code: 'ABORTED' });
  });
  it('Mock适配器可离线提供受限来源且已取消不工作', async () => {
    const adapter = new MockSearchAdapter();
    expect(await adapter.search(query, { signal: new AbortController().signal })).toHaveLength(1);
    const c = new AbortController(); c.abort();
    await expect(adapter.search(query, { signal: c.signal })).rejects.toMatchObject({ code: 'ABORTED' });
  });
});

describe('Task 20 Step 3: 固定目标与响应边界', () => {
  it.each([
    'http://127.0.0.1:3001/admin', 'http://10.0.0.1/private', 'http://172.16.0.1/',
    'http://192.168.1.1/', 'http://169.254.1.1/', 'http://169.254.169.254/latest/meta-data/',
    'http://[::1]:8080/', 'http://[fe80::1]/', 'http://[fd00::1]/',
    'https://public.example:8443/path', 'https://user:password@127.0.0.1/private',
  ])('结果地址只作元数据且不会读取：%s', async url => {
    const fetcher = vi.fn<typeof fetch>(async target => {
      expect(target).toBe('https://api.tavily.com/search');
      return Response.json({ results: [{ url, title: '标题', content: '摘要' }] });
    });
    const sources = await new TavilySearchAdapter({ apiKey: 'test-only', fetcher }).search(query, { signal: new AbortController().signal });
    expect(sources).toHaveLength(url.includes('password@') ? 0 : 1);
    if (sources.length) expect(sources[0].url).toBe(url);
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it.each([301, 302, 303, 307, 308])('端点%s拒绝重定向且不读取Location或正文', async status => {
    const raw = new Response('private provider query test-only', { status, headers: { Location: 'http://169.254.169.254/latest/meta-data/' } });
    const read = vi.spyOn(raw, 'text'); const fetcher = vi.fn<typeof fetch>().mockResolvedValue(raw);
    await expect(new TavilySearchAdapter({ apiKey: 'test-only', fetcher }).search(query, { signal: new AbortController().signal }))
      .rejects.toMatchObject({ code: 'NETWORK_ERROR', message: '搜索服务请求失败。', status });
    expect(fetcher).toHaveBeenCalledOnce(); expect(fetcher.mock.calls[0][1]?.redirect).toBe('error'); expect(read).not.toHaveBeenCalled();
  });
  it.each([null, [], {}, { results: null }, { results: {} }, { results: 'provider-secret' }])('拒绝异常results结构：%j', async value => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(value));
    await expect(new TavilySearchAdapter({ apiKey: 'test-only', fetcher }).search(query, { signal: new AbortController().signal })).rejects.toThrow('搜索响应无效');
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
