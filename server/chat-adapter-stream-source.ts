import {
  GeminiChatAdapter,
  MockChatAdapter,
  classifyGeminiError,
  sanitizeGeminiApiKey,
  type ChatAdapter,
  type Message,
  type MockChatAdapterOptions,
} from '@core/index';
import type { ChatStreamSource } from './chat-stream';
import { SessionArchivedError, SessionService } from './session-service';
import { SessionNotFoundError, SessionRequestConflictError, type SessionStorage } from './storage/session-storage';
import { guardStreamSource, RequestBudget } from './request-budget';

export interface ServerChatEnvironment {
  GEMINI_API_KEY?: string;
  GEMINI_REQUESTS_PER_MINUTE?: string;
  GEMINI_RATE_LIMIT_COOLDOWN_MS?: string;
}

export interface ServerChatStreamSourceOptions {
  mockAdapterOptions?: MockChatAdapterOptions;
  sessionStorage?: SessionStorage;
  requestBudget?: RequestBudget;
}

/** 将任意共享 ChatAdapter 映射为服务端 SSE 流源。 */
export function createAdapterStreamSource(adapter: ChatAdapter): ChatStreamSource {
  return async function* adapterStreamSource(request, { signal }) {
    const messages: Message[] = request.messages.map((message, index) => ({
      id: `request-${index}`,
      role: message.role,
      content: message.content,
      createdAt: 0,
    }));

    try {
      for await (const chunk of adapter.stream(messages, { signal })) {
        if (chunk.done) {
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
      const chatError = classifyGeminiError(error, signal);
      yield {
        event: 'error',
        data: {
          error: {
            code: chatError.code,
            message: chatError.message,
          },
        },
      };
    }
  };
}

/**
 * Adds Task 14 session addressing to an adapter source. In session mode,
 * request messages are this turn's inputs and the adapter receives the full
 * persisted history. Omitting sessionId preserves Task 13's stateless mode.
 */
export function createSessionChatStreamSource(
  adapter: ChatAdapter,
  sessionService: SessionService,
  requestBudget?: RequestBudget,
): ChatStreamSource {
  const adapterSource = createAdapterStreamSource(adapter);
  const statelessSource = requestBudget ? guardStreamSource(adapterSource, requestBudget) : adapterSource;

  return async function* sessionChatStreamSource(request, { signal }) {
    if (signal.aborted) return;
    if (!request.sessionId) {
      yield* statelessSource(request, { signal });
      return;
    }

    const release = sessionService.tryAcquireRequest(request.sessionId);
    if (!release) {
      yield { event: 'error', data: { error: { code: 'REQUEST_CONFLICT', message: new SessionRequestConflictError().message } } };
      return;
    }
    try {
      const requestId = request.requestId?.toLowerCase();
      const state = await sessionService.inspectRequest(request.sessionId, request.messages[0]?.content ?? '', requestId);
      if (signal.aborted) return;
      if (state.response) {
        yield { event: 'done', data: { content: state.response.content, usage: state.response.usage } };
        return;
      }
      // Replay and rejected conflicts do not consume upstream model budget.
      const wait = requestBudget?.acquire();
      if (wait) {
        yield { event: 'error', data: { error: { code: 'RATE_LIMIT', message: `模型请求预算已满或暂时暂停，请等待 ${Math.ceil(wait / 1000)} 秒后再试。` } } };
        return;
      }
      const session = state.inputExists ? state.session :
        await sessionService.appendTurnInputs(request.sessionId, request.messages, requestId);
      if (signal.aborted) return;
      for await (const chunk of adapter.stream(session.messages, { signal })) {
        if (signal.aborted) return;
        if (chunk.done) {
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
      if (error instanceof SessionRequestConflictError) {
        yield { event: 'error', data: { error: { code: 'REQUEST_CONFLICT', message: error.message } } };
        return;
      }
      if (error instanceof SessionNotFoundError) {
        yield {
          event: 'error',
          data: { error: { code: 'UNKNOWN', message: 'Chat session was not found.' } },
        };
        return;
      }
      if (error instanceof SessionArchivedError) {
        yield {
          event: 'error',
          data: { error: { code: 'UNKNOWN', message: 'Chat session is archived.' } },
        };
        return;
      }

      const chatError = classifyGeminiError(error, signal);
      if (chatError.code === 'RATE_LIMIT') requestBudget?.pause();
      yield {
        event: 'error',
        data: { error: { code: chatError.code, message: chatError.message } },
      };
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
  const apiKey = sanitizeGeminiApiKey(environment.GEMINI_API_KEY);
  const adapter: ChatAdapter = apiKey
    ? new GeminiChatAdapter({ apiKey })
    : new MockChatAdapter(options.mockAdapterOptions);

  const budget = apiKey ? options.requestBudget ?? new RequestBudget({
    requestsPerMinute: environment.GEMINI_REQUESTS_PER_MINUTE === undefined ? undefined : Number(environment.GEMINI_REQUESTS_PER_MINUTE),
    cooldownMs: environment.GEMINI_RATE_LIMIT_COOLDOWN_MS === undefined ? undefined : Number(environment.GEMINI_RATE_LIMIT_COOLDOWN_MS),
  }) : undefined;
  if (options.sessionStorage) {
    return createSessionChatStreamSource(adapter, new SessionService(options.sessionStorage), budget);
  }
  const source = createAdapterStreamSource(adapter);
  return budget ? guardStreamSource(source, budget) : source;
}
