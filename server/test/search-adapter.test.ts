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
