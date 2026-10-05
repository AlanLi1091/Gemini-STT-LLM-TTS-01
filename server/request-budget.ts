import type { ChatStreamSource } from './chat-stream';
export interface BudgetOptions { requestsPerMinute?: number; cooldownMs?: number; now?: () => number }

/** Local process-wide request budget, not a discovery of provider TPM/RPD quotas. */
export class RequestBudget {
  private starts: number[] = [];
  private pausedUntil = 0;
  private readonly limit: number;
  private readonly cooldownMs: number;
  private readonly now: () => number;
  constructor(options: BudgetOptions = {}) {
    this.limit = options.requestsPerMinute ?? 10;
    this.cooldownMs = options.cooldownMs ?? 60000;
    this.now = options.now ?? Date.now;
    if (!Number.isSafeInteger(this.limit) || this.limit <= 0 || !Number.isSafeInteger(this.cooldownMs) || this.cooldownMs <= 0) throw new Error('Invalid Gemini request budget configuration.');
  }
  acquire(): number {
    const now = this.now();
    this.starts = this.starts.filter(start => start > now - 60000);
    const wait = Math.max(this.pausedUntil - now, this.starts.length >= this.limit ? this.starts[0] + 60000 - now : 0);
    if (wait > 0) return wait;
    this.starts.push(now); return 0;
  }
  pause() { this.pausedUntil = Math.max(this.pausedUntil, this.now() + this.cooldownMs); }
}

export function guardStreamSource(source: ChatStreamSource, budget: RequestBudget): ChatStreamSource {
  return async function* (request, options) {
    if (options.signal.aborted) return;
    const wait = budget.acquire();
    if (wait) {
      yield { event: 'error', data: { error: { code: 'RATE_LIMIT', message: `模型请求预算已满或暂时暂停，请等待 ${Math.ceil(wait / 1000)} 秒后再试。` } } };
      return;
    }
    for await (const event of source(request, options)) {
      if (event.event === 'error' && event.data.error.code === 'RATE_LIMIT') budget.pause();
      yield event;
    }
  };
}
