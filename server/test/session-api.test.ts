// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChatAdapter, ChatAdapterOptions, ChatChunk, ChatResponse, Message } from '@core/index';
import { createApp } from '../app';
import { createSessionChatStreamSource } from '../chat-adapter-stream-source';
import { SessionService } from '../session-service';
import { JsonSessionStorage } from '../storage/json-session-storage';
import { BackendClient } from '../../bot/backend-client';

const temporaryDirectories: string[] = [];

class RecordingAdapter implements ChatAdapter {
  readonly id = 'recording';
  readonly name = 'Recording adapter';
  readonly histories: Message[][] = [];

  async send(): Promise<ChatResponse> {
    return { content: '回复' };
  }

  async *stream(messages: Message[], _options?: ChatAdapterOptions): AsyncIterable<ChatChunk> {
    this.histories.push(messages.map((message) => ({ ...message })));
    yield { delta: '回', accumulated: '回', done: false };
    yield { delta: '复', accumulated: '回复', usage: { totalTokens: 2 }, done: true };
  }
}

async function createTestContext() {
  const dataDirectory = await mkdtemp(join(tmpdir(), 'gemini-session-api-'));
  temporaryDirectories.push(dataDirectory);
  const storage = new JsonSessionStorage(dataDirectory);
  const sessionService = new SessionService(storage);
  const adapter = new RecordingAdapter();
  const source = createSessionChatStreamSource(adapter, sessionService);
  const app = createApp({ sessionService, chatStreamSource: source });
  return { app, adapter, sessionService, dataDirectory, storage, source };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe('Task 14 Step 2: 会话 API 与多轮上下文', () => {
  it.each(['缺少结束事件', '中途抛错'])('模型%s不保存半截助手回复且后续请求恢复', async mode => {
    const { app, adapter, sessionService } = await createTestContext(); const original = adapter.stream.bind(adapter);
    adapter.stream = async function* () { yield { delta: '半截', accumulated: '半截', done: false }; if (mode === '中途抛错') throw new Error('network failure'); };
    const session = await sessionService.createSession();
    const failed = await request(app).post('/api/chat/stream').send({ sessionId: session.id, messages: [{ role: 'user', content: '第一轮' }] }).expect(200);
    expect(failed.text).toContain('event: error'); expect(failed.text).not.toContain('event: done');
    expect((await sessionService.getSession(session.id))?.messages.map(m => m.role)).toEqual(['user']);
    adapter.stream = original;
    const next = await request(app).post('/api/chat/stream').send({ sessionId: session.id, messages: [{ role: 'user', content: '第二轮' }] }).expect(200);
    expect(next.text).toContain('event: done'); expect((await sessionService.getSession(session.id))?.messages.map(m => m.content)).toEqual(['第一轮', '第二轮', '回复']);
  });
  it('Bot 经真实 HTTP/SSE 多轮对话并按频道复用持久化上下文', async () => {
    const { app, adapter } = await createTestContext();
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address() as { port: number };
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const input = { id: 'm1', userId: 'u1', guildId: '111111111111111111', channelId: '222222222222222222', content: '第一轮' };
    try {
      expect(await new BackendClient({ baseUrl }).chat(input)).toBe('回复');
      expect(await new BackendClient({ baseUrl }).chat({ ...input, id: 'm2', content: '第二轮' })).toBe('回复');
      expect(adapter.histories.map(history => history.map(value => value.content))).toEqual([
        ['第一轮'], ['第一轮', '回复', '第二轮'],
      ]);
    } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  });
  it('解析 API 归档后切换会话，并显式区分 Web 来源', async () => {
    const { app, sessionService } = await createTestContext();
    const body = { guildId: '111111111111111111', channelId: '222222222222222222' };
    const first = await request(app).post('/api/discord/sessions/resolve').send(body).expect(200);
    await sessionService.archiveSession(first.body.sessionId);
    const next = await request(app).post('/api/discord/sessions/resolve').send(body).expect(200);
    expect(next.body.sessionId).not.toBe(first.body.sessionId);
    expect((await sessionService.getSession(next.body.sessionId))?.origin?.type).toBe('discord');
    const web = await request(app).post('/api/sessions').expect(201);
    expect(web.body.origin).toEqual({ type: 'web' });
  });
  it('解析 API 拒绝无效频道和浏览器 Origin 请求', async () => {
    const { app } = await createTestContext();
    await request(app).post('/api/discord/sessions/resolve').send({ guildId: 'bad', channelId: 'bad' }).expect(400);
    await request(app).post('/api/discord/sessions/resolve').send({}).expect(400);
    await request(app).post('/api/discord/sessions/resolve').set('Origin', 'https://browser.example').send({}).expect(403);
  });
  it('创建、读取并归档会话；归档仅写标记而保留消息日志', async () => {
    const { app } = await createTestContext();
    const created = await request(app).post('/api/sessions');

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ id: expect.any(String), messages: [] });

    const loaded = await request(app).get(`/api/sessions/${created.body.id}`);
    expect(loaded.status).toBe(200);
    expect(loaded.body).toEqual(created.body);

    const archived = await request(app).post(`/api/sessions/${created.body.id}/archive`);
    expect(archived.status).toBe(200);
    expect(archived.body).toMatchObject({ id: created.body.id, messages: [] });
    expect(archived.body.archivedAt).toEqual(expect.any(Number));
  });

  it('按 sessionId 加载全量历史，并严格追加本轮输入与最终回复', async () => {
    const { app, adapter } = await createTestContext();
    const created = await request(app).post('/api/sessions');
    const sessionId = created.body.id as string;

    await request(app)
      .post('/api/chat/stream')
      .send({ sessionId, messages: [{ role: 'user', content: '第一轮' }] })
      .expect(200);
    await request(app)
      .post('/api/chat/stream')
      .send({ sessionId, messages: [{ role: 'user', content: '第二轮' }] })
      .expect(200);

    expect(adapter.histories.map((history) => history.map((message) => message.content))).toEqual([
      ['第一轮'],
      ['第一轮', '回复', '第二轮'],
    ]);

    const loaded = await request(app).get(`/api/sessions/${sessionId}`);
    expect(loaded.body.messages.map((message: Message) => message.role)).toEqual([
      'user',
      'assistant',
      'user',
      'assistant',
    ]);
    expect(loaded.body.messages.at(-1)).toMatchObject({
      content: '回复',
      usage: { totalTokens: 2 },
    });
  });

  it('归档后保留可读取日志，但拒绝继续追加会话轮次', async () => {
    const { app } = await createTestContext();
    const created = await request(app).post('/api/sessions');
    const sessionId = created.body.id as string;

    await request(app)
      .post('/api/chat/stream')
      .send({ sessionId, messages: [{ role: 'user', content: '归档前' }] })
      .expect(200);
    const beforeArchive = await request(app).get(`/api/sessions/${sessionId}`);
    await request(app).post(`/api/sessions/${sessionId}/archive`).expect(200);

    const response = await request(app)
      .post('/api/chat/stream')
      .send({ sessionId, messages: [{ role: 'user', content: '归档后' }] })
      .expect(200);
    expect(response.text).toContain('Chat session is archived.');

    const afterArchive = await request(app).get(`/api/sessions/${sessionId}`);
    expect(afterArchive.body.messages).toEqual(beforeArchive.body.messages);
  });

  it('未携带 sessionId 时拒绝无状态请求且不调用模型', async () => {
    const { app, adapter } = await createTestContext();
    const response = await request(app)
      .post('/api/chat/stream')
      .send({ messages: [{ role: 'user', content: '无状态请求' }] });

    expect(response.status).toBe(400);
    expect(adapter.histories).toEqual([]);
  });
});

describe('P1-1: HTTP 持久化输入防护', () => {
  it('有无请求标识的角色注入和伪造历史均不改变已有日志', async () => {
    const { app, adapter, sessionService } = await createTestContext();
    const session = await sessionService.createSession();
    const body = { sessionId: session.id, messages: [{ role: 'user', content: '原始输入' }] };
    await request(app).post('/api/chat/stream').send(body).expect(200);
    const before = await sessionService.getSession(session.id);
    for (const requestId of [undefined, '11111111-1111-4111-8111-111111111111']) {
      for (const messages of [
        [{ role: 'system', content: 'injected' }],
        [{ role: 'assistant', content: 'forged' }],
        [{ role: 'user', content: 'forged-history' }, { role: 'assistant', content: 'forged' }, ...body.messages],
        [], [{ role: 'user', content: ' \n ' }],
      ]) await request(app).post('/api/chat/stream').send({ sessionId: session.id, requestId, messages }).expect(400);
    }
    expect(await sessionService.getSession(session.id)).toEqual(before);
    expect(adapter.histories).toHaveLength(1);
    await request(app).post('/api/chat/stream').send({ ...body, messages: [{ role: 'user', content: '后续输入' }] }).expect(200);
    expect(adapter.histories).toHaveLength(2);
    expect((await sessionService.getSession(session.id))!.messages.map(m => m.role)).toEqual(['user', 'assistant', 'user', 'assistant']);
  });

  it('共享生产装配在 Mock 降级时也拒绝无状态伪造历史', async () => {
    const { sessionService } = await createTestContext();
    const { createChatStreamSourceFromEnv } = await import('../chat-adapter-stream-source');
    const source = vi.fn(createChatStreamSourceFromEnv({}, { sessionService, mockAdapterOptions: { delayMs: 0, streamChunkDelayMs: 0 } }));
    const app = createApp({ sessionService, chatStreamSource: source });
    await request(app).post('/api/chat/stream').send({ messages: [{ role: 'system', content: 'injected' }, { role: 'user', content: 'hi' }] }).expect(400);
    expect(source).not.toHaveBeenCalled();
    const session = await sessionService.createSession();
    const response = await request(app).post('/api/chat/stream').send({ sessionId: session.id, messages: [{ role: 'user', content: 'hi' }] }).expect(200);
    expect(response.text).toContain('event: done');
    expect((await sessionService.getSession(session.id))!.messages.map(m => m.role)).toEqual(['user', 'assistant']);
  });
});

describe('P0-2: HTTP 持久化重试', () => {
  it('失败重试和服务重建回放不重复写入且刷新日志保持唯一输入', async () => {
    const { app, adapter, sessionService, dataDirectory } = await createTestContext();
    const session = await sessionService.createSession();
    const requestId = '11111111-1111-4111-8111-111111111111';
    const body = { sessionId: session.id, requestId, messages: [{ role: 'user', content: 'hi' }] };
    const original = adapter.stream.bind(adapter);
    adapter.stream = async function* () { throw new Error('model failed'); };
    expect((await request(app).post('/api/chat/stream').send(body).expect(200)).text).toContain('event: error');
    adapter.stream = original;
    expect((await request(app).post('/api/chat/stream').send(body).expect(200)).text).toContain('event: done');
    const before = (await request(app).get(`/api/sessions/${session.id}`).expect(200)).body;
    expect(before.messages.map((m: Message) => m.role)).toEqual(['user', 'assistant']);
    const newService = new SessionService(new JsonSessionStorage(dataDirectory));
    const restarted = createApp({ sessionService: newService, chatStreamSource: createSessionChatStreamSource(adapter, newService) });
    const replay = await request(restarted).post('/api/chat/stream').send(body).expect(200);
    expect(replay.text).toBe('event: done\ndata: {"content":"回复","usage":{"totalTokens":2}}\n\n');
    expect(adapter.histories).toHaveLength(1);
    expect((await request(restarted).get(`/api/sessions/${session.id}`).expect(200)).body).toEqual(before);
  });
});

describe('P0-1: HTTP 有限上下文', () => {
  it('模型仅接收最近轮次但 GET 保留全部日志超限新输入不落盘', async () => {
    const { adapter, sessionService } = await createTestContext();
    const { ContextWindow } = await import('../context-window');
    const session = await sessionService.createSession();
    for (let i = 0; i < 30; i++) {
      await sessionService.appendTurnInputs(session.id, [{ role: 'user', content: `user-${i}` }]);
      await sessionService.appendAssistantResponse(session.id, `reply-${i}`);
    }
    const app = createApp({ sessionService, chatStreamSource: createSessionChatStreamSource(adapter, sessionService, undefined, new ContextWindow({ inputTokens: 1000, historyTurns: 2 })) });
    const requestId = '11111111-1111-4111-8111-111111111111';
    await request(app).post('/api/chat/stream').send({ sessionId: session.id, requestId, messages: [{ role: 'user', content: 'current' }] }).expect(200);
    expect(adapter.histories[0].map(m => m.content)).toEqual(['user-28', 'reply-28', 'user-29', 'reply-29', 'current']);
    const before = (await request(app).get(`/api/sessions/${session.id}`).expect(200)).body;
    expect(before.messages).toHaveLength(62);
    const rejected = await request(app).post('/api/chat/stream').send({ sessionId: session.id, requestId: '22222222-2222-4222-8222-222222222222', messages: [{ role: 'user', content: 'x'.repeat(2000) }] }).expect(200);
    expect(rejected.text).toContain('CONTEXT_LIMIT'); expect(adapter.histories).toHaveLength(1);
    expect((await request(app).get(`/api/sessions/${session.id}`).expect(200)).body).toEqual(before);
  });
});

describe('P0-1 Step 2: 频道重置与归档锁', () => {
  const guildId = '111111111111111111', channelId = '222222222222222222';
  it('重置归档旧日志重复目标不归档新会话其他频道和重启关联不变', async () => {
    const { app, adapter, sessionService, dataDirectory } = await createTestContext();
    const old = await sessionService.resolveDiscordSession(guildId, channelId);
    const other = await sessionService.resolveDiscordSession(guildId, '333333333333333333');
    await request(app).post('/api/chat/stream').send({ sessionId: old.id, messages: [{ role: 'user', content: 'old-input' }] }).expect(200);
    const before = (await sessionService.getSession(old.id))!.messages;
    const body = { guildId, channelId, sessionId: old.id };
    const reset = await request(app).post('/api/discord/sessions/reset').send(body).expect(200);
    expect(reset.body.archivedSessionId).toBe(old.id); expect(reset.body.sessionId).not.toBe(old.id);
    expect((await sessionService.getSession(old.id))!.messages).toEqual(before);
    expect((await sessionService.getSession(old.id))!.archivedAt).toBeDefined();
    expect((await sessionService.getSession(reset.body.sessionId))!.messages).toEqual([]);
    expect(adapter.histories).toHaveLength(1);
    await request(app).post('/api/chat/stream').send({ sessionId: reset.body.sessionId, messages: [{ role: 'user', content: 'new-input' }] }).expect(200);
    const fresh = await sessionService.getSession(reset.body.sessionId);
    const repeated = await request(app).post('/api/discord/sessions/reset').send(body).expect(200);
    expect(repeated.body).toEqual(reset.body);
    expect(await sessionService.getSession(reset.body.sessionId)).toEqual(fresh);
    expect(fresh!.archivedAt).toBeUndefined();
    const restarted = new SessionService(new JsonSessionStorage(dataDirectory));
    expect((await restarted.resolveDiscordSession(guildId, channelId)).id).toBe(reset.body.sessionId);
    expect((await restarted.resolveDiscordSession(guildId, '333333333333333333')).id).toBe(other.id);
  });
  it('拒绝浏览器来源非法目标和跨频道目标且不改日志', async () => {
    const { sessionService, source } = await createTestContext();
    const app = createApp({ sessionService, chatStreamSource: source, allowedOrigins: ['http://localhost:3000'] });
    const old = await sessionService.resolveDiscordSession(guildId, channelId);
    const web = await sessionService.createSession(); const body = { guildId, channelId, sessionId: old.id };
    await request(app).post('/api/discord/sessions/reset').set('Origin', 'http://localhost:3000').send(body).expect(403);
    for (const invalid of [{ ...body, sessionId: 'bad' }, { ...body, guildId: 'bad' }, {}, { ...body, sessionId: web.id }, { ...body, channelId: '333333333333333333' }]) {
      await request(app).post('/api/discord/sessions/reset').send(invalid).expect(400);
    }
    await request(app).post('/api/discord/sessions/reset').send({ ...body, sessionId: '11111111-1111-4111-8111-111111111111' }).expect(404);
    expect(await sessionService.getSession(old.id)).toEqual(old); expect(await sessionService.getSession(web.id)).toEqual(web);
    await request(createApp()).post('/api/discord/sessions/reset').send(body).expect(503);
  });
  it('生成期间 Web归档和频道重置返回409回复完成后可正常归档', async () => {
    const { app, source, sessionService } = await createTestContext();
    const old = await sessionService.resolveDiscordSession(guildId, channelId);
    const iterator = source({ sessionId: old.id, messages: [{ role: 'user', content: 'in-progress' }] }, { signal: new AbortController().signal })[Symbol.asyncIterator]();
    await iterator.next();
    try {
      const archive = await request(app).post(`/api/sessions/${old.id}/archive`).expect(409);
      const reset = await request(app).post('/api/discord/sessions/reset').send({ guildId, channelId, sessionId: old.id }).expect(409);
      expect(archive.body.error.code).toBe('REQUEST_CONFLICT'); expect(reset.body.error.code).toBe('REQUEST_CONFLICT');
      expect((await sessionService.getSession(old.id))!.archivedAt).toBeUndefined();
      expect((await iterator.next()).value.event).toBe('done'); await iterator.next();
    } finally { await iterator.return?.(); }
    expect((await sessionService.getSession(old.id))!.messages.map(m => m.role)).toEqual(['user', 'assistant']);
    await request(app).post(`/api/sessions/${old.id}/archive`).expect(200);
    await request(app).post('/api/discord/sessions/reset').send({ guildId, channelId, sessionId: old.id }).expect(200);
  });
  it('重置归档写入期间生成和第二个重置也立即冲突', async () => {
    const { app, source, storage, sessionService, adapter } = await createTestContext();
    const old = await sessionService.resolveDiscordSession(guildId, channelId);
    const original = storage.archiveSession.bind(storage);
    let entered!: () => void, finish!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    const gate = new Promise<void>(resolve => { finish = resolve; });
    vi.spyOn(storage, 'archiveSession').mockImplementationOnce(async id => { entered(); await gate; return original(id); });
    const body = { guildId, channelId, sessionId: old.id };
    const pending = request(app).post('/api/discord/sessions/reset').send(body).then(response => response);
    await started;
    try {
      const events = [];
      for await (const event of source({ sessionId: old.id, messages: [{ role: 'user', content: 'blocked' }] }, { signal: new AbortController().signal })) events.push(event);
      expect(events[0]).toMatchObject({ event: 'error', data: { error: { code: 'REQUEST_CONFLICT' } } });
      await request(app).post('/api/discord/sessions/reset').send(body).expect(409);
      await request(app).post(`/api/sessions/${old.id}/archive`).expect(409);
      expect(adapter.histories).toHaveLength(0);
    } finally { finish(); }
    expect((await pending).status).toBe(200);
  });
  it('归档失败保持旧会话且释放锁允许随后重置', async () => {
    const { app, storage, sessionService } = await createTestContext();
    const old = await sessionService.resolveDiscordSession(guildId, channelId);
    vi.spyOn(storage, 'archiveSession').mockRejectedValueOnce(new Error('raw-secret'));
    const body = { guildId, channelId, sessionId: old.id };
    const failed = await request(app).post('/api/discord/sessions/reset').send(body).expect(500);
    expect(JSON.stringify(failed.body)).not.toContain('raw-secret'); expect(await sessionService.getSession(old.id)).toEqual(old);
    await request(app).post('/api/discord/sessions/reset').send(body).expect(200);
  });
  it('归档成功而新关联解析失败不宣称成功下一次解析自然恢复', async () => {
    const { app, storage, sessionService } = await createTestContext();
    const old = await sessionService.resolveDiscordSession(guildId, channelId);
    vi.spyOn(storage, 'resolveDiscordSession').mockRejectedValueOnce(new Error('raw-secret'));
    const body = { guildId, channelId, sessionId: old.id };
    await request(app).post('/api/discord/sessions/reset').send(body).expect(500);
    expect((await sessionService.getSession(old.id))!.archivedAt).toBeDefined();
    const recovered = await request(app).post('/api/discord/sessions/resolve').send({ guildId, channelId }).expect(200);
    expect(recovered.body.sessionId).not.toBe(old.id);
    const repeated = await request(app).post('/api/discord/sessions/reset').send(body).expect(200);
    expect(repeated.body.sessionId).toBe(recovered.body.sessionId);
    expect((await sessionService.getSession(recovered.body.sessionId))!.archivedAt).toBeUndefined();
  });
  it('Bot经真实本机HTTP重置后下一条聊天只包含新会话输入', async () => {
    const { app, adapter, sessionService } = await createTestContext(); const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address() as { port: number }; const client = new BackendClient({ baseUrl: `http://127.0.0.1:${address.port}` });
    const message = { id: 'm', userId: '333333333333333333', guildId, channelId, content: 'before' };
    try {
      await client.chat(message); const old = await sessionService.resolveDiscordSession(guildId, channelId);
      expect(await client.reset({ ...message, content: '/reset' })).toContain('已重置');
      await client.chat({ ...message, id: 'next', content: 'after' });
      expect(adapter.histories.map(history => history.map(m => m.content))).toEqual([['before'], ['after']]);
      expect((await sessionService.getSession(old.id))!.messages.map(m => m.content)).toEqual(['before', '回复']);
    } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  });
});
