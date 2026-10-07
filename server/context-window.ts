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
const COUNT_SAMPLE_TURNS = 8;
const COUNT_PAYLOAD_BYTES_PER_TOKEN = 32;
const PRECISE_TARGET_RATIO = 0.95;

// Category-weighted engineering estimate; unusual Unicode keeps the byte fallback.
function textUnits(text: string): number {
  let units = 0;
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (code <= 0x7f) units += 0.9;
    else if ((code >= 0x3400 && code <= 0x9fff) || (code >= 0x20000 && code <= 0x323af) ||
      (code >= 0x3040 && code <= 0x30ff) || (code >= 0xac00 && code <= 0xd7af)) units += 1.5;
    else units += Buffer.byteLength(char, 'utf8');
  }
  return units;
}

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
    return 256 + textUnits(this.config.systemInstruction) + this.contentUnits(messages);
  }
  private contentUnits(messages: readonly Message[]): number {
    return messages.reduce((n, message) => n + 32 + textUnits(message.content), 0);
  }
  private systemReserve(): number { return Math.ceil((256 + textUnits(this.config.systemInstruction)) * this.factor); }
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
      return tokens;
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
    const allTurns = this.config.historyTurns === 0 ? [] : historyTurns(history).slice(-this.config.historyTurns);
    const candidate = (turns: Message[][]) => [...turns.flat(), ...current];
    const payloadLimit = this.config.inputTokens * COUNT_PAYLOAD_BYTES_PER_TOKEN;
    const payloadFits = (messages: Message[]) => messages.reduce((n, m) => n + Buffer.byteLength(m.content, 'utf8'), 0) <= payloadLimit;
    const safe = this.config.inputTokens * SAFE_RATIO;
    const full = candidate(allTurns);
    if (this.estimate(full) <= safe && payloadFits(full)) return full;
    // Bound the first probe, but retain all eligible history for expansion.
    const sampleTurns = allTurns.slice(-COUNT_SAMPLE_TURNS);
    while (sampleTurns.length && !payloadFits(candidate(sampleTurns))) sampleTurns.shift();
    let selected = candidate(sampleTurns);
    if (!payloadFits(selected)) return this.limit();
    const systemReserve = this.systemReserve();
    let knownSafe: Message[] | undefined;
    let knownOver: Message[] | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      const contentsTokens = await this.count(adapter, selected, signal);
      if (signal.aborted) throw new ChatError('The operation was aborted.', 'ABORTED');
      if (contentsTokens === undefined) break;
      const measured = contentsTokens + systemReserve;
      if (measured <= this.config.inputTokens) {
        knownSafe = selected;
        if (attempt === 1 || selected.length === full.length) return selected;
      } else {
        knownOver = selected;
        if (selected.length === current.length) {
          if (knownSafe) return knownSafe;
          return this.limit();
        }
        if (attempt === 1) break;
      }
      // The observed ratio can be below one: add back whole eligible turns.
      const ratio = contentsTokens / Math.max(1, this.contentUnits(selected));
      const fitted = allTurns.slice();
      const target = this.config.inputTokens * PRECISE_TARGET_RATIO;
      while (fitted.length && (systemReserve + this.contentUnits(candidate(fitted)) * ratio > target ||
        !payloadFits(candidate(fitted)))) fitted.shift();
      const next = candidate(fitted);
      if (next.length === selected.length && next.every((message, index) => message === selected[index])) {
        if (knownSafe) return knownSafe;
        // An over-limit probe must become strictly smaller before the last check.
        if (fitted.length) fitted.shift();
      }
      selected = candidate(fitted);
    }
    // Failure/exhaustion: keep a verified safe probe or a smaller local window.
    if (knownSafe) return knownSafe;
    const fallbackTurns = allTurns.slice();
    while (fallbackTurns.length && (this.estimate(candidate(fallbackTurns)) > safe ||
      !payloadFits(candidate(fallbackTurns)))) fallbackTurns.shift();
    let fallback = candidate(fallbackTurns);
    if (knownOver && fallback.length === knownOver.length && fallback.every((m, i) => m === knownOver![i])) {
      if (!fallbackTurns.length) return this.limit();
      fallbackTurns.shift(); fallback = candidate(fallbackTurns);
    }
    if (this.estimate(fallback) > safe || !payloadFits(fallback)) return this.limit();
    return fallback;
  }
}
