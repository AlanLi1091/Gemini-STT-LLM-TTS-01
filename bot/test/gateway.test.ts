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
  const gateway = await startGateway({ token: 'fake-secret', schedulerOptions: { cooldownMs: 0 }, client, log, resolveInput, handleInput, ...options });
  stops.push(gateway.stop);
  return { client, destroy, log, resolveInput, handleInput, ...gateway };
}
function message() {
  return { channel: { isSendable: () => true, sendTyping: vi.fn().mockResolvedValue(undefined), send: vi.fn().mockResolvedValue({}) }, reply: vi.fn().mockResolvedValue({}) };
}
function emit(client: Client, value: ReturnType<typeof message>) {
  client.emit(Events.MessageCreate, value as unknown as ClientEvents[Events.MessageCreate][0]);
}
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };

describe('Task 16 Step 1: Bot 网关骨架', () => {
  it('清理资源同步失败仍移除监听器且日志脱敏', async () => {
    const { client, destroy, stop, log } = await setup(); destroy.mockImplementationOnce(() => { throw new Error('fake-secret'); });
    expect(stop).not.toThrow(); expect(client.listenerCount(Events.MessageCreate)).toBe(0); expect(JSON.stringify(log.mock.calls)).not.toContain('fake-secret');
  });
  it('错误提示等待期间退出不发送备用频道提示', async () => {
    const { client, handleInput, stop } = await setup(); handleInput.mockRejectedValueOnce(new BackendError('fake-secret'));
    const msg = message(); let fail!: () => void;
    msg.reply.mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = () => reject(new Error('fake-secret')); }));
    emit(client, msg); await flush(); stop(); fail(); await flush(); expect(msg.channel.send).not.toHaveBeenCalled();
  });
  it('原消息失效时备用频道提示一次且后续请求继续', async () => {
    const { client } = await setup(); const first = message(); first.reply.mockRejectedValueOnce({ code: 10008, message: 'fake-secret' });
    emit(client, first); await flush();
    expect(first.channel.send).toHaveBeenCalledWith({ content: expect.stringContaining('原消息'), allowedMentions: { parse: [], repliedUser: false } });
    const next = message(); emit(client, next); await flush(); expect(next.reply).toHaveBeenCalledOnce();
  });
  it('错误回复与备用提示都失败不递归重试或卡住队列', async () => {
    const { client, handleInput, log } = await setup(); handleInput.mockRejectedValueOnce(new BackendError('fake-secret'));
    const first = message(); first.reply.mockRejectedValue({ code: 50013 }); first.channel.send.mockRejectedValue(new Error('fake-secret'));
    emit(client, first); await flush(); expect(first.reply).toHaveBeenCalledOnce(); expect(first.channel.send).toHaveBeenCalledOnce();
    expect(JSON.stringify(log.mock.calls)).not.toContain('fake-secret'); const next = message(); emit(client, next); await flush(); expect(next.reply).toHaveBeenCalledOnce();
  });
  it('部分段落发送失败只提示中断，不重发已发送段落', async () => {
    const { client } = await setup({ handleInput: async () => '长'.repeat(6001) }); const msg = message();
    msg.channel.send.mockResolvedValueOnce({}).mockRejectedValueOnce({ code: 50013 }); emit(client, msg); await flush();
    expect(msg.reply).toHaveBeenCalledOnce(); expect(msg.channel.send).toHaveBeenCalledTimes(3); expect(msg.channel.send.mock.calls[2][0].content).toContain('已发送 2 段');
  });
  it('前一轮完整回复发送完才开始下一轮 typing 和模型请求', async () => {
    const { client, handleInput } = await setup(); const first = message(), second = message();
    let finish!: () => void;
    first.reply.mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve({}); }));
    emit(client, first); await flush(); emit(client, second); await flush();
    expect(handleInput).toHaveBeenCalledOnce(); expect(second.channel.sendTyping).not.toHaveBeenCalled();
    finish(); await flush(); expect(handleInput).toHaveBeenCalledTimes(2); expect(second.reply).toHaveBeenCalledOnce();
  });
  it('冷却拒绝给出安全反馈且不调用后端', async () => {
    const { client, handleInput } = await setup({ schedulerOptions: { cooldownMs: 5000 } });
    emit(client, message()); await flush(); const next = message(); emit(client, next); await flush();
    expect(handleInput).toHaveBeenCalledOnce(); expect(next.channel.sendTyping).not.toHaveBeenCalled();
    expect(next.reply).toHaveBeenCalledWith({ content: expect.stringContaining('冷却'), allowedMentions: { parse: [], repliedUser: false } });
  });
  it('频道队满给出提示且不调用后端', async () => {
    let finish!: (content: string) => void;
    const handler = vi.fn(() => new Promise<string>(resolve => { finish = resolve; }));
    const { client } = await setup({ schedulerOptions: { maxPending: 0, cooldownMs: 0 }, handleInput: handler });
    emit(client, message()); await flush(); const next = message(); emit(client, next); await flush();
    expect(next.reply).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining('队列已满') }));
    expect(handler).toHaveBeenCalledOnce();
    expect(next.channel.sendTyping).not.toHaveBeenCalled(); finish('完成'); await flush();
  });
  it('退出时排队消息不开始处理或发送停止提示', async () => {
    let finish!: (content: string) => void; const handler = vi.fn(() => new Promise<string>(resolve => { finish = resolve; }));
    const { client, stop } = await setup({ handleInput: handler });
    emit(client, message()); const next = message(); emit(client, next); await flush();
    stop(); finish('完成'); await flush(); expect(handler).toHaveBeenCalledOnce(); expect(next.reply).not.toHaveBeenCalled();
  });
  it('拒绝无效环境限流配置', () => {
    expect(() => readBotConfig({ DISCORD_BOT_TOKEN: 'fake', DISCORD_TEST_CHANNEL_ID: '123456789012345678', DISCORD_MAX_PENDING: '-1' })).toThrow('调度配置');
  });
  it('后端错误给出可读反馈并继续处理后续消息', async () => {
    const { client, handleInput } = await setup();
    handleInput.mockRejectedValueOnce(new BackendError('后端暂不可用'));
    const first = message(); emit(client, first); await flush();
    expect(first.reply).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining('后端') }));
    const next = message(); emit(client, next); await flush();
    expect(next.reply).toHaveBeenCalledOnce();
  });
  it('长回复首段回复原消息，后续段发送到频道且全部抑制提及', async () => {
    const { client } = await setup({ handleInput: async () => '长'.repeat(2001) });
    const msg = message(); emit(client, msg); await flush();
    expect(msg.reply).toHaveBeenCalledWith({ content: '长'.repeat(2000), allowedMentions: { parse: [], repliedUser: false } });
    expect(msg.channel.send).toHaveBeenCalledWith({ content: '长', allowedMentions: { parse: [], repliedUser: false } });
  });
  it('等待前一段发送成功后才发送下一段', async () => {
    const { client } = await setup({ handleInput: async () => '长'.repeat(4001) });
    const msg = message();
    let finish!: () => void;
    msg.reply.mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve({}); }));
    emit(client, msg); await flush();
    expect(msg.channel.send).not.toHaveBeenCalled();
    finish(); await flush();
    expect(msg.channel.send.mock.calls.map(call => call[0].content)).toEqual(['长'.repeat(2000), '长']);
  });
  it('中途发送失败不重发或继续剩余段，并清理 typing', async () => {
    vi.useFakeTimers();
    const { client, log } = await setup({ handleInput: async () => '长'.repeat(6001) });
    const msg = message(); msg.channel.send.mockRejectedValueOnce(new Error('fake-secret'));
    emit(client, msg); await flush();
    expect(msg.reply).toHaveBeenCalledOnce(); expect(msg.channel.send).toHaveBeenCalledTimes(2);
    expect(msg.channel.send.mock.calls[1][0].content).toContain('已发送 1 段');
    expect(log).toHaveBeenCalledWith('[bot] input failed');
    expect(JSON.stringify(log.mock.calls)).not.toContain('fake-secret');
    await vi.advanceTimersByTimeAsync(14000);
    expect(msg.channel.sendTyping).toHaveBeenCalledOnce();
  });
  it('分段发送期间退出不再发送剩余段', async () => {
    const { client, stop } = await setup({ handleInput: async () => '长'.repeat(4001) });
    const msg = message(); let finish!: () => void;
    msg.reply.mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve({}); }));
    emit(client, msg); await flush(); stop(); finish(); await flush();
    expect(msg.channel.send).not.toHaveBeenCalled();
  });
  it('空白最终回复不发送消息', async () => {
    const { client } = await setup({ handleInput: async () => ' \n ' });
    const msg = message(); emit(client, msg); await flush();
    expect(msg.reply).not.toHaveBeenCalled(); expect(msg.channel.send).not.toHaveBeenCalled();
  });
  it('正式入口读取根目录环境配置并清理空白', () => {
    expect(readBotConfig({ DISCORD_BOT_TOKEN: ' fake-secret ', DISCORD_TEST_CHANNEL_ID: ' 123456789012345678 ' }))
      .toEqual({ token: 'fake-secret', channelId: '123456789012345678', backendUrl: 'http://127.0.0.1:3001', schedulerOptions: { maxPending: 3, cooldownMs: 5000 } });
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
    expect(first.reply).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining('处理失败') }));
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
