// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { RequestScheduler } from '../request-scheduler';
const input = { guildId: 'g', channelId: 'c', userId: 'u' };
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
describe('Task 17 Step 1: 请求调度', () => {
  it('禁用等待时已完成请求立即释放频道', async () => {
    const scheduler = new RequestScheduler({ maxPending: 0, cooldownMs: 0 });
    await scheduler.schedule(input, async () => {});
    await expect(scheduler.schedule(input, async () => 'next')).resolves.toBe('next');
  });
  it('同频道 FIFO 串行，其他频道可并行', async () => {
    const scheduler = new RequestScheduler({ cooldownMs: 0 }); const order: number[] = []; let finish!: () => void;
    const first = scheduler.schedule(input, async () => { order.push(1); await new Promise<void>(r => { finish = r; }); order.push(2); });
    const second = scheduler.schedule(input, async () => { order.push(3); });
    await scheduler.schedule({ ...input, channelId: 'other' }, async () => { order.push(4); });
    expect(order).toEqual([1, 4]); finish(); await Promise.all([first, second]); expect(order).toEqual([1, 4, 2, 3]);
  });
  it('队满拒绝且不占用被拒用户的冷却', async () => {
    let now = 0; const scheduler = new RequestScheduler({ maxPending: 1, now: () => now }); let finish!: () => void;
    const first = scheduler.schedule(input, () => new Promise<void>(r => { finish = r; }));
    const second = scheduler.schedule({ ...input, userId: 'u2' }, async () => {});
    await expect(scheduler.schedule({ ...input, userId: 'u3' }, async () => {})).rejects.toThrow('队列已满');
    finish(); await Promise.all([first, second]);
    await expect(scheduler.schedule({ ...input, userId: 'u3' }, async () => {})).resolves.toBeUndefined();
    now = 5000;
  });
  it('用户冷却跨频道生效且到期恢复', async () => {
    let now = 0; const scheduler = new RequestScheduler({ now: () => now });
    await scheduler.schedule(input, async () => {});
    now = 4999; await expect(scheduler.schedule({ ...input, channelId: 'other' }, async () => {})).rejects.toThrow('冷却');
    now = 5000; await expect(scheduler.schedule(input, async () => {})).resolves.toBeUndefined();
  });
  it('失败释放频道并继续下一个请求', async () => {
    const scheduler = new RequestScheduler({ cooldownMs: 0 });
    const first = expect(scheduler.schedule(input, async () => { throw new Error('failure'); })).rejects.toThrow('failure');
    const next = scheduler.schedule(input, async () => 'next'); await first; await expect(next).resolves.toBe('next');
  });
  it('退出中止活动请求并拒绝等待及新请求', async () => {
    const scheduler = new RequestScheduler({ cooldownMs: 0 }); let signal!: AbortSignal; let finish!: () => void; let ran = false;
    const first = scheduler.schedule(input, s => { signal = s; return new Promise<void>(r => { finish = r; }); });
    const waiting = expect(scheduler.schedule(input, async () => { ran = true; })).rejects.toThrow('停止');
    scheduler.stop(); expect(signal.aborted).toBe(true); await waiting; finish(); await first; await flush(); expect(ran).toBe(false);
    await expect(scheduler.schedule(input, async () => {})).rejects.toThrow('停止');
  });
  it('拒绝无效调度配置', () => { expect(() => new RequestScheduler({ maxPending: -1 })).toThrow(); expect(() => new RequestScheduler({ cooldownMs: NaN })).toThrow(); });
});
