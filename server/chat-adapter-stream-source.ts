import {
  GeminiChatAdapter,
  MockChatAdapter,
  classifyGeminiError,
  sanitizeGeminiApiKey,
  type ChatAdapter,
  type Message,
  type MockChatAdapterOptions,
} from '@core/index';
import { isChatStreamRequest, type ChatStreamSource } from './chat-stream';
import { SessionService } from './session-service';
import { SessionRequestConflictError, type SessionStorage } from './storage/session-storage';
import { guardStreamSource, RequestBudget } from './request-budget';
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
  GEMINI_RATE_LIMIT_COOLDOWN_MS?: string;
  CHAT_CONTEXT_INPUT_TOKENS?: string;
  CHAT_CONTEXT_HISTORY_TURNS?: string;
  CHAT_MAX_OUTPUT_TOKENS?: string;
  CHAT_COUNT_TIMEOUT_MS?: string;
  CHAT_GENERATION_FIRST_CHUNK_TIMEOUT_MS?: string;
  CHAT_GENERATION_TOTAL_TIMEOUT_MS?: string;
  CHAT_COUNTS_PER_MINUTE?: string;
  GEMINI_SYSTEM_INSTRUCTION?: string;
}

export interface ServerChatStreamSourceOptions {
  mockAdapterOptions?: MockChatAdapterOptions;
  sessionStorage?: SessionStorage;
  /** Production routes and stream source must share this service / lock. */
  sessionService?: SessionService;
  requestBudget?: RequestBudget;
}

/** 将任意共享 ChatAdapter 映射为服务端 SSE 流源。 */
export function createAdapterStreamSource(
  adapter: ChatAdapter,
  contextWindow = new ContextWindow(),
  generationTimeoutConfig: GenerationTimeoutConfig = DEFAULT_GENERATION_TIMEOUT_CONFIG,
): ChatStreamSource {
  return async function* adapterStreamSource(request, { signal }) {
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
): ChatStreamSource {
  return async function* sessionChatStreamSource(request, { signal }) {
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
      const state = await sessionService.inspectRequest(request.sessionId, request.messages[0]?.content ?? '', requestId);
      if (signal.aborted) return;
      if (state.response) {
        yield { event: 'done', data: { content: state.response.content, usage: state.response.usage } };
        return;
      }
      // On retry, the existing tail input belongs to this turn, not history.
      const inputs: Message[] = state.inputExists ? state.session.messages.slice(-1) :
        request.messages.map((message, index) => ({ ...message, id: requestId ?? `pending-${index}`, createdAt: 0 }));
      const history = state.inputExists ? state.session.messages.slice(0, -1) : state.session.messages;
      stage = 'count';
      const selected = await contextWindow.select(history, inputs, adapter, signal);
      if (signal.aborted) return;
      // Replay and rejected conflicts do not consume upstream model budget.
      const wait = requestBudget?.acquire();
      if (wait) {
        yield { event: 'error', data: { error: { code: 'RATE_LIMIT', message: `模型请求预算已满或暂时暂停，请等待 ${Math.ceil(wait / 1000)} 秒后再试。` } } };
        return;
      }
      stage = 'storage';
      if (!state.inputExists) await sessionService.appendTurnInputs(request.sessionId, request.messages, requestId);
      if (signal.aborted) return;
      stage = 'model';
      for await (const chunk of streamWithGenerationTimeout(adapter, selected,
        { signal, maxTokens: contextWindow.config.outputTokens }, generationTimeoutConfig)) {
        if (signal.aborted) return;
        if (chunk.done) {
          contextWindow.observe(selected, chunk.usage?.promptTokens);
          stage = 'storage';
          await sessionService.appendAssistantResponse(
            request.sessionId,
            chunk.accumulated,
            chunk.usage,
            requestId,
          );
          yield { event: 'done', data: { content: chunk.accumulated, usage: chunk.usage } };
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
  const contextWindow = new ContextWindow(contextConfig);
  const generationTimeoutConfig = readGenerationTimeoutConfig(environment, contextConfig.countTimeoutMs);
  const apiKey = sanitizeGeminiApiKey(environment.GEMINI_API_KEY);
  const adapter: ChatAdapter = apiKey
    ? new GeminiChatAdapter({ apiKey, systemInstruction: contextConfig.systemInstruction })
    : new MockChatAdapter(options.mockAdapterOptions);

  const budget = apiKey ? options.requestBudget ?? new RequestBudget({
    requestsPerMinute: environment.GEMINI_REQUESTS_PER_MINUTE === undefined ? undefined : Number(environment.GEMINI_REQUESTS_PER_MINUTE),
    cooldownMs: environment.GEMINI_RATE_LIMIT_COOLDOWN_MS === undefined ? undefined : Number(environment.GEMINI_RATE_LIMIT_COOLDOWN_MS),
  }) : undefined;
  if (options.sessionService || options.sessionStorage) {
    const service = options.sessionService ?? new SessionService(options.sessionStorage!);
    return createSessionChatStreamSource(adapter, service, budget, contextWindow, generationTimeoutConfig);
  }
  const source = createAdapterStreamSource(adapter, contextWindow, generationTimeoutConfig);
  return budget ? guardStreamSource(source, budget) : source;
}
