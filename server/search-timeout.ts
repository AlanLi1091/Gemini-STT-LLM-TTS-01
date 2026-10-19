import { ChatError, type SearchSource } from '@core/index';
import { waitForSearch, type SearchAdapter } from './search-adapter';

/** A single monotonic deadline is carried through search, counting and generation. */
export class SearchDeadline {
  private readonly endsAt: number;
  constructor(durationMs: number, private readonly now: () => number = () => globalThis.performance.now()) { this.endsAt = now() + durationMs; }
  remaining(): number { return Math.max(0, this.endsAt - this.now()); }
  limit(durationMs: number): number { return Math.min(durationMs, this.remaining()); }
  async run<T>(operation: (signal: AbortSignal) => Promise<T>, signal: AbortSignal): Promise<T> {
    const controller = new AbortController(); const abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true }); let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (signal.aborted) throw new ChatError('本次请求已取消。', 'ABORTED');
      if (this.remaining() <= 0) throw new ChatError('模型生成失败，请稍后重试。', 'MODEL_ERROR');
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => { reject(new ChatError('模型生成失败，请稍后重试。', 'MODEL_ERROR')); controller.abort(); }, this.remaining());
      });
      const result = await Promise.race([waitForSearch(() => operation(controller.signal), signal), timeout]);
      if (this.remaining() <= 0) throw new ChatError('模型生成失败，请稍后重试。', 'MODEL_ERROR');
      return result;
    } finally { clearTimeout(timer); signal.removeEventListener('abort', abort); controller.abort(); }
  }
}
export async function searchWithTimeout(adapter: SearchAdapter, query: string, signal: AbortSignal,
  timeoutMs: number, deadline: SearchDeadline): Promise<SearchSource[]> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const duration = deadline.limit(timeoutMs); const started = globalThis.performance.now();
  try {
    if (signal.aborted) throw new ChatError('本次请求已取消。', 'ABORTED');
    if (duration <= 0) throw new ChatError('搜索服务请求失败。', 'NETWORK_ERROR');
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { reject(new ChatError('搜索服务请求失败。', 'NETWORK_ERROR')); controller.abort(); }, duration);
    });
    const result = await Promise.race([waitForSearch(() => adapter.search(query, { signal: controller.signal }), signal), timeout]);
    if (signal.aborted) throw new ChatError('本次请求已取消。', 'ABORTED');
    // Parsing can be synchronous: a delayed timer must not accept a late result.
    if (globalThis.performance.now() - started >= duration || deadline.remaining() <= 0) throw new ChatError('搜索服务请求失败。', 'NETWORK_ERROR');
    return result;
  } finally { clearTimeout(timer); signal.removeEventListener('abort', abort); controller.abort(); }
}
