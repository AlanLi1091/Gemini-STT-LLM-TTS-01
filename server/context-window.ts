import { ChatError, type ChatAdapter, type Message } from '@core/index';
import { RequestBudget } from './request-budget';

export interface ContextWindowConfig {
  inputTokens: number;
  historyTurns: number;
  outputTokens: number;
  countTimeoutMs: number;
  countsPerMinute: number;
  systemInstruction: string;
}
export const DEFAULT_CONTEXT_CONFIG: ContextWindowConfig = {
  inputTokens: 8192, historyTurns: 20, outputTokens: 8192,
  countTimeoutMs: 3000, countsPerMinute: 20, systemInstruction: '',
};
const SAFE_RATIO = 0.8;
const DEFAULT_FACTOR = 1.25;
const MAX_FACTOR = 4;

export function readContextConfig(env: {
  CHAT_CONTEXT_INPUT_TOKENS?: string; CHAT_CONTEXT_HISTORY_TURNS?: string;
  CHAT_MAX_OUTPUT_TOKENS?: string; CHAT_COUNT_TIMEOUT_MS?: string;
  CHAT_COUNTS_PER_MINUTE?: string; GEMINI_SYSTEM_INSTRUCTION?: string;
}): ContextWindowConfig {
  return {
    inputTokens: env.CHAT_CONTEXT_INPUT_TOKENS === undefined ? 8192 : Number(env.CHAT_CONTEXT_INPUT_TOKENS),
    historyTurns: env.CHAT_CONTEXT_HISTORY_TURNS === undefined ? 20 : Number(env.CHAT_CONTEXT_HISTORY_TURNS),
    outputTokens: env.CHAT_MAX_OUTPUT_TOKENS === undefined ? 8192 : Number(env.CHAT_MAX_OUTPUT_TOKENS),
    countTimeoutMs: env.CHAT_COUNT_TIMEOUT_MS === undefined ? 3000 : Number(env.CHAT_COUNT_TIMEOUT_MS),
    countsPerMinute: env.CHAT_COUNTS_PER_MINUTE === undefined ? 20 : Number(env.CHAT_COUNTS_PER_MINUTE),
    systemInstruction: env.GEMINI_SYSTEM_INSTRUCTION?.trim() ?? '',
  };
}

/** A turn starts at user; orphan assistants and historical system text are omitted. */
export function historyTurns(messages: readonly Message[]): Message[][] {
  const turns: Message[][] = [];
  for (const message of messages) {
    if (message.role === 'user') turns.push([message]);
    else if (message.role === 'assistant' && turns.length) turns.at(-1)!.push(message);
  }
  return turns;
}

/** Conservative engineering estimate, not a tokenizer or a proven upper bound. */
export class ContextWindow {
  readonly config: ContextWindowConfig;
  private factor = DEFAULT_FACTOR;
  private readonly countBudget: RequestBudget;
  constructor(config: Partial<ContextWindowConfig> = {}, options: { countBudget?: RequestBudget; log?: (message: string) => void } = {}) {
    this.config = { ...DEFAULT_CONTEXT_CONFIG, ...config };
    const c = this.config;
    if (!Number.isSafeInteger(c.inputTokens) || c.inputTokens < 512 || c.inputTokens > 65536 ||
      !Number.isSafeInteger(c.historyTurns) || c.historyTurns < 0 || c.historyTurns > 100 ||
      !Number.isSafeInteger(c.outputTokens) || c.outputTokens < 1 || c.outputTokens > 65536 ||
      !Number.isSafeInteger(c.countTimeoutMs) || c.countTimeoutMs < 1 || c.countTimeoutMs > 30000 ||
      !Number.isSafeInteger(c.countsPerMinute) || c.countsPerMinute < 1 || c.countsPerMinute > 1000 ||
      typeof c.systemInstruction !== 'string') throw new Error('Invalid context window configuration.');
    this.countBudget = options.countBudget ?? new RequestBudget({ requestsPerMinute: c.countsPerMinute });
    this.log = options.log ?? console.log;
    // Leave room for at least the user/message overhead; no network needed at startup.
    if (this.estimate([]) + Math.ceil(33 * this.factor) >= c.inputTokens * SAFE_RATIO) {
      throw new Error('Configured system instruction exceeds the safe context budget.');
    }
  }
  private readonly log: (message: string) => void;
  private base(messages: readonly Message[]): number {
    return 256 + Buffer.byteLength(this.config.systemInstruction, 'utf8') +
      messages.reduce((n, message) => n + 32 + Buffer.byteLength(message.content, 'utf8'), 0);
  }
  estimate(messages: readonly Message[]): number { return Math.ceil(this.base(messages) * this.factor); }
  observe(messages: readonly Message[], promptTokens?: number): void {
    if (!Number.isSafeInteger(promptTokens) || promptTokens! <= 0) return;
    const next = Math.min(MAX_FACTOR, Math.max(this.factor, promptTokens! / this.base(messages) * DEFAULT_FACTOR));
    if (next > this.factor) {
      this.factor = next;
      this.log(`[context] estimate factor increased to ${next.toFixed(2)} (cap=${MAX_FACTOR})`);
    }
  }
  private limit(): never {
    throw new ChatError('本轮输入超过上下文预算，请缩短内容后重新发送。', 'CONTEXT_LIMIT');
  }
  private async count(adapter: ChatAdapter, messages: Message[], signal: AbortSignal): Promise<number | undefined> {
    if (!adapter.countTokens || this.countBudget.acquire()) return undefined;
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error('count timeout')); }, this.config.countTimeoutMs);
      });
      const cancelled = new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => reject(new Error('count cancelled')), { once: true });
      });
      if (signal.aborted) controller.abort();
      const tokens = await Promise.race([adapter.countTokens(messages, { signal: controller.signal }), timeout, cancelled]);
      if (!Number.isSafeInteger(tokens) || tokens < 0) return undefined;
      // The SDK cannot count Developer API systemInstruction; add it locally.
      return tokens + Math.ceil((256 + Buffer.byteLength(this.config.systemInstruction, 'utf8')) * this.factor);
    } catch (error) {
      if (signal.aborted) throw new ChatError('The operation was aborted.', 'ABORTED');
      if (error instanceof ChatError && error.code === 'AUTH_ERROR') throw error;
      if (error instanceof ChatError && error.code === 'RATE_LIMIT') this.countBudget.pause();
      return undefined;
    } finally {
      clearTimeout(timer); signal.removeEventListener('abort', abort);
    }
  }
  async select(history: readonly Message[], inputs: readonly Message[], adapter: ChatAdapter, signal: AbortSignal): Promise<Message[]> {
    if (signal.aborted) throw new ChatError('The operation was aborted.', 'ABORTED');
    const current = historyTurns(inputs).flat();
    const turns = historyTurns(history).slice(-this.config.historyTurns);
    if (this.config.historyTurns === 0) turns.length = 0;
    const candidate = () => [...turns.flat(), ...current];
    const safe = this.config.inputTokens * SAFE_RATIO;
    // Before network counting, bound work and remove whole oldest turns.
    while (turns.length && this.estimate(candidate()) > this.config.inputTokens) turns.shift();
    let selected = candidate();
    if (this.estimate(selected) <= safe) return selected;
    for (let attempt = 0; attempt < 2; attempt++) {
      const measured = await this.count(adapter, selected, signal);
      if (signal.aborted) throw new ChatError('The operation was aborted.', 'ABORTED');
      if (measured === undefined) break;
      if (measured <= this.config.inputTokens) return selected;
      if (!turns.length) return this.limit();
      // Use this request's observed ratio without poisoning persistent calibration.
      const ratio = Math.max(1, measured / Math.max(1, this.estimate(selected)));
      do { turns.shift(); } while (turns.length && this.estimate(candidate()) * ratio > safe);
      selected = candidate();
    }
    // Failure/exhaustion: fall back to a smaller locally bounded window.
    while (turns.length && this.estimate(candidate()) > safe) turns.shift();
    selected = candidate();
    if (this.estimate(selected) > safe) return this.limit();
    return selected;
  }
}
