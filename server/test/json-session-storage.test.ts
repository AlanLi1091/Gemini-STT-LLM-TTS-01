// @vitest-environment node
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { Message } from '@core/index';
import { JsonSessionStorage } from '../storage/json-session-storage';
import { DuplicateMessageIdError, SessionNotFoundError } from '../storage/session-storage';

const temporaryDirectories: string[] = [];

async function createStorage(): Promise<{ storage: JsonSessionStorage; dataDirectory: string }> {
  const dataDirectory = await mkdtemp(join(tmpdir(), 'gemini-session-storage-'));
  temporaryDirectories.push(dataDirectory);
  return { storage: new JsonSessionStorage(dataDirectory), dataDirectory };
}

function message(id: string, content: string): Message {
  return { id, role: 'user', content, createdAt: 1_700_000_000_000 };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe('Task 14 Step 1: JSON 会话存储层', () => {
  it('创建 UUID 会话，并为每个会话写入单独 JSON 文件', async () => {
    const { storage, dataDirectory } = await createStorage();
    const session = await storage.createSession();

    expect(session.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(session.messages).toEqual([]);
    await expect(readFile(join(dataDirectory, `${session.id}.json`), 'utf8'))
      .resolves.toContain(`"id": "${session.id}"`);
  });

  it('追加消息后可由新的存储实例完整读取，且保留顺序', async () => {
    const { storage, dataDirectory } = await createStorage();
    const session = await storage.createSession();
    await storage.appendMessage(session.id, message('message-1', '第一条'));
    await storage.appendMessage(session.id, message('message-2', '第二条'));

    const reloaded = new JsonSessionStorage(dataDirectory);
    await expect(reloaded.getSession(session.id)).resolves.toMatchObject({
      id: session.id,
      messages: [message('message-1', '第一条'), message('message-2', '第二条')],
    });
  });

  it('拒绝覆盖已有消息 ID，保证日志严格仅追加', async () => {
    const { storage } = await createStorage();
    const session = await storage.createSession();
    await storage.appendMessage(session.id, message('message-1', '原始内容'));

    await expect(storage.appendMessage(session.id, message('message-1', '篡改内容')))
      .rejects.toBeInstanceOf(DuplicateMessageIdError);
    await expect(storage.getSession(session.id)).resolves.toMatchObject({
      messages: [message('message-1', '原始内容')],
    });
  });

  it('隔离不同会话，并对不存在的会话拒绝追加', async () => {
    const { storage } = await createStorage();
    const first = await storage.createSession();
    const second = await storage.createSession();
    await storage.appendMessage(first.id, message('message-1', '只属于第一会话'));

    await expect(storage.getSession(second.id)).resolves.toMatchObject({ messages: [] });
    await expect(storage.appendMessage('missing-session', message('message-2', '不存在')))
      .rejects.toBeInstanceOf(SessionNotFoundError);
  });

  it('串行化同一会话的并发追加，避免丢失消息', async () => {
    const { storage } = await createStorage();
    const session = await storage.createSession();

    await Promise.all([
      storage.appendMessage(session.id, message('message-1', '第一条')),
      storage.appendMessage(session.id, message('message-2', '第二条')),
    ]);

    await expect(storage.getSession(session.id)).resolves.toMatchObject({
      messages: [message('message-1', '第一条'), message('message-2', '第二条')],
    });
  });
});
