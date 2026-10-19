import { logChatFailure } from './chat-errors';
import { waitForSearch } from './search-adapter';
import type { SearchConfig } from './search-config';
import { emptySearchLedger, isSearchLedger, type SearchCounter, type SearchLedgerData, type SearchLedgerStore } from './storage/search-ledger';

export interface SearchIdentity { source: 'web' | 'discord'; userId?: string; channelId?: string }
export type SearchAdmission = { allowed: true } | { allowed: false; reason: 'admission_denied' | 'ledger_unavailable' };
const denied = (reason: 'admission_denied' | 'ledger_unavailable' = 'admission_denied'): SearchAdmission => ({ allowed: false, reason });
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
  async acquire(identity: SearchIdentity, signal: AbortSignal = new AbortController().signal): Promise<SearchAdmission> {
    if (signal.aborted) return waitForSearch(async () => denied(), signal);
    if (this.disabled) return denied('ledger_unavailable');
    if (identity.source === 'discord' && (!/^\d{17,20}$/.test(identity.userId ?? '') || !/^\d{17,20}$/.test(identity.channelId ?? ''))) return denied();
    const task = this.tail.then(async (): Promise<SearchAdmission> => {
      if (this.disabled) return denied('ledger_unavailable');
      if (signal.aborted) return denied();
      try {
        const stored = await this.ledger.read();
        if (stored !== undefined && !isSearchLedger(stored)) throw new TypeError('Invalid search ledger');
        if (this.loaded && this.data && JSON.stringify(stored) !== JSON.stringify(this.data)) throw new TypeError('Search ledger changed outside its writer');
        this.data = stored; this.loaded = true;
        if (signal.aborted) return denied();
        const day = new Date(this.utcNow()).toISOString().slice(0, 10);
        if (this.data && this.data.day > day) throw new TypeError('Invalid search ledger date');
        const current = this.data?.day === day ? this.data : emptySearchLedger(day);
        const now = this.now(); const c = this.config;
        if (now < this.pausedUntil || current.total.attempts >= c.requestsPerDay) return denied();
        const guards: Array<[string, number]> = [['global', c.requestsPerMinute]];
        if (identity.source === 'discord') {
          if (current.discord.attempts >= c.discordRequestsPerDay || (current.users[identity.userId!]?.attempts ?? 0) >= c.userRequestsPerDay ||
            (current.channels[identity.channelId!]?.attempts ?? 0) >= c.channelRequestsPerDay) return denied();
          guards.push(['discord', c.requestsPerMinute - c.webReservedRequestsPerMinute], [`u:${identity.userId}`, c.userRequestsPerMinute], [`c:${identity.channelId}`, c.channelRequestsPerMinute]);
        }
        // Purge expired dynamic buckets; never log identity keys.
        for (const [key, starts] of this.starts) {
          const active = starts.filter(start => start > now - 60000);
          if (active.length) this.starts.set(key, active); else this.starts.delete(key);
        }
        if (guards.some(([key, limit]) => (this.starts.get(key)?.length ?? 0) >= limit)) return denied();
        const next = structuredClone(current);
        const increment = (counter: SearchCounter) => { counter.attempts++; counter.credits++; };
        increment(next.total);
        if (identity.source === 'discord') {
          increment(next.discord);
          increment(next.users[identity.userId!] ??= { attempts: 0, credits: 0 });
          increment(next.channels[identity.channelId!] ??= { attempts: 0, credits: 0 });
        }
        await this.ledger.write(next);
        // A crash / cancellation after durable reservation may conservatively spend an unused attempt.
        this.data = next;
        for (const [key] of guards) this.starts.set(key, [...(this.starts.get(key) ?? []), this.now()]);
        return !signal.aborted && this.now() >= this.pausedUntil && new Date(this.utcNow()).toISOString().slice(0, 10) === next.day ? { allowed: true } : denied();
      } catch (error) {
        this.disabled = true; logChatFailure(error, 'search', 'UNKNOWN'); return denied('ledger_unavailable');
      }
    });
    this.tail = task.then(() => undefined, () => undefined);
    // Cancelling local waiting does not cancel or bypass the serialized ledger task.
    // The next caller waits for it to settle, then rereads the committed reservation.
    return waitForSearch(() => task, signal);
  }
}
