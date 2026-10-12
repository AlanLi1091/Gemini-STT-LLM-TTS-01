// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ChatError, type ChatAdapter, type ChatSseEvent, type ChatStreamRequest } from '@core/index';
import { createAdapterStreamSource, createSessionChatStreamSource } from '../chat-adapter-stream-source';
import type { ChatStreamSource } from '../chat-stream';
import { JsonSessionStorage } from '../storage/json-session-storage';
import { SessionService } from '../session-service';
import { SessionRequestConflictError } from '../storage/session-storage';
import { ContextWindow } from '../context-window';
import { RequestBudget } from '../request-budget';
import { logChatFailure } from '../chat-errors';

const secret = 'AIzaFAKE_TEST_SECRET_DO_NOT_USE';
const raw = `Consumer api_key:${secret} https://example.test/?key=${secret}&token=private /var/lib/gemini-chat/private.json.tmp`;
const storageMessage = '会话读取或保存失败，请稍后重试。';
const modelMessage = '模型生成失败，请稍后重试。';
const unknownMessage = '服务暂时不可用，请稍后重试。';
const input = (sessionId?: string): ChatStreamRequest => ({ sessionId,
  requestId: sessionId ? '11111111-1111-4111-8111-111111111111' : undefined,
  messages: [{ role: 'user', content: 'private-user-body' }],
});
async function collect(source: ChatStreamSource, request: ChatStreamRequest) {
  const events: ChatSseEvent[] = [];
  for await (const event of source(request, { signal: new AbortController().signal })) events.push(event);
  return events;
}
const failure = (code: string, message: string) => ({ event: 'error', data: { error: { code, message } } });
function adapter(error?: unknown): ChatAdapter {
  return { id: 'fixture', name: 'Fixture', send: async () => ({ content: 'private-model-body' }),
    stream: vi.fn(async function* () {
      if (error !== undefined) throw error;
      yield { delta: 'private-model-body', accumulated: 'private-model-body', done: false };
      yield { delta: '', accumulated: 'private-model-body', done: true };
    }),
  };
}
let directory: string;
let storage: JsonSessionStorage;
let service: SessionService;
let sessionId: string;
beforeEach(async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  directory = await mkdtemp(join(tmpdir(), 'p13-error-safety-'));
  storage = new JsonSessionStorage(directory); service = new SessionService(storage);
  sessionId = (await service.createSession()).id;
});
afterEach(async () => { await rm(directory, { recursive: true }); vi.restoreAllMocks(); });

describe('P1-3: 服务端错误安全边界', () => {
  it('非法会话 ID ../x 返回存储 UNKNOWN 且不泄露原文', async () => {
    const model = adapter();
    expect(await collect(createSessionChatStreamSource(model, service), input('../x'))).toEqual([failure('UNKNOWN', storageMessage)]);
    expect(model.stream).not.toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain('../x');
  });
  it('损坏会话 JSON 返回存储 UNKNOWN 且不泄露路径', async () => {
    await writeFile(join(directory, `${sessionId}.json`), JSON.stringify({ id: sessionId, messages: 'broken' }));
    const model = adapter();
    expect(await collect(createSessionChatStreamSource(model, service), input(sessionId))).toEqual([failure('UNKNOWN', storageMessage)]);
    expect(model.stream).not.toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain(directory);
  });
  it.each(['appendTurnInputs', 'appendAssistantResponse'] as const)('%s ENOSPC 使用固定文案且不发送 done', async method => {
    vi.spyOn(service, method).mockRejectedValueOnce(Object.assign(new Error(`ENOSPC ${raw}`), { code: 'ENOSPC' }));
    const model = adapter();
    const events = await collect(createSessionChatStreamSource(model, service), input(sessionId));
    expect(events.at(-1)).toEqual(failure('UNKNOWN', storageMessage));
    expect(events.some(event => event.event === 'done')).toBe(false);
    expect(JSON.stringify(events)).not.toContain(secret);
    expect(vi.mocked(console.warn).mock.calls).toEqual([[JSON.stringify({ stage: 'storage', code: 'UNKNOWN', name: 'Error', errno: 'ENOSPC' })]]);
    const saved = (await storage.getSession(sessionId))!.messages;
    expect(saved.map(m => m.role)).toEqual(method === 'appendTurnInputs' ? [] : ['user']);
    if (method === 'appendTurnInputs') expect(model.stream).not.toHaveBeenCalled();
    else expect(events[0].event).toBe('chunk');
    // Failure releases the lock and a stable requestId retry still completes.
    expect((await collect(createSessionChatStreamSource(model, service), input(sessionId))).at(-1)?.event).toBe('done');
    expect((await storage.getSession(sessionId))!.messages.map(m => m.role)).toEqual(['user', 'assistant']);
  });
  it('存储阶段即使异常携带 429 或网络特征也不进入模型分类或暂停预算', async () => {
    const budget = new RequestBudget(); const pause = vi.spyOn(budget, 'pause');
    vi.spyOn(service, 'inspectRequest').mockRejectedValueOnce(Object.assign(new TypeError(`network error ${raw}`), { status: 429 }));
    expect(await collect(createSessionChatStreamSource(adapter(), service, budget), input(sessionId))).toEqual([failure('UNKNOWN', storageMessage)]);
    expect(pause).not.toHaveBeenCalled();
  });
  it.each([
    [403, 'AUTH_ERROR', '模型服务鉴权失败，请检查服务端配置。'],
    [429, 'RATE_LIMIT', '模型请求达到限额，请稍后重试。'],
    [500, 'MODEL_ERROR', modelMessage],
    [undefined, 'UNKNOWN', unknownMessage],
  ])('上游状态 %s 在两种流源中均使用固定文案和白名单日志', async (status, code, message) => {
    const error = Object.assign(new Error(raw), { status });
    for (const source of [createAdapterStreamSource(adapter(error)), createSessionChatStreamSource(adapter(error), service)]) {
      const events = await collect(source, input(sessionId));
      expect(events).toEqual([failure(code!, message!)]);
    }
    const logs = vi.mocked(console.warn).mock.calls;
    expect(logs).toHaveLength(2);
    for (const [record] of logs) expect(JSON.parse(record as string)).toEqual({ stage: 'model', code, name: 'Error', ...(status ? { status } : {}) });
    expect(JSON.stringify(logs)).not.toContain(secret);
    expect(JSON.stringify(logs)).not.toContain('/var/lib');
  });
  it('上游 429 固定文案仍触发模型预算 pause', async () => {
    const budget = new RequestBudget(); const pause = vi.spyOn(budget, 'pause');
    expect(await collect(createSessionChatStreamSource(adapter({ status: 429, message: raw }), service, budget), input(sessionId))).toEqual([failure('RATE_LIMIT', '模型请求达到限额，请稍后重试。')]);
    expect(pause).toHaveBeenCalledOnce(); expect(budget.acquire()).toBeGreaterThan(0);
  });
  it('fetch failed ECONNREFUSED cause 保留 NETWORK_ERROR 和安全 errno', async () => {
    const error = new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED', message: raw } });
    expect(await collect(createSessionChatStreamSource(adapter(error), service), input(sessionId))).toEqual([failure('NETWORK_ERROR', '网络连接失败，请稍后重试。')]);
    expect(vi.mocked(console.warn).mock.calls).toEqual([[JSON.stringify({ stage: 'model', code: 'NETWORK_ERROR', name: 'TypeError', errno: 'ECONNREFUSED' })]]);
  });
  it.each(['MODEL_ERROR', 'UNKNOWN', 'REQUEST_CONFLICT', 'CONTEXT_LIMIT'] as const)('任意适配器 ChatError %s 文本也不能直接下发', async code => {
    const messages = { MODEL_ERROR: modelMessage, UNKNOWN: unknownMessage,
      REQUEST_CONFLICT: new SessionRequestConflictError().message,
      CONTEXT_LIMIT: '本轮输入超过上下文预算，请缩短内容后重新发送。' };
    expect(await collect(createAdapterStreamSource(adapter(new ChatError(raw, code))), input())).toEqual([failure(code, messages[code])]);
  });
  it('会话不存在和已归档的现有固定文案保持不变', async () => {
    const source = createSessionChatStreamSource(adapter(), service);
    expect(await collect(source, input('missing'))).toEqual([failure('UNKNOWN', 'Chat session was not found.')]);
    await service.archiveSession(sessionId);
    expect(await collect(source, input(sessionId))).toEqual([failure('UNKNOWN', 'Chat session is archived.')]);
  });
  it('锁冲突和上下文超限保持现有固定文案', async () => {
    const release = service.tryAcquireRequest(sessionId)!;
    expect(await collect(createSessionChatStreamSource(adapter(), service), input(sessionId))).toEqual([failure('REQUEST_CONFLICT', new SessionRequestConflictError().message)]);
    release();
    const request = input(sessionId); request.messages[0].content = 'x'.repeat(40000);
    expect(await collect(createSessionChatStreamSource(adapter(), service, undefined, new ContextWindow()), request)).toEqual([failure('CONTEXT_LIMIT', '本轮输入超过上下文预算，请缩短内容后重新发送。')]);
  });
  it('日志拒绝异常 name errno status 中的敏感字符串且不展开 stack 或正文', () => {
    const log = vi.fn();
    logChatFailure({ name: raw, code: raw, status: raw, message: raw, stack: raw, input: raw }, 'model', 'UNKNOWN', log);
    expect(log.mock.calls).toEqual([[JSON.stringify({ stage: 'model', code: 'UNKNOWN', name: 'Error' })]]);
    logChatFailure(new ChatError(raw, 'AUTH_ERROR', { status: 403, originalError: Object.assign(new TypeError(raw), { code: 'ENOSPC' }) }), 'count', 'AUTH_ERROR', log);
    expect(JSON.parse(log.mock.calls[1][0])).toEqual({ stage: 'count', code: 'AUTH_ERROR', name: 'TypeError', errno: 'ENOSPC', status: 403 });
  });
});


describe('K1: 空 done 纵深防御与安全日志', () => {
  const emptyMessage = '模型未返回有效正文，请稍后重新提问。';
  it('其他 adapter 的空白 done 在两种流源中均失败且同标识可重试', async () => {
    for (const content of ['', ' \n\t ']) {
      const id = (await service.createSession()).id;
      const model = adapter();
      model.stream = vi.fn(async function* () { yield { delta: '', accumulated: content, done: true, usage: { promptTokens: 90000 } }; });
      const append = vi.spyOn(service, 'appendAssistantResponse');
      const window = new ContextWindow(); const observe = vi.spyOn(window, 'observe');
      const source = createSessionChatStreamSource(model, service, undefined, window);
      expect(await collect(source, input(id))).toEqual([failure('MODEL_ERROR', emptyMessage)]);
      expect(await collect(createAdapterStreamSource(model, window), input())).toEqual([failure('MODEL_ERROR', emptyMessage)]);
      expect(append).not.toHaveBeenCalled(); expect(observe).not.toHaveBeenCalled();
      expect((await storage.getSession(id))!.messages.map(m => m.role)).toEqual(['user']);
      const release = service.tryAcquireRequest(id); expect(release).toBeTypeOf('function'); release!();
      model.stream = vi.fn(async function* () { yield { delta: '', accumulated: 'ok', done: true }; });
      expect(await collect(source, input(id))).toEqual([{ event: 'done', data: { content: 'ok', usage: undefined } }]);
      expect((await storage.getSession(id))!.messages.map(m => m.role)).toEqual(['user', 'assistant']);
      append.mockRestore();
    }
  });
  it('新固定提示精确下发而带原始文本的变体仍脱敏', async () => {
    const { safeStreamError } = await import('../chat-errors');
    expect(safeStreamError(new ChatError(emptyMessage, 'MODEL_ERROR'), 'model', 'MODEL_ERROR')).toEqual({ code: 'MODEL_ERROR', message: emptyMessage });
    expect(safeStreamError(new ChatError(emptyMessage + raw, 'MODEL_ERROR'), 'model', 'MODEL_ERROR')).toEqual({ code: 'MODEL_ERROR', message: modelMessage });
  });
  it('finishReason 日志只接受已知枚举未知值归 OTHER且不泄露正文', () => {
    const log = vi.fn();
    for (const finishReason of ['MALFORMED_FUNCTION_CALL', 'SAFETY', 'STOP', 'MAX_TOKENS', raw, null, { secret }]) {
      logChatFailure(new ChatError(raw, 'MODEL_ERROR', { originalError: { finishReason, message: raw, stack: raw, text: raw } }), 'model', 'MODEL_ERROR', log);
      expect(JSON.parse(log.mock.calls.at(-1)![0])).toEqual({ stage: 'model', code: 'MODEL_ERROR', name: 'Error',
        finishReason: typeof finishReason === 'string' && !finishReason.includes(secret) ? finishReason : 'OTHER' });
    }
    expect(JSON.stringify(log.mock.calls)).not.toContain(secret);
    logChatFailure(new Error(raw), 'model', 'MODEL_ERROR', log);
    expect(JSON.parse(log.mock.calls.at(-1)![0])).toEqual({ stage: 'model', code: 'MODEL_ERROR', name: 'Error' });
  });
  it('历史空 assistant 的原日志窗口配对及已完成回放不改写', async () => {
    const request = input(sessionId);
    await service.appendTurnInputs(sessionId, request.messages, request.requestId);
    await service.appendAssistantResponse(sessionId, '', undefined, request.requestId);
    const before = await storage.getSession(sessionId);
    const model = adapter();
    const source = createSessionChatStreamSource(model, service);
    expect(await collect(source, request)).toEqual([{ event: 'done', data: { content: '', usage: undefined } }]);
    expect(model.stream).not.toHaveBeenCalled();
    const next = { ...request, requestId: '22222222-2222-4222-8222-222222222222', messages: [{ role: 'user' as const, content: 'next' }] };
    await collect(source, next);
    const selected = vi.mocked(model.stream).mock.calls[0][0];
    expect(selected.map(m => [m.role, m.content])).toEqual([['user', 'private-user-body'], ['assistant', ''], ['user', 'next']]);
    expect((await storage.getSession(sessionId))!.messages.slice(0, 2)).toEqual(before!.messages);
  });
});
