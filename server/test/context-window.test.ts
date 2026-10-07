// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { ChatError, type ChatAdapter, type Message } from '@core/index';
import { ContextWindow, historyTurns, readContextConfig } from '../context-window';

const user = (content: string, id = content): Message => ({ id, content, role: 'user', createdAt: 1 });
const assistant = (content: string): Message => ({ ...user(content), role: 'assistant' });
const system = (content: string): Message => ({ ...user(content), role: 'system' });
const signal = () => new AbortController().signal;
const adapter = (counter?: ChatAdapter['countTokens']): ChatAdapter => ({
  id: 'fixture', name: 'Fixture', send: async () => ({ content: 'ok' }),
  stream: async function* () { yield { delta: '', accumulated: 'ok', done: true }; },
  ...(counter ? { countTokens: counter } : {}),
});

describe('P0-1: 有限上下文窗口', () => {
  it('过滤 system 与孤立 assistant 连续 user 分别成轮且不修改原数组', async () => {
    const history = [assistant('orphan'), system('untrusted'), user('a'), user('b'), assistant('reply-b')];
    const before = JSON.stringify(history);
    expect(historyTurns(history).map(turn => turn.map(m => m.content))).toEqual([['a'], ['b', 'reply-b']]);
    const policy = new ContextWindow({ historyTurns: 1 });
    expect((await policy.select(history, [user('current')], adapter(), signal())).map(m => m.content)).toEqual(['b', 'reply-b', 'current']);
    expect(JSON.stringify(history)).toBe(before);
  });
  it('零历史轮数和只有本轮输入均以 user 开始', async () => {
    const policy = new ContextWindow({ historyTurns: 0 });
    expect(await policy.select([user('old'), assistant('reply')], [user('current')], adapter(), signal())).toEqual([user('current')]);
    expect(await policy.select([], [user('current')], adapter(), signal())).toEqual([user('current')]);
    expect(await policy.select([], [assistant('orphan')], adapter(), signal())).toEqual([]);
  });
  it('长历史从最旧整轮裁剪保留最近连续轮次和完整本轮正文', async () => {
    const history = Array.from({ length: 100 }, (_, i) => [user(`u-${i}`), assistant(`a-${i}`)]).flat();
    const policy = new ContextWindow({ historyTurns: 2 });
    const selected = await policy.select(history, [user('current')], adapter(), signal());
    expect(selected.map(m => m.content)).toEqual(['u-98', 'a-98', 'u-99', 'a-99', 'current']);
    expect(history).toHaveLength(200);
  });
  it('中文英文 emoji 和代码按 UTF-8 字节及开销估算不按字符数替代 token', () => {
    const policy = new ContextWindow();
    expect(policy.estimate([user('中')])).toBeGreaterThan(policy.estimate([user('a')]));
    expect(policy.estimate([user('😀')])).toBeGreaterThan(policy.estimate([user('中')]));
    expect(policy.estimate([user('const x = 1;')])).toBeGreaterThan(policy.estimate([user('a')]));
  });
  it('低于八成预算不调计数边缘区只计内容并加配置系统估算', async () => {
    const counter = vi.fn(async (_messages: Message[]) => 100);
    const policy = new ContextWindow({ inputTokens: 1000, systemInstruction: 'trusted' });
    await policy.select([], [user('short')], adapter(counter), signal());
    expect(counter).not.toHaveBeenCalled();
    expect(await policy.select([], [user('x'.repeat(400))], adapter(counter), signal())).toHaveLength(1);
    expect(counter).toHaveBeenCalledOnce();
    expect(counter.mock.calls[0][0].some((m: Message) => m.role === 'system')).toBe(false);
  });
  it('精确超限后整轮缩减且每次选择最多计数两次', async () => {
    const counter = vi.fn().mockResolvedValueOnce(2000).mockResolvedValueOnce(100);
    const policy = new ContextWindow({ inputTokens: 1000 });
    const current = user('x'.repeat(300));
    const selected = await policy.select([user('h'.repeat(150))], [current], adapter(counter), signal());
    expect(selected).toEqual([current]); expect(counter).toHaveBeenCalledTimes(2);
  });
  it('计数失败退回八成保守窗口没有计数能力也使用同一降级', async () => {
    const policy = new ContextWindow({ inputTokens: 1000 });
    const current = user('x'.repeat(300)); const history = [user('h'.repeat(150))];
    const selected = await policy.select(history, [current], adapter(async () => { throw new Error('count unavailable'); }), signal());
    expect(selected).toEqual([current]); expect(policy.estimate(selected)).toBeLessThanOrEqual(800);
    expect(await policy.select(history, [current], adapter(), signal())).toEqual([current]);
  });
  it('计数次数预算独立耗尽后降级且不增加上游计数调用', async () => {
    const counter = vi.fn(async () => 100); const model = adapter(counter);
    const policy = new ContextWindow({ inputTokens: 1000, countsPerMinute: 1 });
    const current = user('x'.repeat(300)); const history = [user('h'.repeat(150))];
    await policy.select(history, [current], model, signal());
    expect(await policy.select(history, [current], model, signal())).toEqual([current]);
    expect(counter).toHaveBeenCalledOnce();
  });
  it('计数超时会中止并降级即使计数器不响应 AbortSignal', async () => {
    vi.useFakeTimers();
    try {
      let upstreamSignal: AbortSignal | undefined;
      const policy = new ContextWindow({ inputTokens: 1000, countTimeoutMs: 30 });
      const pending = policy.select([user('h'.repeat(150))], [user('x'.repeat(300))], adapter((_messages, options) => {
        upstreamSignal = options?.signal; return new Promise(() => {});
      }), signal());
      await vi.advanceTimersByTimeAsync(30);
      expect(await pending).toHaveLength(1); expect(upstreamSignal?.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
  });
  it('用户取消计数不降级生成并清理超时定时器', async () => {
    vi.useFakeTimers();
    try {
      const controller = new AbortController();
      const policy = new ContextWindow({ inputTokens: 1000 });
      const pending = expect(policy.select([], [user('x'.repeat(400))], adapter(async () => new Promise(() => {})), controller.signal)).rejects.toMatchObject({ code: 'ABORTED' });
      controller.abort(); await pending; expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
  });
  it('最小输入精确或保守超限返回固定错误且不截断正文', async () => {
    const policy = new ContextWindow({ inputTokens: 1000 });
    await expect(policy.select([], [user('x'.repeat(1000))], adapter(), signal())).rejects.toMatchObject({ code: 'CONTEXT_LIMIT' });
    await expect(policy.select([], [user('x'.repeat(400))], adapter(async () => 2000), signal())).rejects.toMatchObject({ code: 'CONTEXT_LIMIT' });
  });
  it('非法参数及过大配置系统指令在启动拒绝', () => {
    expect(() => new ContextWindow({ inputTokens: 0 })).toThrow('configuration');
    expect(() => new ContextWindow({ historyTurns: -1 })).toThrow('configuration');
    expect(() => new ContextWindow({ countsPerMinute: 0 })).toThrow('configuration');
    expect(() => new ContextWindow({ systemInstruction: 'x'.repeat(10000) })).toThrow('system instruction');
    expect(() => new ContextWindow(readContextConfig({ CHAT_MAX_OUTPUT_TOKENS: '' }))).toThrow('configuration');
  });
  it('用量校准只提高系数有上限仅存内存且日志不含正文', () => {
    const log = vi.fn(); const policy = new ContextWindow({}, { log }); const messages = [user('secret-body')];
    const initial = policy.estimate(messages);
    policy.observe(messages, 10000); const increased = policy.estimate(messages);
    expect(increased).toBeGreaterThan(initial); expect(increased).toBe(Math.ceil((256 + 32 + 11) * 4));
    policy.observe(messages, 1); expect(policy.estimate(messages)).toBe(increased);
    policy.observe(messages, NaN); expect(policy.estimate(messages)).toBe(increased);
    expect(new ContextWindow().estimate(messages)).toBe(initial);
    expect(log).toHaveBeenCalledOnce(); expect(log.mock.calls[0][0]).not.toContain('secret-body');
  });
  it('计数鉴权失败不静默降级重复调用上游', async () => {
    const policy = new ContextWindow({ inputTokens: 1000 });
    await expect(policy.select([], [user('x'.repeat(400))], adapter(async () => { throw new ChatError('auth', 'AUTH_ERROR'); }), signal())).rejects.toMatchObject({ code: 'AUTH_ERROR' });
  });
});
