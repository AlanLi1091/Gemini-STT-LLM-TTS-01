import {
  CHAT_ERROR_CODES,
  ChatError,
  type ChatAdapter,
  type ChatAdapterOptions,
  type ChatChunk,
  type ChatErrorCode,
  type ChatResponse,
  type ChatUsage,
  type Message,
} from '@core/index';

export interface RemoteChatAdapterConfig {
  /** 服务端地址；省略时请求同源的 /api/chat/stream。 */
  baseUrl?: string;
}

interface ParsedSseEvent {
  event: string;
  data: unknown;
}

function isChatErrorCode(value: unknown): value is ChatErrorCode {
  return typeof value === 'string' && (CHAT_ERROR_CODES as readonly string[]).includes(value);
}

function normalizeBaseUrl(baseUrl: string | undefined): string {
  return (baseUrl || '').replace(/\/$/, '');
}

function createHttpError(response: Response): ChatError {
  const code: ChatErrorCode =
    response.status === 401 || response.status === 403
      ? 'AUTH_ERROR'
      : response.status === 429
        ? 'RATE_LIMIT'
        : response.status >= 500
          ? 'MODEL_ERROR'
          : 'UNKNOWN';

  return new ChatError(`Chat service request failed (${response.status}).`, code, {
    status: response.status,
  });
}

function createTransportError(error: unknown, signal?: AbortSignal): ChatError {
  if (error instanceof ChatError) return error;

  if (signal?.aborted || (error as { name?: string })?.name === 'AbortError') {
    return new ChatError('The operation was aborted.', 'ABORTED', { originalError: error });
  }

  if (error instanceof TypeError) {
    return new ChatError(error.message, 'NETWORK_ERROR', { originalError: error });
  }

  return new ChatError(error instanceof Error ? error.message : String(error), 'UNKNOWN', {
    originalError: error,
  });
}

function parseSseBlock(block: string): ParsedSseEvent | undefined {
  const lines = block.replace(/\r/g, '').split('\n');
  let event = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event:')) event = line.slice('event:'.length).trim();
    if (line.startsWith('data:')) dataLines.push(line.slice('data:'.length).trimStart());
  }

  if (dataLines.length === 0) return undefined;

  try {
    return { event, data: JSON.parse(dataLines.join('\n')) };
  } catch (error) {
    throw new ChatError('Chat service returned malformed SSE data.', 'UNKNOWN', {
      originalError: error,
    });
  }
}

/** 通过 Task 12 的无状态 SSE 接口访问服务端 ChatAdapter。 */
export class RemoteChatAdapter implements ChatAdapter {
  readonly id = 'remote-chat';
  readonly name = 'Backend Chat Service';
  private readonly endpoint: string;

  constructor(config: RemoteChatAdapterConfig = {}) {
    this.endpoint = `${normalizeBaseUrl(config.baseUrl)}/api/chat/stream`;
  }

  async send(messages: Message[], options: ChatAdapterOptions = {}): Promise<ChatResponse> {
    let content = '';
    let usage: ChatUsage | undefined;

    for await (const chunk of this.stream(messages, options)) {
      content = chunk.accumulated;
      if (chunk.done) usage = chunk.usage;
    }

    return { content, usage };
  }

  async *stream(
    messages: Message[],
    options: ChatAdapterOptions = {},
  ): AsyncIterable<ChatChunk> {
    const { signal } = options;
    if (signal?.aborted) throw new ChatError('The operation was aborted.', 'ABORTED');

    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({
          messages: messages.map(({ role, content }) => ({ role, content })),
        }),
        signal,
      });
    } catch (error) {
      throw createTransportError(error, signal);
    }

    if (!response.ok) throw createHttpError(response);
    if (!response.body) {
      throw new ChatError('Chat service returned an empty response body.', 'NETWORK_ERROR');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = '';

    try {
      while (true) {
        if (signal?.aborted) throw new ChatError('The operation was aborted.', 'ABORTED');

        const { value, done } = await reader.read();
        pending += decoder.decode(value, { stream: !done });

        let separatorIndex = pending.indexOf('\n\n');
        while (separatorIndex !== -1) {
          const parsed = parseSseBlock(pending.slice(0, separatorIndex));
          pending = pending.slice(separatorIndex + 2);
          separatorIndex = pending.indexOf('\n\n');
          if (!parsed) continue;

          if (parsed.event === 'chunk') {
            const data = parsed.data as { delta?: unknown; accumulated?: unknown };
            if (typeof data.delta !== 'string' || typeof data.accumulated !== 'string') {
              throw new ChatError('Chat service returned an invalid chunk event.', 'UNKNOWN');
            }
            yield { delta: data.delta, accumulated: data.accumulated, done: false };
          } else if (parsed.event === 'done') {
            const data = parsed.data as { content?: unknown; usage?: ChatUsage };
            if (typeof data.content !== 'string') {
              throw new ChatError('Chat service returned an invalid done event.', 'UNKNOWN');
            }
            yield { delta: '', accumulated: data.content, usage: data.usage, done: true };
            return;
          } else if (parsed.event === 'error') {
            const error = (parsed.data as { error?: { code?: unknown; message?: unknown } }).error;
            throw new ChatError(
              typeof error?.message === 'string' ? error.message : 'Chat service failed.',
              isChatErrorCode(error?.code) ? error.code : 'UNKNOWN',
            );
          }
        }

        if (done) break;
      }

      throw new ChatError('Chat service stream ended before a done event.', 'UNKNOWN');
    } catch (error) {
      throw createTransportError(error, signal);
    } finally {
      reader.releaseLock();
    }
  }
}
