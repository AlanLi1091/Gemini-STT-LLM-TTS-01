// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
  it('频道关联并发解析保持唯一，重启后恢复同一会话', async () => {
    const { storage, dataDirectory } = await createStorage();
    const guildId = '111111111111111111', channelId = '222222222222222222';
    const sessions = await Promise.all(Array.from({ length: 8 }, () => storage.resolveDiscordSession(guildId, channelId)));
    expect(new Set(sessions.map(value => value.id)).size).toBe(1);
    expect(sessions[0].origin).toEqual({ type: 'discord', guildId, channelId });
    const reloaded = new JsonSessionStorage(dataDirectory);
    expect((await reloaded.resolveDiscordSession(guildId, channelId)).id).toBe(sessions[0].id);
  });
  it('隔离不同频道，归档后关联新会话并保留原日志', async () => {
    const { storage } = await createStorage();
    const first = await storage.resolveDiscordSession('111111111111111111', '222222222222222222');
    const second = await storage.resolveDiscordSession('111111111111111111', '333333333333333333');
    expect(second.id).not.toBe(first.id);
    await storage.appendMessage(first.id, message('original', '原日志'));
    await storage.archiveSession(first.id);
    const next = await storage.resolveDiscordSession('111111111111111111', '222222222222222222');
    expect(next.id).not.toBe(first.id);
    expect(next.messages).toEqual([]);
    expect((await storage.getSession(first.id))?.messages).toEqual([message('original', '原日志')]);
  });
  it('拒绝无效频道和损坏关联文件，不静默创建替代会话', async () => {
    const { storage, dataDirectory } = await createStorage();
    await expect(storage.resolveDiscordSession('../bad', '222222222222222222')).rejects.toThrow();
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(dataDirectory, 'discord-bindings.json'), '{bad');
    await expect(storage.resolveDiscordSession('111111111111111111', '222222222222222222')).rejects.toThrow();
  });
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

describe('P0-2: 请求身份存储防线', () => {
  const requestId = '11111111-1111-4111-8111-111111111111';
  const input = (id: string): Message => ({ ...message(id, 'hi'), requestId });
  const reply = (id: string): Message => ({ id, requestId, role: 'assistant', content: 'ok', createdAt: 2, usage: { totalTokens: 3 } });
  it('并发不同消息 ID 的同请求输入仅保存一次', async () => {
    const { storage } = await createStorage(); const session = await storage.createSession();
    const results = await Promise.allSettled([storage.appendMessage(session.id, input('one')), storage.appendMessage(session.id, input('two'))]);
    expect(results.map(r => r.status)).toEqual(['fulfilled', 'rejected']);
    expect((results[1] as PromiseRejectedResult).reason.name).toBe('SessionRequestConflictError');
    expect((await storage.getSession(session.id))!.messages).toEqual([input('one')]);
  });
  it('并发同请求回复仅保存一次且重启后仍拒绝重复回复', async () => {
    const { storage, dataDirectory } = await createStorage(); const session = await storage.createSession();
    await storage.appendMessage(session.id, input('user'));
    const results = await Promise.allSettled([storage.appendMessage(session.id, reply('a1')), storage.appendMessage(session.id, reply('a2'))]);
    expect(results.map(r => r.status)).toEqual(['fulfilled', 'rejected']);
    const reloaded = new JsonSessionStorage(dataDirectory);
    await expect(reloaded.appendMessage(session.id, reply('a3'))).rejects.toMatchObject({ name: 'SessionRequestConflictError' });
    await expect(reloaded.appendMessage(session.id, input('user2'))).rejects.toMatchObject({ name: 'SessionRequestConflictError' });
    expect((await reloaded.getSession(session.id))!.messages).toEqual([input('user'), reply('a1')]);
  });
  it('关联回复缺少末尾输入或会话已归档时拒绝写入', async () => {
    const { storage } = await createStorage(); const session = await storage.createSession();
    await expect(storage.appendMessage(session.id, reply('orphan'))).rejects.toMatchObject({ name: 'SessionRequestConflictError' });
    await storage.appendMessage(session.id, input('user'));
    await storage.appendMessage(session.id, message('later', 'later'));
    await expect(storage.appendMessage(session.id, reply('stale'))).rejects.toMatchObject({ name: 'SessionRequestConflictError' });
    await storage.archiveSession(session.id);
    await expect(storage.appendMessage(session.id, { ...input('new'), requestId: '22222222-2222-4222-8222-222222222222' })).rejects.toMatchObject({ name: 'SessionRequestConflictError' });
    expect((await storage.getSession(session.id))!.messages).toHaveLength(2);
  });
  it('无请求元数据的旧文件仍可追加且非法元数据不写入', async () => {
    const { storage, dataDirectory } = await createStorage(); const session = await storage.createSession();
    await storage.appendMessage(session.id, message('legacy', 'old'));
    const reloaded = new JsonSessionStorage(dataDirectory);
    await reloaded.appendMessage(session.id, input('user'));
    await expect(reloaded.appendMessage(session.id, { ...reply('invalid'), requestId: 'bad' })).rejects.toThrow('Invalid message');
    await reloaded.appendMessage(session.id, reply('valid'));
    expect((await reloaded.getSession(session.id))!.messages.map(m => m.requestId)).toEqual([undefined, requestId, requestId]);
  });
});

describe('Task 20 Step 1: 搜索JSON兼容', () => {
  it.each(['危险协议', '超过三条', '超长URL', '超长摘要', '来源多余字段', '元数据多余字段', '伪造域名'])('读取时拒绝磁盘篡改：%s', async mode => {
    const { storage, dataDirectory } = await createStorage(); const session = await storage.createSession();
    const { normalizeSearchSources, isSearchMetadata } = await import('../search-context');
    const source: Record<string, unknown> = { ...normalizeSearchSources([{ title: '标题', url: 'https://example.com/a', content: '摘要' }], 123)[0] };
    const search: Record<string, unknown> = { status: 'succeeded', sources: [source] };
    if (mode === '危险协议') source.url = 'javascript:alert("secret")';
    if (mode === '超过三条') search.sources = Array.from({ length: 4 }, (_, i) => ({ ...source, index: i + 1 }));
    if (mode === '超长URL') source.url = 'https://example.com/' + 'x'.repeat(2048);
    if (mode === '超长摘要') source.summary = 'x'.repeat(101);
    if (mode === '来源多余字段') source.raw_content = 'secret';
    if (mode === '元数据多余字段') search.query = 'secret';
    if (mode === '伪造域名') source.domain = 'trusted.example';
    expect(isSearchMetadata(search)).toBe(false);
    const path = join(dataDirectory, `${session.id}.json`);
    const tampered = JSON.stringify({ ...session, messages: [{ ...message('reply', '回复'), role: 'assistant', search }] });
    await writeFile(path, tampered);
    await expect(storage.getSession(session.id)).rejects.toThrow('Invalid persisted session');
    await expect(new JsonSessionStorage(dataDirectory).getSession(session.id)).rejects.toThrow('Invalid persisted session');
    expect(await readFile(path, 'utf8')).toBe(tampered);
  });
  it('旧消息仍可读取且读取操作不补写搜索字段', async () => {
    const { storage, dataDirectory } = await createStorage(); const session = await storage.createSession();
    await storage.appendMessage(session.id, message('old', '旧消息'));
    const path = join(dataDirectory, `${session.id}.json`); const before = await readFile(path, 'utf8');
    expect((await new JsonSessionStorage(dataDirectory).getSession(session.id))?.messages[0].searchRequested).toBeUndefined();
    expect(await readFile(path, 'utf8')).toBe(before);
  });
  it('来源元数据重启恢复且返回对象与内部来源深拷贝隔离', async () => {
    const { storage, dataDirectory } = await createStorage(); const session = await storage.createSession();
    const { normalizeSearchSources } = await import('../search-context');
    const search: import('@core/index').SearchMetadata = { status: 'succeeded', sources: normalizeSearchSources([{ title: '标题', url: 'https://example.com/a', content: '摘要' }], 123) };
    const saved = await storage.appendMessage(session.id, { ...message('reply', '回复'), role: 'assistant', search });
    saved.messages[0].search!.sources[0].title = 'mutated'; search.sources[0].summary = 'mutated';
    const restored = await new JsonSessionStorage(dataDirectory).getSession(session.id);
    expect(restored?.messages[0].search?.sources[0]).toMatchObject({ title: '标题', summary: '摘要', retrievedAt: 123 });
  });
  it('拒绝不合法来源状态角色与不安全URL且日志不变', async () => {
    const { storage } = await createStorage(); const session = await storage.createSession();
    const { normalizeSearchSources } = await import('../search-context');
    const sources = normalizeSearchSources([{ title: '标题', url: 'https://example.com', content: '摘要' }], 123);
    const invalid = [
      { ...message('a', 'a'), search: { status: 'succeeded', sources } },
      { ...message('b', 'b'), role: 'assistant', search: { status: 'succeeded', sources: [{ ...sources[0], url: 'javascript:alert(1)' }] } },
      { ...message('c', 'c'), role: 'assistant', search: { status: 'degraded', reason: 'raw provider text', sources: [], notice: 'raw' } },
      { ...message('d', 'd'), searchRequested: 'true' },
    ];
    for (const value of invalid) await expect(storage.appendMessage(session.id, value as Message)).rejects.toThrow();
    expect((await storage.getSession(session.id))?.messages).toEqual([]);
  });
});
