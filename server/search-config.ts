import { resolve, join } from 'node:path';

export interface SearchEnvironment {
  SESSION_DATA_DIR?: string;
  SEARCH_REQUESTS_PER_MINUTE?: string;
  SEARCH_WEB_RESERVED_REQUESTS_PER_MINUTE?: string;
  SEARCH_REQUESTS_PER_DAY?: string;
  SEARCH_DISCORD_REQUESTS_PER_DAY?: string;
  SEARCH_DISCORD_USER_REQUESTS_PER_MINUTE?: string;
  SEARCH_DISCORD_USER_REQUESTS_PER_DAY?: string;
  SEARCH_DISCORD_CHANNEL_REQUESTS_PER_MINUTE?: string;
  SEARCH_DISCORD_CHANNEL_REQUESTS_PER_DAY?: string;
  SEARCH_TIMEOUT_MS?: string;
  SEARCH_LEDGER_PATH?: string;
}
export interface SearchConfig {
  requestsPerMinute: number; webReservedRequestsPerMinute: number;
  requestsPerDay: number; discordRequestsPerDay: number;
  userRequestsPerMinute: number; userRequestsPerDay: number;
  channelRequestsPerMinute: number; channelRequestsPerDay: number;
  timeoutMs: number; ledgerPath: string;
}
export function readSearchConfig(env: SearchEnvironment = {}): SearchConfig {
  const number = (value: string | undefined, fallback: number) => value === undefined ? fallback : /^\d+$/.test(value) ? Number(value) : NaN;
  const directory = resolve(env.SESSION_DATA_DIR?.trim() || 'data');
  const path = env.SEARCH_LEDGER_PATH ?? join(directory, 'search-ledger.json');
  if (!path.trim() || path.includes('\0') || resolve(path) === directory) throw new Error('Invalid search ledger path configuration.');
  const c: SearchConfig = {
    requestsPerMinute: number(env.SEARCH_REQUESTS_PER_MINUTE, 4),
    webReservedRequestsPerMinute: number(env.SEARCH_WEB_RESERVED_REQUESTS_PER_MINUTE, 2),
    requestsPerDay: number(env.SEARCH_REQUESTS_PER_DAY, 30),
    discordRequestsPerDay: number(env.SEARCH_DISCORD_REQUESTS_PER_DAY, 10),
    userRequestsPerMinute: number(env.SEARCH_DISCORD_USER_REQUESTS_PER_MINUTE, 1),
    userRequestsPerDay: number(env.SEARCH_DISCORD_USER_REQUESTS_PER_DAY, 5),
    channelRequestsPerMinute: number(env.SEARCH_DISCORD_CHANNEL_REQUESTS_PER_MINUTE, 2),
    channelRequestsPerDay: number(env.SEARCH_DISCORD_CHANNEL_REQUESTS_PER_DAY, 10),
    timeoutMs: number(env.SEARCH_TIMEOUT_MS, 8000), ledgerPath: resolve(path),
  };
  for (const [key, value] of Object.entries(c)) {
    if (key === 'ledgerPath') continue;
    if (!Number.isSafeInteger(value) || (value as number) < (key === 'webReservedRequestsPerMinute' ? 0 : 1)) throw new Error('Invalid search budget or timeout configuration.');
  }
  const discordMinute = c.requestsPerMinute - c.webReservedRequestsPerMinute;
  if (discordMinute < 0 || c.discordRequestsPerDay > c.requestsPerDay || c.userRequestsPerDay > c.discordRequestsPerDay ||
    c.channelRequestsPerDay > c.discordRequestsPerDay || (discordMinute > 0 && (c.userRequestsPerMinute > discordMinute || c.channelRequestsPerMinute > discordMinute)) || c.timeoutMs > 115000) {
    throw new Error('Invalid search budget or timeout configuration.');
  }
  return c;
}
