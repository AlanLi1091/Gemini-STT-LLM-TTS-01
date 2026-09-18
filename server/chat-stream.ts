import type { RequestHandler } from 'express';
import {
  SSE_DEFAULT_HEARTBEAT_MS,
  SSE_SUPPORTS_RESUMPTION,
  type ChatSseEvent,
  type ChatStreamRequest,
} from '@core/index';

export interface ChatStreamSourceOptions {
  signal: AbortSignal;
}

export type ChatStreamSource = (
  request: ChatStreamRequest,
  options: ChatStreamSourceOptions,
) => AsyncIterable<ChatSseEvent>;

export interface ChatStreamHandlerOptions {
  source?: ChatStreamSource;
  heartbeatIntervalMs?: number;
}

function isChatStreamRequest(value: unknown): value is ChatStreamRequest {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<ChatStreamRequest>;
  if (!Array.isArray(candidate.messages)) return false;
  if (candidate.sessionId !== undefined && typeof candidate.sessionId !== 'string') return false;

  return candidate.messages.every(
    (message) =>
      !!message &&
      typeof message === 'object' &&
      (message.role === 'user' || message.role === 'assistant' || message.role === 'system') &&
      typeof message.content === 'string',
  );
}

function serializeSseEvent(event: ChatSseEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

export function createChatStreamHandler(options: ChatStreamHandlerOptions): RequestHandler {
  const heartbeatIntervalMs = options.heartbeatIntervalMs ?? SSE_DEFAULT_HEARTBEAT_MS;

  return async (req, res) => {
    if (req.get('Last-Event-ID')) {
      res.status(409).json({ error: 'SSE resume is not supported' });
      return;
    }

    if (!isChatStreamRequest(req.body)) {
      res.status(400).json({ error: 'Invalid chat stream request' });
      return;
    }

    if (!options.source) {
      res.status(503).json({ error: 'Chat stream source is not configured' });
      return;
    }

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('X-SSE-Resumable', String(SSE_SUPPORTS_RESUMPTION));
    res.flushHeaders();

    const upstreamController = new AbortController();
    const abortUpstream = () => {
      if (!res.writableEnded) upstreamController.abort();
    };
    res.once('close', abortUpstream);

    const heartbeat = setInterval(() => {
      if (!res.destroyed && !res.writableEnded) res.write(': ping\n\n');
    }, heartbeatIntervalMs);
    heartbeat.unref();

    try {
      const stream = options.source(req.body, { signal: upstreamController.signal });

      for await (const event of stream) {
        if (upstreamController.signal.aborted || res.destroyed) break;

        res.write(serializeSseEvent(event));
        if (event.event === 'done' || event.event === 'error') break;
      }
    } catch {
      if (!upstreamController.signal.aborted && !res.destroyed) {
        const errorEvent: ChatSseEvent = {
          event: 'error',
          data: {
            error: {
              code: 'UNKNOWN',
              message: 'Chat stream failed.',
            },
          },
        };
        res.write(serializeSseEvent(errorEvent));
      }
    } finally {
      clearInterval(heartbeat);
      res.off('close', abortUpstream);
      if (!res.destroyed && !res.writableEnded) res.end();
    }
  };
}
