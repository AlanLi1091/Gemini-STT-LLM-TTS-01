import type { ResolveDiscordSessionRequest, ResolveDiscordSessionResponse } from '@gemini-chat/core';
import type { BotInput } from './message-entry';

export class BackendError extends Error {
  constructor(message: string) { super(message); this.name = 'BackendError'; }
}

export function validateBackendUrl(value = 'http://127.0.0.1:3001'): string {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new BackendError('Bot 后端地址必须是无凭据的本机 HTTP 地址。');
  }
  return url.origin;
}

function errorMessage(code: unknown): string {
  if (code === 'RATE_LIMIT') return '模型请求达到限额，请稍后再试。';
  if (code === 'AUTH_ERROR') return '模型服务鉴权失败，请检查服务端配置。';
  if (code === 'ABORTED') return '本次请求已取消。';
  return '后端对话失败，请检查服务状态后再试。';
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

  async chat(input: BotInput, signal?: AbortSignal): Promise<string> {
    if (signal?.aborted) throw new BackendError('本次请求已取消。');
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, this.timeoutMs);
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    const cancelReader = () => { void reader?.cancel().catch(() => {}); };
    controller.signal.addEventListener('abort', cancelReader);
    const post = async (path: string, body: unknown, accept: string) => {
      if (controller.signal.aborted) throw new BackendError('本次请求已取消。');
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: accept },
        body: JSON.stringify(body), signal: controller.signal, redirect: 'error',
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new BackendError(response.status === 429 ? errorMessage('RATE_LIMIT') : errorMessage(undefined));
      }
      return response;
    };
    try {
      const request: ResolveDiscordSessionRequest = { guildId: input.guildId, channelId: input.channelId };
      const resolved = await post('/api/discord/sessions/resolve', request, 'application/json');
      const value = await resolved.json() as Partial<ResolveDiscordSessionResponse>;
      if (!value || typeof value.sessionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.sessionId)) {
        throw new BackendError('后端会话解析响应无效。');
      }
      const response = await post('/api/chat/stream', {
        sessionId: value.sessionId, messages: [{ role: 'user', content: input.content }],
      }, 'text/event-stream');
      if (!response.body) throw new BackendError('后端返回了空的对话流。');
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = '';
      while (true) {
        const { value: bytes, done } = await reader.read();
        if (controller.signal.aborted) throw new BackendError('本次请求已取消。');
        pending += decoder.decode(bytes, { stream: !done });
        if (pending.length > 1048576) throw new BackendError('后端对话数据过大。');
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
          catch { throw new BackendError('后端对话格式无效。'); }
          if (!parsed || typeof parsed !== 'object') throw new BackendError('后端对话格式无效。');
          const frame = parsed as { content?: unknown; error?: { code?: unknown }; delta?: unknown; accumulated?: unknown };
          if (event === 'error') throw new BackendError(errorMessage(frame.error?.code));
          if (event === 'chunk') {
            if (typeof frame.delta !== 'string' || typeof frame.accumulated !== 'string') throw new BackendError('后端对话格式无效。');
            continue;
          }
          if (typeof frame.content !== 'string' || !frame.content.trim()) throw new BackendError('后端未返回有效的最终回复。');
          return frame.content;
        }
        if (done) throw new BackendError('对话连接提前结束，未收到完整回复；本次请求未自动重发。');
      }
    } catch (error) {
      if (timedOut) throw new BackendError('对话请求超时，请检查后端服务。');
      if (signal?.aborted) throw new BackendError('本次请求已取消。');
      if (error instanceof BackendError) throw error;
      throw new BackendError('无法连接后端，请检查服务是否运行。');
    } finally {
      clearTimeout(timer); signal?.removeEventListener('abort', abort);
      controller.signal.removeEventListener('abort', cancelReader);
      if (reader) { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    }
  }
}
