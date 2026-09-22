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
  return { app, adapter };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe('Task 14 Step 2: 会话 API 与多轮上下文', () => {
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
