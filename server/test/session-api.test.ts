// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
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
  const app = createApp({
    sessionService,
    chatStreamSource: createSessionChatStreamSource(adapter, sessionService),
  });
  return { app, adapter, sessionService, dataDirectory };
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

  it('未携带 sessionId 时保留无状态流式兼容', async () => {
    const { app, adapter } = await createTestContext();
    const response = await request(app)
      .post('/api/chat/stream')
      .send({ messages: [{ role: 'user', content: '无状态请求' }] });

    expect(response.status).toBe(200);
    expect(adapter.histories).toHaveLength(1);
    expect(adapter.histories[0].map((message) => message.content)).toEqual(['无状态请求']);
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
