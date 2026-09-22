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
import { SessionNotFoundError, type SessionStorage } from './storage/session-storage';

export interface ServerChatEnvironment {
  GEMINI_API_KEY?: string;
}

export interface ServerChatStreamSourceOptions {
  mockAdapterOptions?: MockChatAdapterOptions;
  sessionStorage?: SessionStorage;
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
): ChatStreamSource {
  const statelessSource = createAdapterStreamSource(adapter);

  return async function* sessionChatStreamSource(request, { signal }) {
    if (!request.sessionId) {
      yield* statelessSource(request, { signal });
      return;
    }

    try {
      const session = await sessionService.appendTurnInputs(request.sessionId, request.messages);
      for await (const chunk of adapter.stream(session.messages, { signal })) {
        if (chunk.done) {
          await sessionService.appendAssistantResponse(
            request.sessionId,
            chunk.accumulated,
            chunk.usage,
          );
          yield { event: 'done', data: { content: chunk.accumulated, usage: chunk.usage } };
          return;
        }
        yield {
          event: 'chunk',
          data: { delta: chunk.delta, accumulated: chunk.accumulated },
        };
      }
    } catch (error) {
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
      yield {
        event: 'error',
        data: { error: { code: chatError.code, message: chatError.message } },
      };
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

  return options.sessionStorage
    ? createSessionChatStreamSource(adapter, new SessionService(options.sessionStorage))
    : createAdapterStreamSource(adapter);
}
