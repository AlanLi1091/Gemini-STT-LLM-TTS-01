import type { ChatStreamSource } from './chat-stream';
export interface BudgetOptions { requestsPerMinute?: number; cooldownMs?: number; now?: () => number }

/** Local process-wide request budget, not a discovery of provider TPM/RPD quotas. */
export class RequestBudget {
  private starts: number[] = [];
  private pausedUntil = 0;
  protected readonly limit: number;
  private readonly cooldownMs: number;
  protected readonly now: () => number;
  constructor(options: BudgetOptions = {}) {
    this.limit = options.requestsPerMinute ?? 10;
    this.cooldownMs = options.cooldownMs ?? 60000;
    this.now = options.now ?? Date.now;
    if (!Number.isSafeInteger(this.limit) || this.limit <= 0 || !Number.isSafeInteger(this.cooldownMs) || this.cooldownMs <= 0) throw new Error('Invalid Gemini request budget configuration.');
  }
  protected waitAt(now: number): number {
    this.starts = this.starts.filter(start => start > now - 60000);
    const wait = Math.max(this.pausedUntil - now, this.starts.length >= this.limit ? this.starts[0] + 60000 - now : 0);
    return wait;
  }
  protected recordAt(now: number): void { this.starts.push(now); }
  acquire(_source = 'web'): number {
    const now = this.now();
    const wait = this.waitAt(now);
    if (wait > 0) return wait;
    this.recordAt(now); return 0;
  }
  pause() { this.pausedUntil = Math.max(this.pausedUntil, this.now() + this.cooldownMs); }
}

/** Reusable keyed caps under a shared total. Admission is synchronous and atomic. */
export class SourceRequestBudget extends RequestBudget {
  private readonly sourceLimits: ReadonlyMap<string, number>;
  private readonly sourceStarts = new Map<string, number[]>();
  constructor(options: BudgetOptions & { sourceLimits?: Readonly<Record<string, number>> } = {}) {
    super(options);
    const entries = Object.entries(options.sourceLimits ?? {});
    if (entries.some(([key, limit]) => !key || !Number.isSafeInteger(limit) || limit <= 0 || limit > this.limit)) {
      throw new Error('Invalid source request budget configuration.');
    }
    this.sourceLimits = new Map(entries);
  }
  override acquire(source = 'web'): number {
    const now = this.now();
    const limit = this.sourceLimits.get(source);
    const starts = limit === undefined ? undefined : (this.sourceStarts.get(source) ?? []).filter(start => start > now - 60000);
    const sourceWait = starts && starts.length >= limit! ? starts[0] + 60000 - now : 0;
    const wait = Math.max(this.waitAt(now), sourceWait);
    // Check every guard before recording either counter. Rejected attempts cost zero.
    if (wait > 0) return wait;
    this.recordAt(now);
    if (starts) { starts.push(now); this.sourceStarts.set(source, starts); }
    return 0;
  }
}

export interface SourceBudgetEnvironment {
  GEMINI_REQUESTS_PER_MINUTE?: string;
  GEMINI_WEB_RESERVED_REQUESTS_PER_MINUTE?: string;
  GEMINI_RATE_LIMIT_COOLDOWN_MS?: string;
  CHAT_COUNTS_PER_MINUTE?: string;
  CHAT_WEB_RESERVED_COUNTS_PER_MINUTE?: string;
}
export function readSourceBudgetConfig(env: SourceBudgetEnvironment) {
  const requestsPerMinute = env.GEMINI_REQUESTS_PER_MINUTE === undefined ? 10 : Number(env.GEMINI_REQUESTS_PER_MINUTE);
  const webReservedRequests = env.GEMINI_WEB_RESERVED_REQUESTS_PER_MINUTE === undefined ? 4 : Number(env.GEMINI_WEB_RESERVED_REQUESTS_PER_MINUTE);
  const cooldownMs = env.GEMINI_RATE_LIMIT_COOLDOWN_MS === undefined ? 60000 : Number(env.GEMINI_RATE_LIMIT_COOLDOWN_MS);
  const countsPerMinute = env.CHAT_COUNTS_PER_MINUTE === undefined ? 20 : Number(env.CHAT_COUNTS_PER_MINUTE);
  const webReservedCounts = env.CHAT_WEB_RESERVED_COUNTS_PER_MINUTE === undefined ? 8 : Number(env.CHAT_WEB_RESERVED_COUNTS_PER_MINUTE);
  const positiveInteger = (value: number) => Number.isSafeInteger(value) && value > 0;
  if (![requestsPerMinute, webReservedRequests, cooldownMs, countsPerMinute, webReservedCounts].every(positiveInteger) ||
    webReservedRequests >= requestsPerMinute || webReservedCounts >= countsPerMinute || countsPerMinute > 1000) {
    throw new Error('Invalid source request budget configuration.');
  }
  return { requestsPerMinute, webReservedRequests, cooldownMs, countsPerMinute, webReservedCounts };
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
