import { Client, Events, GatewayIntentBits, type ClientEvents } from 'discord.js';
import type { BotInput } from './message-entry';
import { BackendError } from './backend-client';

export interface GatewayOptions {
  token: string;
  resolveInput: (message: ClientEvents[Events.MessageCreate][0], botId: string) => BotInput | undefined;
  handleInput: (input: BotInput, signal: AbortSignal) => Promise<string>;
  client?: Client;
  signal?: AbortSignal;
  log?: (message: string) => void;
  onFatal?: () => void;
}

export async function startGateway(options: GatewayOptions) {
  const client = options.client ?? new Client({ intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent,
  ] });
  const log = options.log ?? console.log;
  const listeners: Array<() => void> = [];
  const requests = new Map<AbortController, ReturnType<typeof setInterval>>();
  let stopped = false;
  const on = <E extends keyof ClientEvents>(event: E, listener: (...args: ClientEvents[E]) => void) => {
    client.on(event, listener); listeners.push(() => client.off(event, listener));
  };
  const stop = () => {
    if (stopped) return;
    stopped = true;
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
    let controller: AbortController | undefined;
    try {
      const input = options.resolveInput(message, client.user?.id ?? '');
      if (!input) return;
      log('[bot] input accepted');
      controller = new AbortController();
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
        await message.reply({
          content: content.length > 2000 ? '回复过长，暂时无法在频道显示。请尝试简短问题。' : content,
          allowedMentions: { parse: [], repliedUser: false },
        });
        log('[bot] input handled');
      }
    } catch (error) {
      log('[bot] input failed');
      if (error instanceof BackendError && controller && !stopped && !controller.signal.aborted) {
        try { await message.reply({ content: error.message, allowedMentions: { parse: [], repliedUser: false } }); }
        catch { log('[bot] error feedback failed'); }
      }
    } finally {
      if (controller) { clearInterval(requests.get(controller)); requests.delete(controller); }
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
