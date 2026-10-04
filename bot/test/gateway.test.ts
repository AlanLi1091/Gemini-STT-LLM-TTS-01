// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Client, Events, type ClientEvents } from 'discord.js';
import { startGateway } from '../gateway';
import { readBotConfig } from '../index';
import { BackendError } from '../backend-client';

const input = { id: 'm1', guildId: 'g1', channelId: 'c1', userId: 'u1', content: 'hello' };
const stops: Array<() => void> = [];
afterEach(() => { stops.splice(0).forEach(stop => stop()); vi.restoreAllMocks(); vi.useRealTimers(); });
async function setup(options: Partial<Parameters<typeof startGateway>[0]> = {}) {
  const client = new Client({ intents: [] });
  vi.spyOn(client, 'login').mockResolvedValue('unused');
  const destroy = vi.spyOn(client, 'destroy');
  const log = vi.fn();
  const resolveInput = vi.fn(() => input);
  const handleInput = vi.fn().mockResolvedValue('已收到；模型对话将在下一步接入。');
  const gateway = await startGateway({ token: 'fake-secret', client, log, resolveInput, handleInput, ...options });
  stops.push(gateway.stop);
  return { client, destroy, log, resolveInput, handleInput, ...gateway };
}
function message() {
  return { channel: { sendTyping: vi.fn().mockResolvedValue(undefined) }, reply: vi.fn().mockResolvedValue({}) };
}
function emit(client: Client, value: ReturnType<typeof message>) {
  client.emit(Events.MessageCreate, value as unknown as ClientEvents[Events.MessageCreate][0]);
}
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

describe('Task 16 Step 1: Bot 网关骨架', () => {
  it('后端错误给出可读反馈并继续处理后续消息', async () => {
    const { client, handleInput } = await setup();
    handleInput.mockRejectedValueOnce(new BackendError('后端暂不可用'));
    const first = message(); emit(client, first); await flush();
    expect(first.reply).toHaveBeenCalledWith(expect.objectContaining({ content: '后端暂不可用' }));
    const next = message(); emit(client, next); await flush();
    expect(next.reply).toHaveBeenCalledOnce();
  });
  it('未实现分段时过长回复发送简短指引，保留后端完整结果', async () => {
    const { client } = await setup({ handleInput: async () => '长'.repeat(2001) });
    const msg = message(); emit(client, msg); await flush();
    expect(msg.reply.mock.calls[0][0].content.length).toBeLessThanOrEqual(2000);
    expect(msg.reply.mock.calls[0][0].content).toContain('过长');
  });
  it('正式入口读取根目录环境配置并清理空白', () => {
    expect(readBotConfig({ DISCORD_BOT_TOKEN: ' fake-secret ', DISCORD_TEST_CHANNEL_ID: ' 123456789012345678 ' }))
      .toEqual({ token: 'fake-secret', channelId: '123456789012345678', backendUrl: 'http://127.0.0.1:3001' });
  });
  it('缺少 Token 或无效频道时给出配置指引', () => {
    expect(() => readBotConfig({})).toThrow('DISCORD_BOT_TOKEN');
    expect(() => readBotConfig({ DISCORD_BOT_TOKEN: 'fake-secret' })).toThrow('DISCORD_TEST_CHANNEL_ID');
    expect(() => readBotConfig({ DISCORD_BOT_TOKEN: 'fake-secret', DISCORD_TEST_CHANNEL_ID: 'general' })).toThrow('频道 ID');
  });
  it('只对标准化后的有效输入显示 typing 并发送入口反馈', async () => {
    const { client, handleInput } = await setup();
    const msg = message(); emit(client, msg); await flush();
    expect(msg.channel.sendTyping).toHaveBeenCalledOnce();
    expect(handleInput).toHaveBeenCalledWith(input, expect.any(AbortSignal));
    expect(msg.reply).toHaveBeenCalledWith({ content: expect.stringContaining('下一步'), allowedMentions: { parse: [], repliedUser: false } });
  });
  it('过滤掉的消息不显示 typing 或发送反馈', async () => {
    const { client } = await setup({ resolveInput: () => undefined });
    const msg = message(); emit(client, msg); await flush();
    expect(msg.channel.sendTyping).not.toHaveBeenCalled(); expect(msg.reply).not.toHaveBeenCalled();
  });
  it('处理期间刷新 typing，完成后停止刷新', async () => {
    vi.useFakeTimers();
    let finish!: (value: string) => void;
    const { client } = await setup({ handleInput: () => new Promise(resolve => { finish = resolve; }) });
    const msg = message(); emit(client, msg); await flush();
    vi.advanceTimersByTime(7000); await flush();
    expect(msg.channel.sendTyping).toHaveBeenCalledTimes(2);
    finish('完成'); await flush();
    vi.advanceTimersByTime(14000); await flush();
    expect(msg.channel.sendTyping).toHaveBeenCalledTimes(2);
  });
  it('typing 权限错误不阻断后续入口处理', async () => {
    const { client, handleInput, log } = await setup();
    const msg = message(); msg.channel.sendTyping.mockRejectedValue(new Error('fake-secret'));
    emit(client, msg); await flush();
    expect(handleInput).toHaveBeenCalledOnce(); expect(msg.reply).toHaveBeenCalledOnce();
    expect(JSON.stringify(log.mock.calls)).not.toContain('fake-secret');
  });
  it('处理与回复失败后仍可处理新消息，日志不泄露错误原文', async () => {
    const { client, handleInput, log } = await setup();
    handleInput.mockRejectedValueOnce(new Error('fake-secret'));
    const first = message(); emit(client, first); await flush();
    expect(first.reply).not.toHaveBeenCalled();
    const second = message(); second.reply.mockRejectedValue(new Error('fake-secret'));
    emit(client, second); await flush();
    const third = message(); emit(client, third); await flush();
    expect(third.reply).toHaveBeenCalledOnce(); expect(JSON.stringify(log.mock.calls)).not.toContain('fake-secret');
  });
  it('停止时中止处理中请求且不再回复，清理 typing 与监听器', async () => {
    vi.useFakeTimers();
    let finish!: (value: string) => void;
    let signal!: AbortSignal;
    const { client, stop, destroy } = await setup({ handleInput: (_input, value) => { signal = value; return new Promise(resolve => { finish = resolve; }); } });
    const msg = message(); emit(client, msg); await flush();
    stop(); stop(); finish('完成'); await flush();
    expect(signal.aborted).toBe(true); expect(msg.reply).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalledOnce(); expect(client.listenerCount(Events.MessageCreate)).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('退出信号在登录过程中也能停止网关', async () => {
    const client = new Client({ intents: [] });
    const destroy = vi.spyOn(client, 'destroy');
    let rejectLogin!: (error: Error) => void;
    vi.spyOn(client, 'login').mockImplementation(() => new Promise((_resolve, reject) => { rejectLogin = reject; }));
    const controller = new AbortController();
    const pending = startGateway({ token: 'fake-secret', client, signal: controller.signal, log: vi.fn(), resolveInput: () => undefined, handleInput: async () => '' });
    controller.abort(); rejectLogin(new Error('fake-secret')); await pending;
    expect(destroy).toHaveBeenCalledOnce();
  });
  it('登录失败返回安全指引并清理资源', async () => {
    const client = new Client({ intents: [] });
    vi.spyOn(client, 'login').mockRejectedValue(new Error('fake-secret'));
    const destroy = vi.spyOn(client, 'destroy');
    await expect(startGateway({ token: 'fake-secret', client, log: vi.fn(), resolveInput: () => undefined, handleInput: async () => '' })).rejects.toThrow('登录失败');
    expect(destroy).toHaveBeenCalledOnce();
  });
  it('记录恢复事件并在致命配置错误时停止', async () => {
    const onFatal = vi.fn(); const { client, log, destroy } = await setup({ onFatal });
    client.emit(Events.ShardReconnecting, 0); client.emit(Events.ShardResume, 0, 1);
    client.emit(Events.ShardDisconnect, { code: 4014 } as ClientEvents[Events.ShardDisconnect][0], 0);
    expect(log).toHaveBeenCalledWith('[bot] resumed'); expect(onFatal).toHaveBeenCalledOnce(); expect(destroy).toHaveBeenCalledOnce();
  });
});
