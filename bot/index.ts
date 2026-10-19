import dotenv from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startGateway } from './gateway';
import { normalizeMessage, type BotInput } from './message-entry';
import { BackendClient, validateBackendUrl, type BotReply } from './backend-client';
import { RequestScheduler } from './request-scheduler';
import { startupFailureMessage } from './errors';

export function readBotConfig(env: NodeJS.ProcessEnv) {
  const token = env.DISCORD_BOT_TOKEN?.trim();
  const channelId = env.DISCORD_TEST_CHANNEL_ID?.trim();
  if (!token) throw new Error('请在本地服务端环境配置 DISCORD_BOT_TOKEN。');
  if (!channelId || !/^\d{17,20}$/.test(channelId)) {
    throw new Error('请配置有效的 DISCORD_TEST_CHANNEL_ID（频道 ID）。');
  }
  const schedulerOptions = {
    maxPending: env.DISCORD_MAX_PENDING === undefined ? 3 : Number(env.DISCORD_MAX_PENDING),
    cooldownMs: env.DISCORD_USER_COOLDOWN_MS === undefined ? 5000 : Number(env.DISCORD_USER_COOLDOWN_MS),
  };
  new RequestScheduler(schedulerOptions); // Validate configuration before connecting to Discord.
  const admins = env.DISCORD_SESSION_ADMIN_IDS?.trim() ?? '';
  const sessionAdminIds = admins ? admins.split(',').map(id => id.trim()) : [];
  if (sessionAdminIds.some(id => !/^[1-9]\d{16,19}$/.test(id) || BigInt(id) > 18446744073709551615n)) {
    throw new Error('请配置有效的 DISCORD_SESSION_ADMIN_IDS（逗号分隔的用户 ID）。');
  }
  return { token, channelId, schedulerOptions, sessionAdminIds: [...new Set(sessionAdminIds)], backendUrl: validateBackendUrl(env.DISCORD_BACKEND_URL?.trim() || undefined) };
}

/** Runs inside the gateway's existing channel queue and user cooldown. */
export function createBotInputHandler(backend: Pick<BackendClient, 'chat' | 'reset'>, sessionAdminIds: readonly string[]) {
  const admins = new Set(sessionAdminIds);
  return async (input: BotInput, signal: AbortSignal): Promise<BotReply> => {
    const content = input.content.trim();
    if (content === '/reset') {
      if (!admins.size) return { content: '频道会话重置未启用，请先配置管理员名单。' };
      if (!admins.has(input.userId)) return { content: '你没有重置频道会话的权限。' };
      return { content: await backend.reset(input, signal) };
    }
    if (content === '/search' || /^\/search\s/.test(content)) {
      const question = content.slice('/search'.length).trimStart();
      if (!question.trim()) return { content: '请补充问题，用法：/search 问题。问题会发送给 Tavily 检索；回答和来源对频道成员可见，并由 Discord 保存。' };
      if (Array.from(question).length > 500) return { content: '联网搜索问题最多 500 个字符，请缩短后重试。' };
      return backend.chat({ ...input, content: question }, signal, { search: true });
    }
    return backend.chat(input, signal);
  };
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
      schedulerOptions: config.schedulerOptions,
      signal: controller.signal,
      onFatal: () => { process.exitCode = 1; },
      resolveInput: (message, botId) => normalizeMessage(message, { botId, channelId: config.channelId }),
      handleInput: createBotInputHandler(backend, config.sessionAdminIds),
    });
  } catch (error) {
    process.off('SIGINT', shutdown);
    process.off('SIGTERM', shutdown);
    console.error(startupFailureMessage(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main();
}
