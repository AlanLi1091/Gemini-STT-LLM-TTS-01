// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SearchDeadline, searchWithTimeout } from '../search-timeout';
import { MockSearchAdapter } from '../search-adapter';
afterEach(() => vi.useRealTimers());
describe('Task 20 Step 2: 搜索期限与单调时钟', () => {
  it('搜索8秒后中止忽略abort的上游且迟到结果被丢弃', async () => {
    vi.useFakeTimers(); let signal!: AbortSignal; let finish!: (value: never[]) => void;
    const adapter = { search: vi.fn((_q: string, options: { signal: AbortSignal }) => { signal = options.signal; return new Promise<never[]>(resolve => { finish = resolve; }); }) };
    const deadline = new SearchDeadline(104000); const pending = searchWithTimeout(adapter, '问题', new AbortController().signal, 8000, deadline);
    const expected = expect(pending).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    await vi.advanceTimersByTimeAsync(8000); await expected; expect(signal.aborted).toBe(true); finish([]); expect(vi.getTimerCount()).toBe(0);
  });
  it('客户端取消维持ABORTED而非超时降级', async () => {
    const c = new AbortController(); c.abort();
    await expect(searchWithTimeout(new MockSearchAdapter(), '问题', c.signal, 8000, new SearchDeadline(104000))).rejects.toMatchObject({ code: 'ABORTED' });
  });
  it('阶段剩余预算不随墙钟或新阶段重置', () => {
    let now = 10; const d = new SearchDeadline(104000, () => now);
    now += 8000; expect(d.remaining()).toBe(96000); expect(d.limit(90000)).toBe(90000);
    now += 6000; expect(d.remaining()).toBe(90000); now += 90000; expect(d.remaining()).toBe(0);
  });
  it('整体剩余时间小于搜索期限时按剩余时间结束', async () => {
    vi.useFakeTimers(); const deadline = new SearchDeadline(5);
    const pending = searchWithTimeout({ search: async () => new Promise<never[]>(() => {}) }, '问题', new AbortController().signal, 8000, deadline);
    const expected = expect(pending).rejects.toMatchObject({ code: 'NETWORK_ERROR' }); await vi.advanceTimersByTimeAsync(5); await expected;
  });
});
