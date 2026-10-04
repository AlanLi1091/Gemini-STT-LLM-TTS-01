// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Client, Events, type ClientEvents } from 'discord.js';
import { readDemoConfig, startDemo } from '../../bot/demo';

const config = { token: 'test-secret', channelId: '123456789012345678' };
const stops: Array<() => void> = [];
afterEach(() => { stops.splice(0).forEach(stop => stop()); vi.restoreAllMocks(); vi.useRealTimers(); });

async function setup(extra: Parameters<typeof startDemo>[1] = {}) {
  const client = new Client({ intents: [] });
  const login = vi.spyOn(client, 'login').mockResolvedValue('unused');
  const destroy = vi.spyOn(client, 'destroy');
  const log = vi.fn();
  const demo = await startDemo(config, { client, log, ...extra });
  stops.push(demo.stop);
  return { client, login, destroy, log, ...demo };
}
function message(overrides: Record<string, unknown> = {}) {
  return {
    inGuild: () => true, channelId: config.channelId, author: { bot: false },
    webhookId: null, content: '你好 @everyone', reply: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}
async function emitMessage(client: Client, value: ReturnType<typeof message>) {
  client.emit(Events.MessageCreate, value as unknown as ClientEvents[Events.MessageCreate][0]);
  await Promise.resolve();
}

describe('Task 15 Step 2: Discord 最小网关 Demo', () => {
  it('验证必需配置，错误信息不泄露 Token', () => {
    expect(() => readDemoConfig({})).toThrow('DISCORD_BOT_TOKEN');
    expect(() => readDemoConfig({ DISCORD_BOT_TOKEN: config.token })).toThrow('DISCORD_TEST_CHANNEL_ID');
    expect(() => readDemoConfig({ DISCORD_BOT_TOKEN: config.token, DISCORD_TEST_CHANNEL_ID: 'invalid' })).toThrow('频道 ID');
    expect(readDemoConfig({ DISCORD_BOT_TOKEN: ' test-secret ', DISCORD_TEST_CHANNEL_ID: config.channelId })).toEqual(config);
  });
  it('使用服务端 Token 登录并回显测试频道消息，禁止回复触发提及', async () => {
    const { client, login } = await setup();
    const input = message();
    await emitMessage(client, input);
    expect(login).toHaveBeenCalledWith(config.token);
    expect(input.reply).toHaveBeenCalledWith({ content: '[回显] 你好 @everyone', allowedMentions: { parse: [], repliedUser: false } });
  });
  it.each([
    ['其他频道', { channelId: '999999999999999999' }],
    ['机器人', { author: { bot: true } }],
    ['Webhook', { webhookId: '123' }],
    ['私信', { inGuild: () => false }],
    ['空白消息', { content: '  ' }],
  ])('忽略%s消息', async (_name, overrides) => {
    const { client } = await setup();
    const input = message(overrides);
    await emitMessage(client, input);
    expect(input.reply).not.toHaveBeenCalled();
  });
  it('长回显不超过 2000 字符且不截断代理对', async () => {
    const { client } = await setup();
    const input = message({ content: 'a'.repeat(1994) + '😀尾' });
    await emitMessage(client, input);
    const content = input.reply.mock.calls[0][0].content;
    expect(content).toHaveLength(1999);
    expect(content).not.toMatch(/[\uD800-\uDBFF]$/);
  });
  it('回复失败后仍可处理下一条消息且日志不含错误原文', async () => {
    const { client, log } = await setup();
    const failed = message({ reply: vi.fn().mockRejectedValue({ code: 50013, message: config.token }) });
    await emitMessage(client, failed);
    const next = message();
    await emitMessage(client, next);
    expect(next.reply).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('code=50013'));
    expect(JSON.stringify(log.mock.calls)).not.toContain(config.token);
  });
  it('记录连接恢复与内存数据，停止后清理定时器和监听器', async () => {
    vi.useFakeTimers();
    const { client, destroy, log, stop } = await setup();
    client.emit(Events.ShardReconnecting, 0);
    client.emit(Events.ShardResume, 0, 2);
    client.emit(Events.ShardReady, 0, new Set());
    client.emit(Events.ClientReady, client as Client<true>);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('resumed'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('memory rssMiB='));
    vi.advanceTimersByTime(30000);
    stop(); stop();
    expect(destroy).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    expect(client.listenerCount(Events.MessageCreate)).toBe(0);
  });
  it('登录失败时清理资源并返回不含 Token 的操作指引', async () => {
    const client = new Client({ intents: [] });
    vi.spyOn(client, 'login').mockRejectedValue(new Error(config.token));
    const destroy = vi.spyOn(client, 'destroy');
    await expect(startDemo(config, { client, log: vi.fn() })).rejects.toThrow('请检查 Token');
    expect(destroy).toHaveBeenCalledOnce();
    expect(client.listenerCount(Events.MessageCreate)).toBe(0);
  });
  it('致命网关鉴权错误停止 Demo 并通知入口', async () => {
    const onFatal = vi.fn();
    const { client, destroy } = await setup({ onFatal });
    client.emit(Events.ShardDisconnect, { code: 4014 } as ClientEvents[Events.ShardDisconnect][0], 0);
    expect(destroy).toHaveBeenCalledOnce();
    expect(onFatal).toHaveBeenCalledOnce();
  });
  it('会话失效时停止，SDK 错误原文不进入日志', async () => {
    const onFatal = vi.fn();
    const { client, log, destroy } = await setup({ onFatal });
    client.emit(Events.Error, new Error(config.token));
    client.emit(Events.ShardError, new Error(config.token), 0);
    client.emit(Events.Invalidated);
    expect(destroy).toHaveBeenCalledOnce();
    expect(onFatal).toHaveBeenCalledOnce();
    expect(JSON.stringify(log.mock.calls)).not.toContain(config.token);
  });
  it('退出信号在登录期间也能清理网关资源', async () => {
    const client = new Client({ intents: [] });
    const controller = new AbortController();
    let rejectLogin: (error: Error) => void;
    vi.spyOn(client, 'login').mockImplementation(() => new Promise((_resolve, reject) => { rejectLogin = reject; }));
    const destroy = vi.spyOn(client, 'destroy');
    const started = startDemo(config, { client, signal: controller.signal, log: vi.fn() });
    controller.abort();
    rejectLogin!(new Error('interrupted'));
    await started;
    expect(destroy).toHaveBeenCalledOnce();
  });
});
