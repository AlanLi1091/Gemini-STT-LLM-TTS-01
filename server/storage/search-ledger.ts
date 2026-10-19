import { randomUUID } from 'node:crypto';
import { readFile, mkdir, writeFile, rename, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface SearchCounter { attempts: number; credits: number }
export interface SearchLedgerData {
  version: 1; day: string; total: SearchCounter; discord: SearchCounter;
  users: Record<string, SearchCounter>; channels: Record<string, SearchCounter>;
}
export interface SearchLedgerStore {
  read(): Promise<SearchLedgerData | undefined>;
  write(value: SearchLedgerData): Promise<void>;
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
function counter(value: unknown): value is SearchCounter {
  return object(value) && Object.keys(value).length === 2 && Number.isSafeInteger(value.attempts) && Number.isSafeInteger(value.credits) &&
    (value.attempts as number) >= 0 && value.credits === value.attempts;
}
function buckets(value: unknown): value is Record<string, SearchCounter> {
  return object(value) && Object.entries(value).every(([key, count]) => /^\d{17,20}$/.test(key) && counter(count));
}
export function emptySearchLedger(day: string): SearchLedgerData {
  return { version: 1, day, total: { attempts: 0, credits: 0 }, discord: { attempts: 0, credits: 0 }, users: {}, channels: {} };
}
export function isSearchLedger(value: unknown): value is SearchLedgerData {
  if (!object(value) || Object.keys(value).length !== 6 || value.version !== 1 || typeof value.day !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.day)) return false;
  const date = new Date(value.day + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value.day || !counter(value.total) || !counter(value.discord) ||
    !buckets(value.users) || !buckets(value.channels) || value.discord.attempts > value.total.attempts) return false;
  return [value.users, value.channels].every(map => Object.values(map).reduce((sum, c) => sum + c.attempts, 0) === (value.discord as SearchCounter).attempts);
}
/** Single Express / single writer only. Corrupt files are never replaced on read. */
export class JsonSearchLedger implements SearchLedgerStore {
  constructor(private readonly path: string) {}
  async read(): Promise<SearchLedgerData | undefined> {
    let raw: string;
    try { raw = await readFile(this.path, 'utf8'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
    const value: unknown = JSON.parse(raw);
    if (!isSearchLedger(value)) throw new TypeError('Invalid search ledger');
    return value;
  }
  async write(value: SearchLedgerData): Promise<void> {
    if (!isSearchLedger(value)) throw new TypeError('Invalid search ledger');
    await mkdir(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, JSON.stringify(value) + '\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 });
      await rename(temporary, this.path);
    } finally { await unlink(temporary).catch(() => {}); }
  }
}
