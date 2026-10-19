import { logChatFailure } from './chat-errors';
import { waitForSearch } from './search-adapter';
import type { SearchConfig } from './search-config';
import { emptySearchLedger, isSearchLedger, type SearchCounter, type SearchLedgerData, type SearchLedgerStore } from './storage/search-ledger';

export interface SearchIdentity { source: 'web' | 'discord'; userId?: string; channelId?: string }
/** Atomic multi-guard transaction. One budget and ledger writer per Express process. */
export class SearchBudget {
  private tail: Promise<unknown> = Promise.resolve();
  private loaded = false;
  private disabled = false;
  private data?: SearchLedgerData;
  private starts = new Map<string, number[]>();
  private pausedUntil = 0;
  private readonly now: () => number;
  private readonly utcNow: () => number;
  constructor(private readonly config: SearchConfig, private readonly ledger: SearchLedgerStore,
    options: { now?: () => number; utcNow?: () => number } = {}) {
    this.now = options.now ?? (() => globalThis.performance.now()); this.utcNow = options.utcNow ?? Date.now;
  }
  pause(): void { this.pausedUntil = Math.max(this.pausedUntil, this.now() + 60000); }
  async acquire(identity: SearchIdentity, signal: AbortSignal = new AbortController().signal): Promise<boolean> {
    if (signal.aborted) return waitForSearch(async () => false, signal);
    if (this.disabled) return false;
    if (identity.source === 'discord' && (!/^\d{17,20}$/.test(identity.userId ?? '') || !/^\d{17,20}$/.test(identity.channelId ?? ''))) return false;
    let ioPending = false;
    const task = this.tail.then(async () => {
      if (this.disabled || signal.aborted) return false;
      try {
        ioPending = true;
        const stored = await this.ledger.read();
        ioPending = false;
        if (stored !== undefined && !isSearchLedger(stored)) throw new TypeError('Invalid search ledger');
        if (this.loaded && this.data && JSON.stringify(stored) !== JSON.stringify(this.data)) throw new TypeError('Search ledger changed outside its writer');
        this.data = stored; this.loaded = true;
        if (signal.aborted) return false;
        const day = new Date(this.utcNow()).toISOString().slice(0, 10);
        if (this.data && this.data.day > day) throw new TypeError('Invalid search ledger date');
        const current = this.data?.day === day ? this.data : emptySearchLedger(day);
        const now = this.now(); const c = this.config;
        if (now < this.pausedUntil || current.total.attempts >= c.requestsPerDay) return false;
        const guards: Array<[string, number]> = [['global', c.requestsPerMinute]];
        if (identity.source === 'discord') {
          if (current.discord.attempts >= c.discordRequestsPerDay || (current.users[identity.userId!]?.attempts ?? 0) >= c.userRequestsPerDay ||
            (current.channels[identity.channelId!]?.attempts ?? 0) >= c.channelRequestsPerDay) return false;
          guards.push(['discord', c.requestsPerMinute - c.webReservedRequestsPerMinute], [`u:${identity.userId}`, c.userRequestsPerMinute], [`c:${identity.channelId}`, c.channelRequestsPerMinute]);
        }
        // Purge expired dynamic buckets; never log identity keys.
        for (const [key, starts] of this.starts) {
          const active = starts.filter(start => start > now - 60000);
          if (active.length) this.starts.set(key, active); else this.starts.delete(key);
        }
        if (guards.some(([key, limit]) => (this.starts.get(key)?.length ?? 0) >= limit)) return false;
        const next = structuredClone(current);
        const increment = (counter: SearchCounter) => { counter.attempts++; counter.credits++; };
        increment(next.total);
        if (identity.source === 'discord') {
          increment(next.discord);
          increment(next.users[identity.userId!] ??= { attempts: 0, credits: 0 });
          increment(next.channels[identity.channelId!] ??= { attempts: 0, credits: 0 });
        }
        ioPending = true;
        await this.ledger.write(next);
        // A crash / cancellation after durable reservation may conservatively spend an unused attempt.
        this.data = next;
        for (const [key] of guards) this.starts.set(key, [...(this.starts.get(key) ?? []), this.now()]);
        return !signal.aborted && !this.disabled && this.now() >= this.pausedUntil && new Date(this.utcNow()).toISOString().slice(0, 10) === next.day;
      } catch (error) {
        this.disabled = true; logChatFailure(error, 'search', 'UNKNOWN'); return false;
      } finally { ioPending = false; }
    });
    this.tail = task.then(() => undefined, () => undefined);
    try { return await waitForSearch(() => task, signal); }
    catch (error) {
      // IO can finish late. Do not admit another paid request while its reservation is uncertain.
      if (ioPending) this.disabled = true;
      throw error;
    }
  }
}
