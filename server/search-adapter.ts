import { ChatError, type SearchSource } from '@core/index';
import { normalizeSearchSources } from './search-context';

export interface SearchAdapter {
  search(query: string, options: { signal: AbortSignal }): Promise<SearchSource[]>;
}
/** Cancellation bounds local waiting, including upstreams which ignore abort. */
export async function waitForSearch<T>(operation: () => Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) throw new ChatError('本次请求已取消。', 'ABORTED');
  let abort!: () => void;
  const cancelled = new Promise<never>((_, reject) => {
    abort = () => reject(new ChatError('本次请求已取消。', 'ABORTED'));
    signal.addEventListener('abort', abort, { once: true });
  });
  try {
    const result = await Promise.race([Promise.resolve().then(() => {
      if (signal.aborted) throw new ChatError('本次请求已取消。', 'ABORTED');
      return operation();
    }), cancelled]);
    if (signal.aborted) throw new ChatError('本次请求已取消。', 'ABORTED');
    return result;
  } finally { signal.removeEventListener('abort', abort); }
}

/** No default fetch: Step 1 requires explicit injection, never wired to production. */
export class TavilySearchAdapter implements SearchAdapter {
  constructor(private readonly options: { apiKey: string; fetcher: typeof fetch }) {}
  async search(query: string, { signal }: { signal: AbortSignal }): Promise<SearchSource[]> {
    if (!query.trim() || Array.from(query).length > 500) throw new TypeError('Invalid search question');
    let response: Response | undefined;
    const stop = () => { try { void response?.body?.cancel().catch(() => {}); } catch { /* reader owns cancellation */ } };
    signal.addEventListener('abort', stop, { once: true });
    try {
      const fetched = await waitForSearch<Response>(() => this.options.fetcher('https://api.tavily.com/search', {
        method: 'POST', signal, redirect: 'error',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.options.apiKey}` },
        body: JSON.stringify({ query, search_depth: 'basic', auto_parameters: false, chunks_per_source: 1,
          max_results: 3, include_raw_content: false, include_answer: false }),
      }).then(value => { if (signal.aborted) void value.body?.cancel().catch(() => {}); return value; }), signal);
      response = fetched;
      if (!fetched.ok) {
        stop(); throw new ChatError('搜索服务请求失败。', 'NETWORK_ERROR', { status: fetched.status });
      }
      if (!fetched.body) throw new Error('搜索响应无效');
      const reader = fetched.body.getReader();
      const cancel = () => { void reader.cancel().catch(() => {}); };
      signal.addEventListener('abort', cancel, { once: true });
      try {
        let size = 0; let text = ''; const decoder = new TextDecoder();
        while (true) {
          const part = await waitForSearch(() => reader.read(), signal);
          if (part.done) break;
          size += part.value.byteLength;
          if (size > 256 * 1024) throw new Error('搜索响应无效');
          text += decoder.decode(part.value, { stream: true });
        }
        text += decoder.decode();
        let value: unknown;
        try { value = JSON.parse(text); } catch { throw new Error('搜索响应无效'); }
        if (!value || typeof value !== 'object' || !Array.isArray((value as { results?: unknown }).results)) throw new Error('搜索响应无效');
        return normalizeSearchSources((value as { results: unknown[] }).results);
      } finally {
        signal.removeEventListener('abort', cancel);
        // Do not await a cancel promise controlled by an uncooperative upstream.
        cancel(); reader.releaseLock();
      }
    } finally { signal.removeEventListener('abort', stop); }
  }
}
export class MockSearchAdapter implements SearchAdapter {
  constructor(private readonly results: unknown = [{ title: '离线 Mock 来源', url: 'https://example.com/mock', content: '仅用于离线链路验证，不代表真实联网检索。' }]) {}
  async search(_query: string, { signal }: { signal: AbortSignal }): Promise<SearchSource[]> {
    if (signal.aborted) throw new ChatError('本次请求已取消。', 'ABORTED');
    return normalizeSearchSources(this.results);
  }
}
