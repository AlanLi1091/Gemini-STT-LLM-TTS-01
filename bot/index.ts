import dotenv from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startGateway } from './gateway';
import { normalizeMessage } from './message-entry';
import { BackendClient, validateBackendUrl } from './backend-client';

export function readBotConfig(env: NodeJS.ProcessEnv) {
  const token = env.DISCORD_BOT_TOKEN?.trim();
  const channelId = env.DISCORD_TEST_CHANNEL_ID?.trim();
  if (!token) throw new Error('请在本地服务端环境配置 DISCORD_BOT_TOKEN。');
  if (!channelId || !/^\d{17,20}$/.test(channelId)) {
    throw new Error('请配置有效的 DISCORD_TEST_CHANNEL_ID（频道 ID）。');
  }
  return { token, channelId, backendUrl: validateBackendUrl(env.DISCORD_BACKEND_URL?.trim() || undefined) };
}

async function main() {
  // Root scripts preserve the root working directory and the existing .env location.
  dotenv.config({ quiet: true });
  const controller = new AbortController();
  const shutdown = () => controller.abort();
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  try {
    const config = readBotConfig(process.env);
    const backend = new BackendClient({ baseUrl: config.backendUrl });
    await startGateway({
      token: config.token,
      signal: controller.signal,
      onFatal: () => { process.exitCode = 1; },
      resolveInput: (message, botId) => normalizeMessage(message, { botId, channelId: config.channelId }),
      handleInput: (input, signal) => backend.chat(input, signal),
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
