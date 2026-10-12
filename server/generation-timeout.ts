import { ChatError, type ChatAdapter, type ChatAdapterOptions, type ChatChunk, type Message } from '@core/index';

export interface GenerationTimeoutConfig {
  firstChunkTimeoutMs: number;
  totalTimeoutMs: number;
}

export const DEFAULT_GENERATION_TIMEOUT_CONFIG: Readonly<GenerationTimeoutConfig> = Object.freeze({
  firstChunkTimeoutMs: 60000,
  totalTimeoutMs: 90000,
});

function validateConfig(config: GenerationTimeoutConfig): void {
  if (!Number.isSafeInteger(config.firstChunkTimeoutMs) || config.firstChunkTimeoutMs <= 0 ||
    !Number.isSafeInteger(config.totalTimeoutMs) || config.totalTimeoutMs <= 0 ||
    config.firstChunkTimeoutMs > config.totalTimeoutMs || config.totalTimeoutMs > 110000) {
    throw new Error('Invalid chat generation timeout configuration.');
  }
}

export function readGenerationTimeoutConfig(environment: {
  CHAT_GENERATION_FIRST_CHUNK_TIMEOUT_MS?: string;
  CHAT_GENERATION_TOTAL_TIMEOUT_MS?: string;
}, countTimeoutMs = 3000): GenerationTimeoutConfig {
  const config = {
    firstChunkTimeoutMs: environment.CHAT_GENERATION_FIRST_CHUNK_TIMEOUT_MS === undefined
      ? DEFAULT_GENERATION_TIMEOUT_CONFIG.firstChunkTimeoutMs : Number(environment.CHAT_GENERATION_FIRST_CHUNK_TIMEOUT_MS),
    totalTimeoutMs: environment.CHAT_GENERATION_TOTAL_TIMEOUT_MS === undefined
      ? DEFAULT_GENERATION_TIMEOUT_CONFIG.totalTimeoutMs : Number(environment.CHAT_GENERATION_TOTAL_TIMEOUT_MS),
  };
  validateConfig(config);
  // Leave at least five seconds before the Bot's unchanged 120-second deadline.
  if (!Number.isSafeInteger(countTimeoutMs) || countTimeoutMs <= 0 || config.totalTimeoutMs + 2 * countTimeoutMs > 115000) {
    throw new Error('Invalid chat generation and count timeout configuration.');
  }
  return config;
}

export class GenerationTimeoutError extends ChatError {
  constructor() {
    super('模型生成超时，请稍后重试。', 'MODEL_ERROR');
    this.name = 'GenerationTimeoutError';
  }
}

/** Bound waiting as well as signalling: an uncooperative iterator cannot hold the session lock. */
export async function* streamWithGenerationTimeout(
  adapter: ChatAdapter,
  messages: Message[],
  options: ChatAdapterOptions & { signal: AbortSignal },
  config: GenerationTimeoutConfig = DEFAULT_GENERATION_TIMEOUT_CONFIG,
): AsyncIterable<ChatChunk> {
  validateConfig(config);
  const clientSignal = options.signal;
  if (clientSignal.aborted) throw new ChatError('The operation was aborted.', 'ABORTED');
  const controller = new AbortController();
  const startedAt = Date.now();
  let receivedFirstChunk = false;
  let timedOut = false;
  let completed = false;
  let iterator: AsyncIterator<ChatChunk> | undefined;
  let rejectBoundary!: (reason: Error) => void;
  const boundary = new Promise<never>((_, reject) => { rejectBoundary = reject; });
  // The consumer may be suspended at yield when a deadline fires.
  void boundary.catch(() => undefined);
  const cancelled = () => {
    rejectBoundary(new ChatError('The operation was aborted.', 'ABORTED'));
    controller.abort();
  };
  const timeout = () => {
    if (clientSignal.aborted) { cancelled(); return; }
    timedOut = true;
    // Reject before aborting: synchronous SDK abort callbacks cannot replace the timeout error.
    rejectBoundary(new GenerationTimeoutError());
    controller.abort();
  };
  const firstTimer = setTimeout(timeout, config.firstChunkTimeoutMs);
  const totalTimer = setTimeout(timeout, config.totalTimeoutMs);
  clientSignal.addEventListener('abort', cancelled, { once: true });
  const clearDeadlines = () => { clearTimeout(firstTimer); clearTimeout(totalTimer); };
  const checkDeadline = () => {
    if (clientSignal.aborted) throw new ChatError('The operation was aborted.', 'ABORTED');
    // Check the clock too: delayed timer callbacks must not accept a late done/chunk.
    const elapsed = Date.now() - startedAt;
    if (timedOut || elapsed >= config.totalTimeoutMs || (!receivedFirstChunk && elapsed >= config.firstChunkTimeoutMs)) {
      timeout();
      throw new GenerationTimeoutError();
    }
  };
  try {
    // Start both deadlines before invoking stream(), not just before its first next().
    iterator = adapter.stream(messages, { ...options, signal: controller.signal })[Symbol.asyncIterator]();
    while (true) {
      checkDeadline();
      const result = await Promise.race([iterator.next(), boundary]);
      checkDeadline();
      if (result.done) {
        completed = true;
        clearDeadlines();
        return;
      }
      receivedFirstChunk = true;
      clearTimeout(firstTimer);
      if (result.value.done) {
        // Generation has ended; storage and downstream consumption are outside its deadline.
        completed = true;
        clearDeadlines();
        yield result.value;
        return;
      }
      yield result.value;
    }
  } catch (error) {
    checkDeadline();
    throw error;
  } finally {
    clearDeadlines();
    clientSignal.removeEventListener('abort', cancelled);
    if (!completed) controller.abort();
    // Async-generator return can queue behind a hung next(). Never await cleanup.
    try {
      if (iterator?.return) void Promise.resolve(iterator.return()).catch(() => undefined);
    } catch {
      // A synchronous cleanup failure cannot replace the result or keep a lock held.
    }
  }
}
