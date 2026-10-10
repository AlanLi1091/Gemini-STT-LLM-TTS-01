// @vitest-environment node
import { GoogleGenAI } from '@google/genai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatSseEvent } from '@core/contracts/sse';
import { createChatStreamSourceFromEnv } from '../chat-adapter-stream-source';
import { RequestBudget } from '../request-budget';
import { JsonSessionStorage } from '../storage/json-session-storage';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const mockGenerateContentStream = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(function () {
    return {
      models: {
        generateContentStream: mockGenerateContentStream,
      },
    };
  }),
}));

async function collectEvents(
  source: ReturnType<typeof createChatStreamSourceFromEnv>,
  sessionId?: string,
): Promise<ChatSseEvent[]> {
  const events: ChatSseEvent[] = [];
  for await (const event of source(
    { sessionId, messages: [{ role: 'user', content: '问候' }] },
    { signal: new AbortController().signal },
  )) {
    events.push(event);
  }
  return events;
}

describe('Task 12 Step 3: Adapter 自动选择与统一错误透传', () => {
  it('无状态模型流缺少结束事件时返回明确错误', async () => {
    // Verify the source boundary directly: SDK adapter may synthesize a done event.
    const { createAdapterStreamSource } = await import('../chat-adapter-stream-source');
    const source = createAdapterStreamSource({ id: 'incomplete', name: 'Incomplete', send: async () => ({ content: '' }), stream: async function* () { yield { delta: 'x', accumulated: 'x', done: false }; } });
    expect((await collectEvents(source)).at(-1)).toEqual({ event: 'error', data: { error: { code: 'MODEL_ERROR', message: expect.stringContaining('完整') } } });
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Web 与频道共用预算，超限不调用 SDK 或追加会话输入', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'gemini-budget-'));
    try {
      const storage = new JsonSessionStorage(directory); const session = await storage.resolveDiscordSession('111111111111111111', '222222222222222222');
      mockGenerateContentStream.mockResolvedValueOnce((async function* () { yield { text: '回复' }; })());
      const source = createChatStreamSourceFromEnv({ GEMINI_API_KEY: 'fake' }, { sessionStorage: storage, requestBudget: new RequestBudget({ requestsPerMinute: 1 }) });
      const webSession = await storage.createSession();
      await collectEvents(source, webSession.id);
      const events = [];
      for await (const event of source({ sessionId: session.id, messages: [{ role: 'user', content: '不应写入' }] }, { signal: new AbortController().signal })) events.push(event);
      expect(events).toEqual([expect.objectContaining({ event: 'error', data: { error: { code: 'RATE_LIMIT', message: expect.stringContaining('预算') } } })]);
      expect(mockGenerateContentStream).toHaveBeenCalledOnce(); expect((await storage.getSession(session.id))?.messages).toEqual([]);
    } finally { await rm(directory, { recursive: true }); }
  });
  it('上游 429 后暂停，期间不调用 SDK，到期可恢复', async () => {
    let now = 0; const budget = new RequestBudget({ now: () => now });
    const source = createChatStreamSourceFromEnv({ GEMINI_API_KEY: 'fake' }, { requestBudget: budget });
    mockGenerateContentStream.mockRejectedValueOnce({ status: 429 }); await collectEvents(source);
    await collectEvents(source); expect(mockGenerateContentStream).toHaveBeenCalledOnce();
    now = 60000; mockGenerateContentStream.mockResolvedValueOnce((async function* () { yield { text: '恢复' }; })());
    expect((await collectEvents(source)).at(-1)?.event).toBe('done'); expect(mockGenerateContentStream).toHaveBeenCalledTimes(2);
  });
  it('Mock 不消耗或受 Gemini 预算影响', async () => {
    const budget = new RequestBudget({ requestsPerMinute: 1 }); budget.pause();
    const source = createChatStreamSourceFromEnv({}, { requestBudget: budget, mockAdapterOptions: { delayMs: 0, streamChunkDelayMs: 0 } });
    expect((await collectEvents(source)).at(-1)?.event).toBe('done'); expect((await collectEvents(source)).at(-1)?.event).toBe('done');
    expect(mockGenerateContentStream).not.toHaveBeenCalled();
  });
  it('已中止请求不消耗预算或调用 SDK', async () => {
    const budget = new RequestBudget({ requestsPerMinute: 1 }); const controller = new AbortController(); controller.abort();
    const source = createChatStreamSourceFromEnv({ GEMINI_API_KEY: 'fake' }, { requestBudget: budget });
    const events = []; for await (const event of source({ messages: [] }, { signal: controller.signal })) events.push(event);
    expect(events).toEqual([]); expect(mockGenerateContentStream).not.toHaveBeenCalled(); expect(budget.acquire()).toBe(0);
  });
  it('非法服务端预算配置在启动时拒绝', () => {
    expect(() => createChatStreamSourceFromEnv({ GEMINI_API_KEY: 'fake', GEMINI_REQUESTS_PER_MINUTE: '0' })).toThrow('budget configuration');
  });

  it('有效服务端 Key 应选择 Gemini，并映射 chunk/done 与 AbortSignal', async () => {
    mockGenerateContentStream.mockResolvedValueOnce(
      (async function* () {
        yield {
          text: '你好',
          usageMetadata: {
            promptTokenCount: 2,
            candidatesTokenCount: 1,
            totalTokenCount: 3,
          },
        };
      })(),
    );
    const source = createChatStreamSourceFromEnv({
      GEMINI_API_KEY: ' server-secret-key ',
    });
    const events = await collectEvents(source);

    expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'server-secret-key' });
    expect(mockGenerateContentStream).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-3.8-flash',
        contents: [{ role: 'user', parts: [{ text: '问候' }] }],
        config: expect.objectContaining({ abortSignal: expect.any(AbortSignal) }),
      }),
    );
    expect(events).toEqual([
      {
        event: 'chunk',
        data: { delta: '你好', accumulated: '你好' },
      },
      {
        event: 'done',
        data: {
          content: '你好',
          usage: { promptTokens: 2, completionTokens: 1, totalTokens: 3 },
        },
      },
    ]);
  });

  it('缺少、空白或不可见字符 Key 时应自动降级共享 MockAdapter', async () => {
    for (const apiKey of [undefined, '   ', '\u200B']) {
      const source = createChatStreamSourceFromEnv(
        { GEMINI_API_KEY: apiKey },
        { mockAdapterOptions: { delayMs: 0, streamChunkDelayMs: 0 } },
      );
      const events = await collectEvents(source);
      const finalEvent = events.at(-1);

      expect(events.some((event) => event.event === 'chunk')).toBe(true);
      expect(finalEvent?.event).toBe('done');
      if (finalEvent?.event === 'done') {
        expect(finalEvent.data.content).toContain('Mock');
      }
    }

    expect(GoogleGenAI).not.toHaveBeenCalled();
    expect(mockGenerateContentStream).not.toHaveBeenCalled();
  });

  it('Gemini 错误应通过 SSE error 事件透传标准 code 与 message', async () => {
    mockGenerateContentStream.mockRejectedValueOnce({
      status: 429,
      message: 'Quota exceeded',
    });
    const source = createChatStreamSourceFromEnv({ GEMINI_API_KEY: 'server-key' });

    await expect(collectEvents(source)).resolves.toEqual([
      {
        event: 'error',
        data: {
          error: {
            code: 'RATE_LIMIT',
            message: 'Quota exceeded',
          },
        },
      },
    ]);
  });
});

// ADR-012: focused source-state tests; no real SDK or HTTP calls.
describe('P0-2: 幂等重试数据流', () => {
  const requestId = '11111111-1111-4111-8111-111111111111';
  const secondId = '22222222-2222-4222-8222-222222222222';
  async function context(run: (ctx: {
    storage: JsonSessionStorage; service: import('../session-service').SessionService;
    adapter: import('@core/index').ChatAdapter; source: import('../chat-stream').ChatStreamSource;
    sessionId: string; directory: string;
  }) => Promise<void>) {
    const { SessionService } = await import('../session-service');
    const { createSessionChatStreamSource } = await import('../chat-adapter-stream-source');
    const directory = await mkdtemp(join(tmpdir(), 'idempotent-source-'));
    try {
      const storage = new JsonSessionStorage(directory);
      const service = new SessionService(storage);
      const session = await service.createSession();
      const adapter: import('@core/index').ChatAdapter = {
        id: 'recording', name: 'Recording', send: async () => ({ content: 'ok' }),
        stream: vi.fn(async function* () { yield { delta: '', accumulated: 'ok', done: true, usage: { totalTokens: 3 } }; }),
      };
      await run({ storage, service, adapter, source: createSessionChatStreamSource(adapter, service), sessionId: session.id, directory });
    } finally { await rm(directory, { recursive: true }); }
  }
  function input(sessionId: string, id: string | undefined = requestId, content = 'hi'): import('@core/index').ChatStreamRequest {
    return { sessionId, requestId: id, messages: [{ role: 'user' as const, content }] };
  }
  async function collect(source: import('../chat-stream').ChatStreamSource, req: ReturnType<typeof input>, signal = new AbortController().signal) {
    const events: ChatSseEvent[] = [];
    for await (const event of source(req, { signal })) events.push(event);
    return events;
  }
  function conflict(events: ChatSseEvent[]) {
    expect(events).toEqual([{ event: 'error', data: { error: { code: 'REQUEST_CONFLICT', message: expect.any(String) } } }]);
  }

  it('连续模型失败后重试复用唯一输入并最终只保存一条回复', async () => context(async c => {
    let attempts = 0;
    c.adapter.stream = vi.fn(async function* (messages: import('@core/index').Message[]) {
      expect(messages.map(m => m.content)).toEqual(['hi']);
      if (++attempts < 3) throw new Error('model failed');
      yield { delta: '', accumulated: 'ok', done: true };
    });
    expect((await collect(c.source, input(c.sessionId)))[0].event).toBe('error');
    expect((await collect(c.source, input(c.sessionId)))[0].event).toBe('error');
    expect((await collect(c.source, input(c.sessionId)))[0].event).toBe('done');
    const saved = (await c.storage.getSession(c.sessionId))!.messages;
    expect(saved.map(m => [m.role, m.content])).toEqual([['user', 'hi'], ['assistant', 'ok']]);
    expect(saved[0].id).toBe(requestId);
    expect(saved.every(m => m.requestId === requestId)).toBe(true);
  }));

  it('回复已保存且后续有新轮次时仍回放 done 与用量而不调用模型', async () => context(async c => {
    await collect(c.source, input(c.sessionId));
    await collect(c.source, input(c.sessionId, secondId, 'next'));
    const before = await c.storage.getSession(c.sessionId);
    expect(await collect(c.source, input(c.sessionId))).toEqual([{ event: 'done', data: { content: 'ok', usage: { totalTokens: 3 } } }]);
    expect(c.adapter.stream).toHaveBeenCalledTimes(2);
    expect(await c.storage.getSession(c.sessionId)).toEqual(before);
  }));

  it('无回复且输入不在末尾时拒绝重试并保持原日志', async () => context(async c => {
    await c.service.appendTurnInputs(c.sessionId, [{ role: 'user', content: 'hi' }], requestId);
    await c.service.appendTurnInputs(c.sessionId, [{ role: 'user', content: 'later' }]);
    const before = await c.storage.getSession(c.sessionId);
    conflict(await collect(c.source, input(c.sessionId)));
    expect(c.adapter.stream).not.toHaveBeenCalled();
    expect(await c.storage.getSession(c.sessionId)).toEqual(before);
  }));

  it('同标识不同内容拒绝且不覆盖已完成回复', async () => context(async c => {
    await collect(c.source, input(c.sessionId));
    conflict(await collect(c.source, input(c.sessionId, requestId, 'changed')));
    expect(c.adapter.stream).toHaveBeenCalledOnce();
  }));

  it('进行中同会话的同标识新标识及旧 Bot 请求立即冲突', async () => context(async c => {
    c.adapter.stream = vi.fn(async function* () {
      yield { delta: 'x', accumulated: 'x', done: false };
      yield { delta: '', accumulated: 'ok', done: true };
    });
    const active = c.source(input(c.sessionId), { signal: new AbortController().signal })[Symbol.asyncIterator]();
    expect((await active.next()).value.event).toBe('chunk');
    try {
      conflict(await collect(c.source, input(c.sessionId)));
      conflict(await collect(c.source, input(c.sessionId, secondId, 'next')));
      conflict(await collect(c.source, { ...input(c.sessionId), requestId: undefined }));
      expect(c.adapter.stream).toHaveBeenCalledOnce();
      expect((await c.storage.getSession(c.sessionId))!.messages).toHaveLength(1);
    } finally { await active.return?.(); }
    expect((await collect(c.source, input(c.sessionId)))[0].event).toBe('chunk');
  }));

  it('未带标识的旧请求也持有会话锁且不同会话互不阻塞', async () => context(async c => {
    c.adapter.stream = vi.fn(async function* () { yield { delta: 'x', accumulated: 'x', done: false }; yield { delta: '', accumulated: 'ok', done: true }; });
    const legacy = { sessionId: c.sessionId, messages: [{ role: 'user' as const, content: 'legacy' }] };
    const active = c.source(legacy, { signal: new AbortController().signal })[Symbol.asyncIterator]();
    await active.next();
    try {
      conflict(await collect(c.source, input(c.sessionId)));
      const other = await c.service.createSession();
      expect((await collect(c.source, input(other.id))).at(-1)?.event).toBe('done');
    } finally { await active.return?.(); }
  }));

  it('停止后立即重发先冲突待上游退出后释放锁并可恢复', async () => context(async c => {
    let finish!: () => void;
    const gate = new Promise<void>(resolve => { finish = resolve; });
    c.adapter.stream = vi.fn(async function* (_messages, options) {
      yield { delta: 'partial', accumulated: 'partial', done: false };
      await gate;
      if (options?.signal?.aborted) return;
      yield { delta: '', accumulated: 'ok', done: true };
    });
    const controller = new AbortController();
    const active = c.source(input(c.sessionId), { signal: controller.signal })[Symbol.asyncIterator]();
    await active.next();
    const pending = active.next();
    controller.abort();
    try { conflict(await collect(c.source, input(c.sessionId, secondId, 'next'))); }
    finally { finish(); await pending; await active.return?.(); }
    expect((await c.storage.getSession(c.sessionId))!.messages.map(m => m.role)).toEqual(['user']);
    expect((await collect(c.source, input(c.sessionId, secondId, 'next'))).at(-1)?.event).toBe('done');
    expect((await c.storage.getSession(c.sessionId))!.messages.map(m => m.role)).toEqual(['user', 'user', 'assistant']);
  }));

  it('进程重建后复用无回复输入并可回放新保存的回复', async () => context(async c => {
    await c.service.appendTurnInputs(c.sessionId, [{ role: 'user', content: 'hi' }], requestId);
    const { SessionService } = await import('../session-service');
    const { createSessionChatStreamSource } = await import('../chat-adapter-stream-source');
    const restarted = createSessionChatStreamSource(c.adapter, new SessionService(new JsonSessionStorage(c.directory)));
    expect((await collect(restarted, input(c.sessionId))).at(-1)?.event).toBe('done');
    const restartedAgain = createSessionChatStreamSource(c.adapter, new SessionService(new JsonSessionStorage(c.directory)));
    expect(await collect(restartedAgain, input(c.sessionId))).toEqual([{ event: 'done', data: { content: 'ok', usage: { totalTokens: 3 } } }]);
    expect(c.adapter.stream).toHaveBeenCalledOnce();
  }));

  it('已完成回放绕过暂停预算而新输入超限时不持久化', async () => context(async c => {
    await collect(c.source, input(c.sessionId));
    const budget = new RequestBudget(); budget.pause();
    const { createSessionChatStreamSource } = await import('../chat-adapter-stream-source');
    const guarded = createSessionChatStreamSource(c.adapter, c.service, budget);
    expect((await collect(guarded, input(c.sessionId)))[0].event).toBe('done');
    expect((await collect(guarded, input(c.sessionId, secondId, 'next')))[0]).toMatchObject({ event: 'error', data: { error: { code: 'RATE_LIMIT' } } });
    expect((await c.storage.getSession(c.sessionId))!.messages).toHaveLength(2);
    expect(c.adapter.stream).toHaveBeenCalledOnce();
  }));

  it('归档及已中止请求不调用模型且不产生新消息', async () => context(async c => {
    const controller = new AbortController(); controller.abort();
    expect(await collect(c.source, input(c.sessionId), controller.signal)).toEqual([]);
    await c.service.archiveSession(c.sessionId);
    expect((await collect(c.source, input(c.sessionId)))[0].event).toBe('error');
    expect(c.adapter.stream).not.toHaveBeenCalled();
    expect((await c.storage.getSession(c.sessionId))!.messages).toEqual([]);
  }));
});

describe('P0-1: 窗口与会话流装配', () => {
  async function context(run: (ctx: { storage: JsonSessionStorage; service: import('../session-service').SessionService; sessionId: string }) => Promise<void>) {
    const { SessionService } = await import('../session-service');
    const directory = await mkdtemp(join(tmpdir(), 'bounded-session-'));
    try {
      const storage = new JsonSessionStorage(directory); const service = new SessionService(storage);
      await run({ storage, service, sessionId: (await service.createSession()).id });
    } finally { await rm(directory, { recursive: true }); }
  }
  async function collect(source: import('../chat-stream').ChatStreamSource, req: import('@core/index').ChatStreamRequest) {
    const events: ChatSseEvent[] = [];
    for await (const event of source(req, { signal: new AbortController().signal })) events.push(event);
    return events;
  }
  const requestId = '11111111-1111-4111-8111-111111111111';
  it('大量历史 system 不进入窗口且最近轮次生成后完整日志保留', async () => context(async c => {
    const { createSessionChatStreamSource } = await import('../chat-adapter-stream-source');
    const { ContextWindow } = await import('../context-window');
    await c.service.appendTurnInputs(c.sessionId, [{ role: 'system', content: 'x'.repeat(50000) }, { role: 'user', content: 'old' }]);
    await c.service.appendAssistantResponse(c.sessionId, 'old-reply');
    await c.service.appendTurnInputs(c.sessionId, [{ role: 'user', content: 'recent' }]);
    await c.service.appendAssistantResponse(c.sessionId, 'recent-reply');
    const before = (await c.storage.getSession(c.sessionId))!.messages;
    const stream = vi.fn(async function* (messages: import('@core/index').Message[], options?: import('@core/index').ChatAdapterOptions) {
      expect(messages.map(m => m.content)).toEqual(['recent', 'recent-reply', 'current']);
      expect(options?.maxTokens).toBe(8192);
      yield { delta: '', accumulated: 'ok', done: true };
    });
    const source = createSessionChatStreamSource({ id: 'record', name: 'Record', send: async () => ({ content: '' }), stream }, c.service, undefined, new ContextWindow({ historyTurns: 1 }));
    expect((await collect(source, { sessionId: c.sessionId, requestId, messages: [{ role: 'user', content: 'current' }] })).at(-1)?.event).toBe('done');
    expect((await c.storage.getSession(c.sessionId))!.messages.slice(0, before.length)).toEqual(before);
  }));
  it('失败重试的本轮输入在计数和模型窗口中都仅出现一次回放不再计数', async () => context(async c => {
    const { createSessionChatStreamSource } = await import('../chat-adapter-stream-source'); const { ContextWindow } = await import('../context-window');
    const content = 'x'.repeat(400); const inputs: number[] = [];
    const countTokens = vi.fn(async (messages: import('@core/index').Message[]) => { expect(messages.filter(m => m.content === content)).toHaveLength(1); return 100; });
    let calls = 0;
    const stream = vi.fn(async function* (messages: import('@core/index').Message[]) {
      inputs.push(messages.length); if (++calls === 1) throw new Error('failed');
      yield { delta: '', accumulated: 'ok', done: true };
    });
    const source = createSessionChatStreamSource({ id: 'retry', name: 'Retry', send: async () => ({ content: '' }), countTokens, stream }, c.service, undefined, new ContextWindow({ inputTokens: 1000 }));
    const req = { sessionId: c.sessionId, requestId, messages: [{ role: 'user' as const, content }] };
    expect((await collect(source, req)).at(-1)?.event).toBe('error');
    expect((await collect(source, req)).at(-1)?.event).toBe('done');
    expect((await collect(source, req))).toEqual([{ event: 'done', data: { content: 'ok', usage: undefined } }]);
    expect(inputs).toEqual([1, 1]); expect(countTokens).toHaveBeenCalledTimes(2);
    expect((await c.storage.getSession(c.sessionId))!.messages.map(m => m.role)).toEqual(['user', 'assistant']);
  }));
  it('超限新输入不落盘不调用模型且会话锁正常释放', async () => context(async c => {
    const { createSessionChatStreamSource } = await import('../chat-adapter-stream-source'); const { ContextWindow } = await import('../context-window');
    const stream = vi.fn(async function* () { yield { delta: '', accumulated: 'ok', done: true }; });
    const source = createSessionChatStreamSource({ id: 'mock', name: 'Mock', send: async () => ({ content: '' }), stream }, c.service, undefined, new ContextWindow({ inputTokens: 1000 }));
    expect((await collect(source, { sessionId: c.sessionId, requestId, messages: [{ role: 'user', content: 'x'.repeat(2000) }] }))[0]).toMatchObject({ event: 'error', data: { error: { code: 'CONTEXT_LIMIT' } } });
    expect((await c.storage.getSession(c.sessionId))!.messages).toEqual([]); expect(stream).not.toHaveBeenCalled();
    expect((await collect(source, { sessionId: c.sessionId, requestId, messages: [{ role: 'user', content: 'short' }] })).at(-1)?.event).toBe('done');
  }));
  it('MAX_TOKENS 空正文不保存助手消息有正文提示与持久化一致', async () => context(async c => {
    const { createSessionChatStreamSource } = await import('../chat-adapter-stream-source');
    const { GeminiChatAdapter } = await import('@core/index');
    mockGenerateContentStream.mockResolvedValueOnce((async function* () { yield { text: '', candidates: [{ finishReason: 'MAX_TOKENS' }] }; })());
    const source = createSessionChatStreamSource(new GeminiChatAdapter({ apiKey: 'fake' }), c.service);
    const req = { sessionId: c.sessionId, requestId, messages: [{ role: 'user' as const, content: 'hi' }] };
    expect((await collect(source, req)).at(-1)?.event).toBe('error');
    expect((await c.storage.getSession(c.sessionId))!.messages.map(m => m.role)).toEqual(['user']);
    mockGenerateContentStream.mockResolvedValueOnce((async function* () { yield { text: 'partial', candidates: [{ finishReason: 'MAX_TOKENS' }] }; })());
    const last = (await collect(source, req)).at(-1)!;
    expect(last.event).toBe('done');
    if (last.event === 'done') expect((await c.storage.getSession(c.sessionId))!.messages.at(-1)?.content).toBe(last.data.content);
    expect((await c.storage.getSession(c.sessionId))!.messages.at(-1)?.content).toContain('内容已截断');
  }));
});

describe('P1-1: 会话流源输入防护', () => {
  it('直接调用拒绝非法会话输入且不读写存储不耗预算不调用模型', async () => {
    const { SessionService } = await import('../session-service');
    const { createSessionChatStreamSource } = await import('../chat-adapter-stream-source');
    const directory = await mkdtemp(join(tmpdir(), 'p11-source-'));
    try {
      const storage = new JsonSessionStorage(directory);
      const service = new SessionService(storage);
      const session = await service.createSession();
      const before = await storage.getSession(session.id);
      const getSession = vi.spyOn(storage, 'getSession');
      const appendMessage = vi.spyOn(storage, 'appendMessage');
      const acquireLock = vi.spyOn(service, 'tryAcquireRequest');
      const budget = new RequestBudget({ requestsPerMinute: 1 });
      const acquireBudget = vi.spyOn(budget, 'acquire');
      const countTokens = vi.fn(async () => 1);
      const stream = vi.fn(async function* () { yield { delta: 'ok', accumulated: 'ok', done: true }; });
      const source = createSessionChatStreamSource({ id: 'p11', name: 'P1-1', send: async () => ({ content: '' }), stream, countTokens }, service, budget);
      const input = { sessionId: session.id, messages: [{ role: 'user' as const, content: 'hi' }] };
      for (const body of [
        ...[undefined, '', ' \n '].map(sessionId => ({ ...input, sessionId })),
        ...[
          [{ role: 'system' as const, content: 'injected' }],
          [{ role: 'assistant' as const, content: 'forged' }],
          [...input.messages, ...input.messages], [],
          [{ role: 'user' as const, content: ' \n ' }],
        ].map(messages => ({ ...input, messages })),
      ]) {
        const events = [];
        for await (const event of source(body, { signal: new AbortController().signal })) events.push(event);
        expect(events).toEqual([{ event: 'error', data: { error: { code: 'UNKNOWN', message: 'Invalid chat stream request' } } }]);
      }
      expect(getSession).not.toHaveBeenCalled(); expect(appendMessage).not.toHaveBeenCalled();
      expect(acquireLock).not.toHaveBeenCalled(); expect(acquireBudget).not.toHaveBeenCalled();
      expect(stream).not.toHaveBeenCalled(); expect(countTokens).not.toHaveBeenCalled();
      expect(await storage.getSession(session.id)).toEqual(before);
      const events = [];
      for await (const event of source(input, { signal: new AbortController().signal })) events.push(event);
      expect(events.at(-1)?.event).toBe('done');
      expect(stream).toHaveBeenCalledOnce(); expect(acquireBudget).toHaveBeenCalledOnce();
      expect((await storage.getSession(session.id))!.messages.map(m => m.role)).toEqual(['user', 'assistant']);
    } finally { await rm(directory, { recursive: true }); }
  });

  it('环境工厂会话模式不再回退到无状态模型流', async () => {
    const { SessionService } = await import('../session-service');
    const storage = new JsonSessionStorage('/unused-p11-fixture');
    const getSession = vi.spyOn(storage, 'getSession');
    const budget = new RequestBudget({ requestsPerMinute: 1 });
    const source = createChatStreamSourceFromEnv({ GEMINI_API_KEY: 'fake' }, { sessionService: new SessionService(storage), requestBudget: budget });
    const callsBefore = mockGenerateContentStream.mock.calls.length;
    expect(await collectEvents(source)).toEqual([{ event: 'error', data: { error: { code: 'UNKNOWN', message: 'Invalid chat stream request' } } }]);
    expect(getSession).not.toHaveBeenCalled();
    expect(mockGenerateContentStream.mock.calls.length).toBe(callsBefore);
    expect(budget.acquire()).toBe(0);
  });
});

describe('P0-1 Step 2: 共享服务装配', () => {
  it('环境工厂复用路由服务生成期间同一服务归档返回冲突', async () => {
    const { SessionService } = await import('../session-service');
    const directory = await mkdtemp(join(tmpdir(), 'shared-session-service-'));
    try {
      const storage = new JsonSessionStorage(directory); const service = new SessionService(storage); const session = await service.createSession();
      const source = createChatStreamSourceFromEnv({}, { sessionService: service, mockAdapterOptions: { delayMs: 0, streamChunkDelayMs: 0 } });
      const iterator = source({ sessionId: session.id, messages: [{ role: 'user', content: 'hi' }] }, { signal: new AbortController().signal })[Symbol.asyncIterator]();
      await iterator.next();
      try {
        await expect(service.archiveSession(session.id)).rejects.toMatchObject({ name: 'SessionRequestConflictError' });
        expect((await service.getSession(session.id))!.archivedAt).toBeUndefined();
      } finally { await iterator.return?.(); }
      await expect(service.archiveSession(session.id)).resolves.toMatchObject({ archivedAt: expect.any(Number) });
    } finally { await rm(directory, { recursive: true }); }
  });
  it('同时传入服务和存储拒绝避免产生两个不一致实例', async () => {
    const { SessionService } = await import('../session-service'); const storage = new JsonSessionStorage('/unused-fixture');
    expect(() => createChatStreamSourceFromEnv({}, { sessionService: new SessionService(storage), sessionStorage: storage })).toThrow('not both');
  });
});
