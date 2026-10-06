export interface SchedulerOptions { maxPending?: number; cooldownMs?: number; now?: () => number }
export class SchedulerError extends Error {}
interface Job { controller: AbortController; run: () => Promise<() => void>; cancel: () => void }
interface Channel { running: boolean; pending: Job[]; active?: Job }

/** One Bot process owns admission and the complete generation/send lifecycle. */
export class RequestScheduler {
  private readonly channels = new Map<string, Channel>();
  private readonly users = new Map<string, number>();
  private stopped = false;
  private readonly maxPending: number;
  private readonly cooldownMs: number;
  private readonly now: () => number;
  constructor(options: SchedulerOptions = {}) {
    this.maxPending = options.maxPending ?? 3;
    this.cooldownMs = options.cooldownMs ?? 5000;
    this.now = options.now ?? Date.now;
    if (!Number.isSafeInteger(this.maxPending) || this.maxPending < 0 || !Number.isSafeInteger(this.cooldownMs) || this.cooldownMs < 0) throw new Error('无效的 Bot 调度配置。');
  }
  schedule<T>(input: { guildId: string; channelId: string; userId: string }, execute: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (this.stopped) return Promise.reject(new SchedulerError('Bot 已停止。'));
    const now = this.now();
    for (const [user, until] of this.users) if (until <= now) this.users.delete(user);
    const until = this.users.get(input.userId) ?? 0;
    if (until > now) return Promise.reject(new SchedulerError(`发送过快，请等待 ${Math.ceil((until - now) / 1000)} 秒冷却后再试。`));
    const key = `${input.guildId}:${input.channelId}`;
    const channel = this.channels.get(key) ?? { running: false, pending: [] };
    if (channel.running && channel.pending.length >= this.maxPending) return Promise.reject(new SchedulerError('频道队列已满，请稍后再试。'));
    this.users.set(input.userId, now + this.cooldownMs);
    this.channels.set(key, channel);
    const result = new Promise<T>((resolve, reject) => {
      const controller = new AbortController();
      channel.pending.push({ controller,
        run: async () => {
          try { const value = await execute(controller.signal); return () => resolve(value); }
          catch (error) { return () => reject(error); }
        },
        cancel: () => { controller.abort(); reject(new SchedulerError('Bot 已停止。')); },
      });
    });
    if (!channel.running) void this.drain(key, channel);
    return result;
  }
  private async drain(key: string, channel: Channel) {
    channel.running = true;
    while (!this.stopped && channel.pending.length) {
      channel.active = channel.pending.shift()!;
      const settle = await channel.active.run();
      channel.active = undefined;
      // Release the channel before publishing completion to the caller.
      if (!channel.pending.length) {
        channel.running = false;
        if (this.channels.get(key) === channel) this.channels.delete(key);
      }
      settle();
    }
    channel.running = false;
    if (this.channels.get(key) === channel) this.channels.delete(key);
  }
  stop() {
    this.stopped = true;
    for (const channel of this.channels.values()) {
      channel.active?.controller.abort();
      channel.pending.splice(0).forEach(job => job.cancel());
    }
    this.channels.clear(); this.users.clear();
  }
}
