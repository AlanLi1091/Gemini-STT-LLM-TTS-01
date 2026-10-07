import type { ResolveDiscordSessionRequest, ResolveDiscordSessionResponse, ResetDiscordSessionRequest, ResetDiscordSessionResponse } from '@gemini-chat/core';
import type { BotInput } from './message-entry';

import { BackendError, describeFailure, type FailureKind } from './errors';
export { BackendError } from './errors';

export function validateBackendUrl(value = 'http://127.0.0.1:3001'): string {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new BackendError('Bot 后端地址必须是无凭据的本机 HTTP 地址。');
  }
  return url.origin;
}

function errorMessage(code: unknown): string {
  return describeFailure(new BackendError('', errorKind(code))).message;
}
function errorKind(code: unknown): FailureKind {
  return ['RATE_LIMIT', 'AUTH_ERROR', 'ABORTED', 'NETWORK_ERROR', 'MODEL_ERROR', 'CONTEXT_LIMIT', 'REQUEST_CONFLICT'].includes(String(code)) ? code as FailureKind : 'BACKEND';
}

export class BackendClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;
  constructor(options: { baseUrl?: string; fetch?: typeof fetch; timeoutMs?: number } = {}) {
    this.baseUrl = validateBackendUrl(options.baseUrl);
    this.fetcher = options.fetch ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 120000;
    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) throw new BackendError('无效的后端超时配置。');
  }

  async reset(input: BotInput, signal?: AbortSignal): Promise<string> {
    if (signal?.aborted) throw new BackendError('本次请求已取消。', 'ABORTED');
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    let timedOut = false;
    let response: Response | undefined;
    let cancel!: () => void;
    const cancelled = new Promise<never>((_, reject) => {
      cancel = () => {
        void response?.body?.cancel().catch(() => {});
        reject(new BackendError('本次请求已取消。', 'ABORTED'));
      };
      controller.signal.addEventListener('abort', cancel, { once: true });
    });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, this.timeoutMs);
    const uuid = (value: unknown): value is string => typeof value === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    const post = async (path: string, body: unknown) => {
      if (controller.signal.aborted) throw new BackendError('本次请求已取消。', 'ABORTED');
      response = await this.fetcher(`${this.baseUrl}${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body), signal: controller.signal, redirect: 'error',
      });
      if (!response.ok) {
        await response.body?.cancel();
        const kind: FailureKind = response.status === 409 ? 'REQUEST_CONFLICT' : response.status === 429 ? 'RATE_LIMIT' :
          [401, 403].includes(response.status) ? 'AUTH_ERROR' : 'BACKEND';
        throw new BackendError(errorMessage(kind), kind);
      }
      try { return await response.json() as unknown; }
      catch { throw new BackendError('后端会话重置响应无效。', 'PROTOCOL'); }
    };
    const perform = async () => {
      const channel: ResolveDiscordSessionRequest = { guildId: input.guildId, channelId: input.channelId };
      const value = await post('/api/discord/sessions/resolve', channel) as Partial<ResolveDiscordSessionResponse> | null;
      if (!value || !uuid(value.sessionId)) throw new BackendError('后端会话解析响应无效。', 'PROTOCOL');
      const request: ResetDiscordSessionRequest = { ...channel, sessionId: value.sessionId };
      const result = await post('/api/discord/sessions/reset', request) as Partial<ResetDiscordSessionResponse> | null;
      if (!result || !uuid(result.sessionId) || result.archivedSessionId !== request.sessionId || result.sessionId === request.sessionId) {
        throw new BackendError('后端会话重置响应无效。', 'PROTOCOL');
      }
      if (controller.signal.aborted) throw new BackendError('本次请求已取消。', 'ABORTED');
      return '频道会话已重置。下一条消息将使用新会话。';
    };
    try {
      if (signal?.aborted) controller.abort();
      return await Promise.race([perform(), cancelled]);
    } catch (error) {
      if (timedOut) throw new BackendError('会话重置请求超时，请稍后检查频道状态。', 'TIMEOUT', 'reset');
      if (controller.signal.aborted) throw new BackendError('本次请求已取消。', 'ABORTED', 'reset');
      if (error instanceof BackendError) throw new BackendError(error.message, error.kind, 'reset');
      throw new BackendError('无法连接后端，请检查服务和网络后再试。', 'NETWORK_ERROR', 'reset');
    } finally {
      clearTimeout(timer); signal?.removeEventListener('abort', abort);
      controller.signal.removeEventListener('abort', cancel);
    }
  }

  async chat(input: BotInput, signal?: AbortSignal): Promise<string> {
    if (signal?.aborted) throw new BackendError('本次请求已取消。', 'ABORTED');
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, this.timeoutMs);
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    const cancelReader = () => { void reader?.cancel().catch(() => {}); };
    controller.signal.addEventListener('abort', cancelReader);
    const post = async (path: string, body: unknown, accept: string) => {
      if (controller.signal.aborted) throw new BackendError('本次请求已取消。', 'ABORTED');
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: accept },
        body: JSON.stringify(body), signal: controller.signal, redirect: 'error',
      });
      if (!response.ok) {
        await response.body?.cancel();
        const code = response.status === 409 ? 'REQUEST_CONFLICT' : response.status === 429 ? 'RATE_LIMIT' : [401, 403].includes(response.status) ? 'AUTH_ERROR' : 'BACKEND';
        throw new BackendError(errorMessage(code), code);
      }
      return response;
    };
    try {
      const request: ResolveDiscordSessionRequest = { guildId: input.guildId, channelId: input.channelId };
      const resolved = await post('/api/discord/sessions/resolve', request, 'application/json');
      const value = await resolved.json() as Partial<ResolveDiscordSessionResponse>;
      if (!value || typeof value.sessionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.sessionId)) {
        throw new BackendError('后端会话解析响应无效。', 'PROTOCOL');
      }
      const response = await post('/api/chat/stream', {
        sessionId: value.sessionId, messages: [{ role: 'user', content: input.content }],
      }, 'text/event-stream');
      if (!response.body) throw new BackendError('后端返回了空的对话流。', 'PROTOCOL');
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = '';
      while (true) {
        const { value: bytes, done } = await reader.read();
        if (controller.signal.aborted) throw new BackendError('本次请求已取消。', 'ABORTED');
        pending += decoder.decode(bytes, { stream: !done });
        if (pending.length > 1048576) throw new BackendError('后端对话数据过大。', 'PROTOCOL');
        let separator: RegExpExecArray | null;
        while ((separator = /\r?\n\r?\n/.exec(pending))) {
          const block = pending.slice(0, separator.index);
          pending = pending.slice(separator.index + separator[0].length);
          const lines = block.split(/\r?\n/);
          const event = lines.find(line => line.startsWith('event:'))?.slice(6).trim();
          const data = lines.filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
          if (!data || (event !== 'done' && event !== 'error' && event !== 'chunk')) continue;
          let parsed: unknown;
          try { parsed = JSON.parse(data); }
          catch { throw new BackendError('后端对话格式无效。', 'PROTOCOL'); }
          if (!parsed || typeof parsed !== 'object') throw new BackendError('后端对话格式无效。', 'PROTOCOL');
          const frame = parsed as { content?: unknown; error?: { code?: unknown }; delta?: unknown; accumulated?: unknown };
          if (event === 'error') throw new BackendError(errorMessage(frame.error?.code), errorKind(frame.error?.code));
          if (event === 'chunk') {
            if (typeof frame.delta !== 'string' || typeof frame.accumulated !== 'string') throw new BackendError('后端对话格式无效。', 'PROTOCOL');
            continue;
          }
          if (typeof frame.content !== 'string' || !frame.content.trim()) throw new BackendError('后端未返回有效的最终回复。', 'PROTOCOL');
          return frame.content;
        }
        if (done) throw new BackendError('对话连接提前结束，未收到完整回复；本次请求未自动重发。', 'PROTOCOL');
      }
    } catch (error) {
      if (timedOut) throw new BackendError('对话请求超时，请检查后端服务。', 'TIMEOUT');
      if (signal?.aborted) throw new BackendError('本次请求已取消。', 'ABORTED');
      if (error instanceof BackendError) throw error;
      throw new BackendError('无法连接后端，请检查服务是否运行。', 'NETWORK_ERROR');
    } finally {
      clearTimeout(timer); signal?.removeEventListener('abort', abort);
      controller.signal.removeEventListener('abort', cancelReader);
      if (reader) { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    }
  }
}
