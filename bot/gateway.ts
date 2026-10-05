import { Client, Events, GatewayIntentBits, type ClientEvents } from 'discord.js';
import type { BotInput } from './message-entry';
import { BackendError } from './backend-client';
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
  const on = <E extends keyof ClientEvents>(event: E, listener: (...args: ClientEvents[E]) => void) => {
    client.on(event, listener); listeners.push(() => client.off(event, listener));
  };
  const stop = () => {
    if (stopped) return;
    stopped = true;
    scheduler.stop();
    options.signal?.removeEventListener('abort', stop);
    for (const [controller, timer] of requests) { controller.abort(); clearInterval(timer); }
    requests.clear(); listeners.forEach(remove => remove());
    void client.destroy().catch(() => log('[bot] cleanup failed'));
    log('[bot] stopped');
  };
  const fatal = () => { stop(); options.onFatal?.(); };
  on(Events.ClientReady, () => log('[bot] ready'));
  on(Events.ShardReconnecting, () => log('[bot] reconnecting'));
  on(Events.ShardResume, () => log('[bot] resumed'));
  on(Events.Error, () => log('[bot] client error'));
  on(Events.ShardError, () => log('[bot] shard error'));
  on(Events.Invalidated, fatal);
  on(Events.ShardDisconnect, event => {
    log(`[bot] disconnected code=${event.code}`);
    if ([4004, 4013, 4014].includes(event.code)) fatal();
  });
  on(Events.MessageCreate, async message => {
    if (stopped) return;
    try {
      const input = options.resolveInput(message, client.user?.id ?? '');
      if (!input) return;
      await scheduler.schedule(input, async scheduledSignal => {
        let controller: AbortController | undefined;
        let detachAbort: (() => void) | undefined;
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
            }
            log('[bot] input handled');
          }
        } catch (error) {
          log('[bot] input failed');
          if (error instanceof BackendError && controller && !stopped && !controller.signal.aborted) {
            try { await message.reply({ content: error.message, allowedMentions: { parse: [], repliedUser: false } }); }
            catch { log('[bot] error feedback failed'); }
          }
        } finally {
          detachAbort?.();
          if (controller) { clearInterval(requests.get(controller)); requests.delete(controller); }
        }
      });
    } catch (error) {
      if (stopped) return;
      log('[bot] admission failed');
      if (error instanceof SchedulerError) {
        try { await message.reply({ content: error.message, allowedMentions: { parse: [], repliedUser: false } }); }
        catch { log('[bot] error feedback failed'); }
      }
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
