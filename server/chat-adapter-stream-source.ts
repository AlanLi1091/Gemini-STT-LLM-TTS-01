import { waitForSearch, type SearchAdapter } from './search-adapter';
import { buildSearchContext, degradedSearch, normalizeSearchSources, SEARCH_SYSTEM_RULE } from './search-context';
import {
  ChatError,
  GeminiChatAdapter,
  MockChatAdapter,
  classifyGeminiError,
  sanitizeGeminiApiKey,
  type ChatAdapter,
  type Message,
  type MockChatAdapterOptions,
  type SearchMetadata,
} from '@core/index';
import { isChatStreamRequest, type ChatStreamSource } from './chat-stream';
import { SessionService } from './session-service';
import { SessionRequestConflictError, type SessionStorage } from './storage/session-storage';
import { guardStreamSource, RequestBudget, SourceRequestBudget, readSourceBudgetConfig } from './request-budget';
import { ContextWindow, readContextConfig } from './context-window';
import { logChatFailure, safeStreamError, type ErrorStage } from './chat-errors';
import {
  DEFAULT_GENERATION_TIMEOUT_CONFIG,
  readGenerationTimeoutConfig,
  streamWithGenerationTimeout,
  type GenerationTimeoutConfig,
} from './generation-timeout';

export interface ServerChatEnvironment {
  GEMINI_API_KEY?: string;
  GEMINI_REQUESTS_PER_MINUTE?: string;
  GEMINI_WEB_RESERVED_REQUESTS_PER_MINUTE?: string;
  GEMINI_RATE_LIMIT_COOLDOWN_MS?: string;
  CHAT_CONTEXT_INPUT_TOKENS?: string;
  CHAT_CONTEXT_HISTORY_TURNS?: string;
  CHAT_MAX_OUTPUT_TOKENS?: string;
  CHAT_COUNT_TIMEOUT_MS?: string;
  CHAT_GENERATION_FIRST_CHUNK_TIMEOUT_MS?: string;
  CHAT_GENERATION_TOTAL_TIMEOUT_MS?: string;
  CHAT_COUNTS_PER_MINUTE?: string;
  CHAT_WEB_RESERVED_COUNTS_PER_MINUTE?: string;
  GEMINI_SYSTEM_INSTRUCTION?: string;
}

export interface ServerChatStreamSourceOptions {
  mockAdapterOptions?: MockChatAdapterOptions;
  sessionStorage?: SessionStorage;
  /** Production routes and stream source must share this service / lock. */
  sessionService?: SessionService;
  requestBudget?: RequestBudget;
  /** Step 1: code-only Mock injection. No production search network wiring. */
  searchAdapter?: SearchAdapter;
}

/** 将任意共享 ChatAdapter 映射为服务端 SSE 流源。 */
export function createAdapterStreamSource(
  adapter: ChatAdapter,
  contextWindow = new ContextWindow(),
  generationTimeoutConfig: GenerationTimeoutConfig = DEFAULT_GENERATION_TIMEOUT_CONFIG,
): ChatStreamSource {
  return async function* adapterStreamSource(request, { signal }) {
    if (request.search === true) {
      yield { event: 'error', data: { error: { code: 'UNKNOWN', message: 'Invalid chat stream request' } } };
      return;
    }
    const messages: Message[] = request.messages.map((message, index) => ({
      id: `request-${index}`,
      role: message.role,
      content: message.content,
      createdAt: 0,
    }));

    let stage: ErrorStage = 'count';
    try {
      let lastUser = messages.length - 1;
      while (lastUser >= 0 && messages[lastUser].role !== 'user') lastUser--;
      const selected = await contextWindow.select(messages.slice(0, Math.max(0, lastUser)),
        messages.slice(Math.max(0, lastUser)), adapter, signal);
      stage = 'model';
      for await (const chunk of streamWithGenerationTimeout(adapter, selected,
        { signal, maxTokens: contextWindow.config.outputTokens }, generationTimeoutConfig)) {
        if (chunk.done) {
          if (!chunk.accumulated.trim()) throw new ChatError('模型未返回有效正文，请稍后重新提问。', 'MODEL_ERROR');
          contextWindow.observe(selected, chunk.usage?.promptTokens);
          yield {
            event: 'done',
            data: {
              content: chunk.accumulated,
              usage: chunk.usage,
            },
          };
          return;
        }

        yield {
          event: 'chunk',
          data: {
            delta: chunk.delta,
            accumulated: chunk.accumulated,
          },
        };
      }
      if (!signal.aborted) yield { event: 'error', data: { error: { code: 'MODEL_ERROR', message: '模型未返回完整回复。' } } };
    } catch (error) {
      if (signal.aborted) return;
      const chatError = classifyGeminiError(error, signal);
      const safeError = safeStreamError(error, stage, chatError.code);
      logChatFailure(error, stage, safeError.code);
      yield { event: 'error', data: { error: safeError } };
    }
  };
}

export interface SessionSearchOptions {
  adapter?: SearchAdapter;
  /** Step 2 replaces this Mock admission hook with atomic guards / ledger. */
  admit?: (context: { source: 'web' | 'discord'; userId?: string; channelId?: string }) => boolean;
}

/**
 * Adds Task 14 session addressing to an adapter source. In session mode,
 * request messages must contain exactly this turn's single user input. The
 * adapter context is selected from the server's persisted history.
 */
export function createSessionChatStreamSource(
  adapter: ChatAdapter,
  sessionService: SessionService,
  requestBudget?: RequestBudget,
  contextWindow = new ContextWindow(),
  generationTimeoutConfig: GenerationTimeoutConfig = DEFAULT_GENERATION_TIMEOUT_CONFIG,
  searchOptions: SessionSearchOptions = {},
): ChatStreamSource {
  return async function* sessionChatStreamSource(request, { signal, trustedDiscordUserId }) {
    if (signal.aborted) return;
    if (!isChatStreamRequest(request) || !request.sessionId) {
      yield { event: 'error', data: { error: { code: 'UNKNOWN', message: 'Invalid chat stream request' } } };
      return;
    }

    const release = sessionService.tryAcquireRequest(request.sessionId);
    if (!release) {
      yield { event: 'error', data: { error: { code: 'REQUEST_CONFLICT', message: new SessionRequestConflictError().message } } };
      return;
    }
    let stage: ErrorStage = 'storage';
    try {
      const requestId = request.requestId?.toLowerCase();
      const state = await sessionService.inspectRequest(request.sessionId, request.messages[0]?.content ?? '', requestId, request.search ?? false);
      if (signal.aborted) return;
      if (state.response) {
        yield { event: 'done', data: { content: state.response.content, usage: state.response.usage, ...(state.response.search ? { search: state.response.search } : {}) } };
        return;
      }
      // On retry, the existing tail input belongs to this turn, not history.
      const inputs: Message[] = state.inputExists ? state.session.messages.slice(-1) :
        request.messages.map((message, index) => ({ ...message, id: requestId ?? `pending-${index}`, createdAt: 0 }));
      const history = state.inputExists ? state.session.messages.slice(0, -1) : state.session.messages;
      // Only persisted session metadata determines the budget source. Legacy is web.
      const source = state.session.origin?.type === 'discord' ? 'discord' : 'web';
      let selected: Message[];
      let search: SearchMetadata | undefined;
      let injected = false;
      const acquireGeneration = (): number => requestBudget?.acquire(source) ?? 0;
      const rejectBudget = (wait: number) => ({ event: 'error' as const, data: { error: {
        code: 'RATE_LIMIT' as const, message: `模型请求预算已满或暂时暂停，请等待 ${Math.ceil(wait / 1000)} 秒后再试。`,
      } } });
      stage = 'count';
      if (request.search === true) {
        const question = request.messages[0].content;
        if (Array.from(question).length > 500) {
          throw new ChatError('联网搜索问题最多500个字符，请缩短后重试。', 'MODEL_ERROR');
        }
        contextWindow.preflight(inputs);
        const wait = acquireGeneration();
        if (wait) { yield rejectBudget(wait); return; }
        stage = 'search';
        const validUser = typeof trustedDiscordUserId === 'string' && /^\d{17,20}$/.test(trustedDiscordUserId);
        if (source === 'discord' && !validUser) search = degradedSearch('missing_identity');
        else if (!(searchOptions.admit?.({ source, userId: validUser ? trustedDiscordUserId : undefined,
          channelId: state.session.origin?.type === 'discord' ? state.session.origin.channelId : undefined }) ?? true)) {
          search = degradedSearch('admission_denied');
        } else if (!searchOptions.adapter) search = degradedSearch('unavailable');
        else {
          try {
            const raw = await waitForSearch(() => searchOptions.adapter!.search(question, { signal }), signal);
            const sources = normalizeSearchSources(raw);
            search = sources.length ? { status: 'succeeded', sources } : degradedSearch('no_results');
          } catch (error) {
            if (signal.aborted) return;
            // Search failures are an explicit downgrade, never a model-budget pause.
            const failure = safeStreamError(error, 'search', 'NETWORK_ERROR');
            logChatFailure(error, 'search', failure.code);
            search = degradedSearch('provider_failure');
          }
        }
        if (signal.aborted) return;
        stage = 'count';
        const countAllowance = { remaining: 2 };
        if (search.status === 'succeeded') {
          const withData = inputs.map((input, index) => index === inputs.length - 1
            ? { ...input, content: `${input.content}\n\n${buildSearchContext(search!.sources)}` } : input);
          try {
            selected = await contextWindow.select(history, withData, adapter, signal, source,
              { systemInstruction: `\n\n${SEARCH_SYSTEM_RULE}`, countAllowance });
            selected = [{ id: 'search-system-rule', role: 'system', content: SEARCH_SYSTEM_RULE, createdAt: 0 }, ...selected];
            injected = true;
          } catch (error) {
            if (!(error instanceof ChatError) || error.code !== 'CONTEXT_LIMIT') throw error;
            search = degradedSearch('context_limit');
            selected = await contextWindow.select(history, inputs, adapter, signal, source, { countAllowance });
          }
        } else selected = await contextWindow.select(history, inputs, adapter, signal, source, { countAllowance });
      } else {
        // Ordinary rounds retain the established count -> generation-admission order.
        selected = await contextWindow.select(history, inputs, adapter, signal, source);
        if (signal.aborted) return;
        const wait = acquireGeneration();
        if (wait) { yield rejectBudget(wait); return; }
      }
      if (signal.aborted) return;
      stage = 'storage';
      if (!state.inputExists) await sessionService.appendTurnInputs(request.sessionId, request.messages, requestId, request.search ?? false);
      if (signal.aborted) return;
      stage = 'model';
      for await (const chunk of streamWithGenerationTimeout(adapter, selected,
        { signal, maxTokens: contextWindow.config.outputTokens }, generationTimeoutConfig)) {
        if (signal.aborted) return;
        if (chunk.done) {
          // Reject empty output while still in the model stage, before calibration or storage.
          if (!chunk.accumulated.trim()) throw new ChatError('模型未返回有效正文，请稍后重新提问。', 'MODEL_ERROR');
          if (!injected) contextWindow.observe(selected, chunk.usage?.promptTokens);
          stage = 'storage';
          await sessionService.appendAssistantResponse(
            request.sessionId,
            chunk.accumulated,
            chunk.usage,
            requestId,
            search,
          );
          yield { event: 'done', data: { content: chunk.accumulated, usage: chunk.usage, ...(search ? { search } : {}) } };
          return;
        }
        yield {
          event: 'chunk',
          data: { delta: chunk.delta, accumulated: chunk.accumulated },
        };
      }
      if (!signal.aborted) yield { event: 'error', data: { error: { code: 'MODEL_ERROR', message: '模型未返回完整回复。' } } };
    } catch (error) {
      if (signal.aborted) return;
      // Session/storage failures never enter the upstream model classifier.
      const code = stage === 'storage' ? 'UNKNOWN' : classifyGeminiError(error, signal).code;
      const safeError = safeStreamError(error, stage, code);
      logChatFailure(error, stage, safeError.code);
      if (stage === 'model' && safeError.code === 'RATE_LIMIT') requestBudget?.pause();
      yield { event: 'error', data: { error: safeError } };
    } finally {
      release();
    }
  };
}

/** 有有效服务端 Key 时使用 Gemini，否则自动降级至共享 MockAdapter。 */
export function createChatStreamSourceFromEnv(
  environment: ServerChatEnvironment,
  options: ServerChatStreamSourceOptions = {},
): ChatStreamSource {
  if (options.sessionService && options.sessionStorage) {
    throw new Error('Provide one shared sessionService or sessionStorage, not both.');
  }
  const contextConfig = readContextConfig(environment);
  // Validate even in Mock mode or when a test injects its own budget.
  const budgetConfig = readSourceBudgetConfig(environment);
  const countBudget = new SourceRequestBudget({ requestsPerMinute: budgetConfig.countsPerMinute,
    sourceLimits: { discord: budgetConfig.countsPerMinute - budgetConfig.webReservedCounts } });
  const contextWindow = new ContextWindow(contextConfig, { countBudget });
  const generationTimeoutConfig = readGenerationTimeoutConfig(environment, contextConfig.countTimeoutMs);
  const apiKey = sanitizeGeminiApiKey(environment.GEMINI_API_KEY);
  const adapter: ChatAdapter = apiKey
    ? new GeminiChatAdapter({ apiKey, systemInstruction: contextConfig.systemInstruction })
    : new MockChatAdapter(options.mockAdapterOptions);

  const budget = apiKey ? options.requestBudget ?? new SourceRequestBudget({
    requestsPerMinute: budgetConfig.requestsPerMinute,
    sourceLimits: { discord: budgetConfig.requestsPerMinute - budgetConfig.webReservedRequests },
    cooldownMs: budgetConfig.cooldownMs,
  }) : undefined;
  if (options.sessionService || options.sessionStorage) {
    const service = options.sessionService ?? new SessionService(options.sessionStorage!);
    return createSessionChatStreamSource(adapter, service, budget, contextWindow, generationTimeoutConfig, { adapter: options.searchAdapter });
  }
  const source = createAdapterStreamSource(adapter, contextWindow, generationTimeoutConfig);
  return budget ? guardStreamSource(source, budget) : source;
}
