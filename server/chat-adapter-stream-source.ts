import { readSearchConfig, type SearchConfig, type SearchEnvironment } from './search-config';
import { SearchBudget } from './search-budget';
import { JsonSearchLedger } from './storage/search-ledger';
import { SearchDeadline, searchWithTimeout } from './search-timeout';
import { type SearchAdapter } from './search-adapter';
import { buildSearchContext, degradedSearch, fitSearchSources, normalizeSearchSources, SEARCH_SYSTEM_RULE } from './search-context';
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
import { ContextWindow, historyTurns, readContextConfig } from './context-window';
import { logChatFailure, safeStreamError, type ErrorStage } from './chat-errors';
import {
  DEFAULT_GENERATION_TIMEOUT_CONFIG,
  readGenerationTimeoutConfig,
  streamWithGenerationTimeout,
  type GenerationTimeoutConfig,
} from './generation-timeout';

export interface ServerChatEnvironment extends SearchEnvironment {
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
  searchBudget?: SearchBudget;
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
  config?: SearchConfig;
  budget?: SearchBudget;
  /** Optional extra code-only restriction; cannot bypass atomic guards / ledger. */
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
  const searchConfig = searchOptions.config ?? readSearchConfig();
  const searchBudget = searchOptions.budget ?? new SearchBudget(searchConfig, new JsonSearchLedger(searchConfig.ledgerPath));
  // Validate the same complete phase relationship for code-injected sources as for env assembly.
  readGenerationTimeoutConfig({ CHAT_GENERATION_FIRST_CHUNK_TIMEOUT_MS: String(generationTimeoutConfig.firstChunkTimeoutMs),
    CHAT_GENERATION_TOTAL_TIMEOUT_MS: String(generationTimeoutConfig.totalTimeoutMs) }, contextWindow.config.countTimeoutMs, searchConfig.timeoutMs);
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
      const source: 'web' | 'discord' = state.session.origin?.type === 'discord' ? 'discord' : 'web';
      let selected: Message[];
      let search: SearchMetadata | undefined;
      let injected = false;
      let deadline: SearchDeadline | undefined;
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
        deadline = new SearchDeadline(115000);
        const identity = { source, userId: trustedDiscordUserId,
          channelId: state.session.origin?.type === 'discord' ? state.session.origin.channelId : undefined };
        const validUser = typeof trustedDiscordUserId === 'string' && /^\d{17,20}$/.test(trustedDiscordUserId);
        if (source === 'discord' && !validUser) search = degradedSearch('missing_identity');
        else if (!searchOptions.adapter) search = degradedSearch('unavailable');
        else {
          try {
            if (!(searchOptions.admit?.(identity) ?? true) ||
              !await deadline.run(phaseSignal => searchBudget.acquire(identity, phaseSignal), signal)) search = degradedSearch('admission_denied');
            else {
              const raw = await searchWithTimeout(searchOptions.adapter, question, signal, searchConfig.timeoutMs, deadline);
              const sources = normalizeSearchSources(raw);
              search = sources.length ? { status: 'succeeded', sources } : degradedSearch('no_results');
            }
          } catch (error) {
            if (signal.aborted) return;
            const failure = safeStreamError(error, 'search', 'NETWORK_ERROR');
            logChatFailure(error, 'search', failure.code);
            if (error && typeof error === 'object' && (error as { status?: unknown }).status === 429) searchBudget.pause();
            search = degradedSearch('provider_failure');
          }
        }
        if (signal.aborted) return;
        stage = 'count';
        const countAllowance = { remaining: 2 };
        if (search.status === 'succeeded') {
          let sources = fitSearchSources(search.sources, block => contextWindow.estimateSearchBlock(block));
          const withData = (block: string) => inputs.map((input, index) => index === inputs.length - 1
            ? { ...input, content: `${input.content}\n\n${block}` } : input);
          // Fit minimum current input before removing any complete history turn.
          sources = fitSearchSources(sources, block => contextWindow.estimate(withData(block), SEARCH_SYSTEM_RULE, true), contextWindow.config.inputTokens);
          if (!sources.length) {
            search = degradedSearch('context_limit');
            selected = await contextWindow.select(history, inputs, adapter, signal, source, { countAllowance, deadline });
          } else {
            const eligible = contextWindow.config.historyTurns === 0 ? [] : historyTurns(history).slice(-contextWindow.config.historyTurns).flat();
            // When full history is tight, shrink data before select() removes old whole turns.
            // Keep one minimal source here: history removal must precede dropping data entirely.
            sources = fitSearchSources(sources,
              block => contextWindow.estimate([...eligible, ...withData(block)], SEARCH_SYSTEM_RULE, true), contextWindow.config.inputTokens * 0.8, true);
            search = { status: 'succeeded', sources };
            try {
              selected = await contextWindow.select(history, withData(buildSearchContext(sources)), adapter, signal, source,
                { systemInstruction: SEARCH_SYSTEM_RULE, countAllowance, search: true, deadline });
              selected = [{ id: 'search-system-rule', role: 'system', content: SEARCH_SYSTEM_RULE, createdAt: 0 }, ...selected];
              injected = true;
            } catch (error) {
              if (!(error instanceof ChatError) || error.code !== 'CONTEXT_LIMIT') throw error;
              search = degradedSearch('context_limit');
              selected = await contextWindow.select(history, inputs, adapter, signal, source, { countAllowance, deadline });
            }
          }
        } else selected = await contextWindow.select(history, inputs, adapter, signal, source, { countAllowance, deadline });
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
        { signal, maxTokens: contextWindow.config.outputTokens }, generationTimeoutConfig, deadline)) {
        if (signal.aborted) return;
        if (chunk.done) {
          // Reject empty output while still in the model stage, before calibration or storage.
          if (!chunk.accumulated.trim()) throw new ChatError('模型未返回有效正文，请稍后重新提问。', 'MODEL_ERROR');
          if (injected) contextWindow.observeSearch(selected, chunk.usage?.promptTokens);
          else contextWindow.observe(selected, chunk.usage?.promptTokens);
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
  const searchConfig = readSearchConfig(environment);
  const generationTimeoutConfig = readGenerationTimeoutConfig(environment, contextConfig.countTimeoutMs, searchConfig.timeoutMs);
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
    return createSessionChatStreamSource(adapter, service, budget, contextWindow, generationTimeoutConfig, { adapter: options.searchAdapter, config: searchConfig, budget: options.searchBudget });
  }
  const source = createAdapterStreamSource(adapter, contextWindow, generationTimeoutConfig);
  return budget ? guardStreamSource(source, budget) : source;
}
