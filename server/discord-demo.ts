import dotenv from 'dotenv';
import { Client, Events, GatewayIntentBits, type ClientEvents } from 'discord.js';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function readDemoConfig(env: NodeJS.ProcessEnv) {
  const token = env.DISCORD_BOT_TOKEN?.trim();
  const channelId = env.DISCORD_TEST_CHANNEL_ID?.trim();
  if (!token) throw new Error('请在本地服务端环境配置 DISCORD_BOT_TOKEN。');
  if (!channelId || !/^\d{17,20}$/.test(channelId)) {
    throw new Error('请配置有效的 DISCORD_TEST_CHANNEL_ID（频道 ID）。');
  }
  return { token, channelId };
}

// Deliberately log only event names / numeric codes, never SDK error text or messages.
function errorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'number' ? String(code) : 'unknown';
}

export async function startDemo(
  config: ReturnType<typeof readDemoConfig>,
  options: {
    client?: Client;
    log?: (message: string) => void;
    onFatal?: () => void;
    memoryIntervalMs?: number;
    signal?: AbortSignal;
  } = {},
) {
  const client = options.client ?? new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ] });
  const log = options.log ?? console.log;
  let stopped = false;
  let memoryTimer: ReturnType<typeof setInterval> | undefined;
  const listeners: Array<() => void> = [];
  const on = <E extends keyof ClientEvents>(event: E, listener: (...args: ClientEvents[E]) => void) => {
    client.on(event, listener);
    listeners.push(() => client.off(event, listener));
  };
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(memoryTimer);
    listeners.forEach(remove => remove());
    options.signal?.removeEventListener('abort', stop);
    void client.destroy().catch(() => log('[discord-demo] gateway cleanup failed'));
    log('[discord-demo] stopped');
  };
  const fatal = () => { stop(); options.onFatal?.(); };
  const memory = () => {
    const { rss, heapUsed } = process.memoryUsage();
    log(`[discord-demo] memory rssMiB=${(rss / 1048576).toFixed(1)} heapUsedMiB=${(heapUsed / 1048576).toFixed(1)}`);
  };
  on(Events.ClientReady, () => {
    log('[discord-demo] ready');
    memory();
  });
  on(Events.MessageCreate, async message => {
    if (stopped || !message.inGuild() || message.channelId !== config.channelId ||
        message.author.bot || message.webhookId || !message.content.trim()) return;
    // Demo-only truncation; production reply segmentation belongs to Task 16 Step 3.
    const content = (`[回显] ${message.content}`).slice(0, 2000).replace(/[\uD800-\uDBFF]$/, '');
    try {
      await message.reply({ content, allowedMentions: { parse: [], repliedUser: false } });
      log('[discord-demo] echo sent');
    } catch (error) {
      log(`[discord-demo] echo failed code=${errorCode(error)}; 请检查频道权限与网络。`);
    }
  });
  on(Events.ShardReconnecting, id => log(`[discord-demo] reconnecting shard=${id}`));
  on(Events.ShardResume, (id, replayed) => log(`[discord-demo] resumed shard=${id} replayed=${replayed}`));
  on(Events.ShardReady, id => log(`[discord-demo] shard ready shard=${id}`));
  on(Events.ShardDisconnect, (event, id) => {
    log(`[discord-demo] disconnected shard=${id} code=${event.code}`);
    if ([4004, 4013, 4014].includes(event.code)) {
      log('[discord-demo] fatal gateway configuration; 请检查 Token 与 Intent。');
      fatal();
    }
  });
  on(Events.Error, error => log(`[discord-demo] client error code=${errorCode(error)}`));
  on(Events.ShardError, error => log(`[discord-demo] shard error code=${errorCode(error)}`));
  on(Events.Invalidated, () => {
    log('[discord-demo] session invalidated; 请检查配置后重新启动。');
    fatal();
  });
  memoryTimer = setInterval(memory, options.memoryIntervalMs ?? 30000);
  memoryTimer.unref();
  options.signal?.addEventListener('abort', stop, { once: true });
  if (options.signal?.aborted) {
    stop();
    return { stop };
  }
  try {
    await client.login(config.token);
  } catch {
    stop();
    if (options.signal?.aborted) return { stop };
    throw new Error('Discord 登录失败；请检查 Token、Message Content Intent 与网络。');
  }
  return { stop };
}

async function main() {
  dotenv.config({ quiet: true });
  const controller = new AbortController();
  const shutdown = () => controller.abort();
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  try {
    await startDemo(readDemoConfig(process.env), {
      onFatal: () => { process.exitCode = 1; },
      signal: controller.signal,
    });
  } catch (error) {
    process.off('SIGINT', shutdown);
    process.off('SIGTERM', shutdown);
    console.error((error as Error).message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main();
}
