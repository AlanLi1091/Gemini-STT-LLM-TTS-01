import { Client, Events, GatewayIntentBits, type ClientEvents } from 'discord.js';
import type { BotInput } from './message-entry';
import { describeFailure } from './errors';
import { splitMessage } from './split-message';
import { RequestScheduler, SchedulerError, type SchedulerOptions } from './request-scheduler';

export interface GatewayOptions {
  token: string;
  resolveInput: (message: ClientEvents[Events.MessageCreate][0], botId: string) => BotInput | undefined;
  handleInput: (input: BotInput, signal: AbortSignal) => Promise<string>;
  client?: Client;
  signal?: AbortSignal;
  log?: (message: string) => void;
  onFatal?: () => void;
  schedulerOptions?: SchedulerOptions;
}

export async function startGateway(options: GatewayOptions) {
  const client = options.client ?? new Client({ intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent,
  ] });
  const log = options.log ?? console.log;
  const scheduler = new RequestScheduler(options.schedulerOptions);
  const listeners: Array<() => void> = [];
  const requests = new Map<AbortController, ReturnType<typeof setInterval>>();
  let stopped = false;
  let memoryTimer: ReturnType<typeof setInterval> | undefined;
  const on = <E extends keyof ClientEvents>(event: E, listener: (...args: ClientEvents[E]) => void) => {
    const guarded = (...args: ClientEvents[E]) => { if (!stopped) listener(...args); };
    client.on(event, guarded); listeners.push(() => client.off(event, guarded));
  };
  const stop = () => {
    if (stopped) return;
    stopped = true;
    scheduler.stop();
    clearInterval(memoryTimer);
    options.signal?.removeEventListener('abort', stop);
    for (const [controller, timer] of requests) { controller.abort(); clearInterval(timer); }
    requests.clear(); listeners.forEach(remove => remove());
    try { void client.destroy().catch(() => log('[bot] cleanup failed')); }
    catch { log('[bot] cleanup failed'); }
    log('[bot] stopped');
  };
  const notify = async (message: ClientEvents[Events.MessageCreate][0], content: string, channelOnly = false) => {
    if (stopped) return;
    const payload = { content, allowedMentions: { parse: [], repliedUser: false } };
    if (!channelOnly) {
      try { await message.reply(payload); return; }
      catch { log('[bot] error reply failed'); }
    }
    if (stopped) return;
    try {
      if (!message.channel.isSendable()) throw new Error('Channel cannot send messages');
      await message.channel.send(payload);
    } catch { log('[bot] error feedback failed'); }
  };
  const fatal = () => {
    if (stopped) return;
    stop(); options.onFatal?.();
  };
  const memory = () => {
    const { rss, heapUsed } = process.memoryUsage();
    log(`[bot] memory rssMiB=${(rss / 1048576).toFixed(1)} heapUsedMiB=${(heapUsed / 1048576).toFixed(1)}`);
  };
  on(Events.ClientReady, () => {
    log('[bot] ready');
    memory();
    // One sampler per process, regardless of the number of reconnects.
    if (!memoryTimer) { memoryTimer = setInterval(memory, 30000); memoryTimer.unref(); }
  });
  on(Events.ShardReady, id => log(`[bot] shard ready shard=${id}`));
  on(Events.ShardReconnecting, id => log(`[bot] reconnecting shard=${id}`));
  on(Events.ShardResume, (id, replayed) => log(`[bot] resumed shard=${id} replayed=${replayed}`));
  on(Events.Error, () => log('[bot] client error'));
  on(Events.ShardError, (_error, id) => log(`[bot] shard error shard=${id}`));
  // SDK invalidation is terminal; protocol opcode 9 is handled by the SDK itself.
  on(Events.Invalidated, () => {
    log('[bot] session invalidated; 请检查配置后重新启动。'); fatal();
  });
  on(Events.ShardDisconnect, (event, id) => {
    log(`[bot] disconnected shard=${id} code=${event.code}`);
    // Discord's non-reconnectable authentication / configuration close codes.
    if ([4004, 4010, 4011, 4012, 4013, 4014].includes(event.code)) {
      log('[bot] fatal gateway configuration; 请检查 Token、分片与 Intent 后重新启动。'); fatal();
    }
  });
  on(Events.MessageCreate, async message => {
    if (stopped) return;
    try {
      const input = options.resolveInput(message, client.user?.id ?? '');
      if (!input) return;
      await scheduler.schedule(input, async scheduledSignal => {
        let controller: AbortController | undefined;
        let detachAbort: (() => void) | undefined;
        let sending = false;
        let sent = 0;
        try {
          log('[bot] input accepted');
          controller = new AbortController();
          const abort = () => controller!.abort();
          scheduledSignal.addEventListener('abort', abort, { once: true });
          detachAbort = () => scheduledSignal.removeEventListener('abort', abort);
          if (scheduledSignal.aborted) controller.abort();
          const typing = async () => {
            try { await message.channel.sendTyping(); }
            catch { log('[bot] typing failed'); }
          };
          const timer = setInterval(() => { void typing(); }, 7000);
          timer.unref(); requests.set(controller, timer);
          // Typing is best effort; it must not delay the actual input handler.
          void typing();
          const content = await options.handleInput(input, controller.signal);
          if (!stopped && !controller.signal.aborted && content.trim()) {
            sending = true;
            const parts = splitMessage(content);
            let first = true;
            for (const part of parts) {
              if (stopped || controller.signal.aborted) return;
              // Discord rejects whitespace-only messages; substantive text is preserved.
              if (!part.trim()) continue;
              const payload = { content: part, allowedMentions: { parse: [], repliedUser: false } };
              if (first) await message.reply(payload);
              else if (message.channel.isSendable()) await message.channel.send(payload);
              else throw new Error('Channel cannot send messages');
              first = false;
              sent++;
            }
            log('[bot] input handled');
          }
        } catch (error) {
          log('[bot] input failed');
          const failure = describeFailure(error, sending);
          log(`[bot] failure kind=${failure.kind}`);
          if (!stopped && !controller?.signal.aborted) {
            const prefix = sent ? `回复发送中断，已发送 ${sent} 段；剩余内容未重发。` : '';
            await notify(message, prefix + failure.message, sending);
          }
        } finally {
          detachAbort?.();
          if (controller) { clearInterval(requests.get(controller)); requests.delete(controller); }
        }
      });
    } catch (error) {
      if (stopped) return;
      log('[bot] admission failed');
      await notify(message, error instanceof SchedulerError ? error.message : describeFailure(error).message);
    }
  });
  options.signal?.addEventListener('abort', stop, { once: true });
  if (options.signal?.aborted) { stop(); return { stop }; }
  try { await client.login(options.token); }
  catch {
    stop();
    if (!options.signal?.aborted) throw new Error('Bot 登录失败；请检查 Token、Intent 与网络。');
  }
  return { stop };
}
