// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { readSearchConfig } from '../search-config';
import { SearchBudget } from '../search-budget';
import type { SearchLedgerData, SearchLedgerStore } from '../storage/search-ledger';
const web = { source: 'web' as const };
const discord = (user = '111111111111111111', channel = '222222222222222222') => ({ source: 'discord' as const, userId: user, channelId: channel });
function fixture(env: Parameters<typeof readSearchConfig>[0] = {}) {
  let mono = 0; let utc = Date.parse('2026-10-18T12:00:00Z'); let data: SearchLedgerData | undefined;
  const store: SearchLedgerStore = { read: vi.fn(async () => data), write: vi.fn(async value => { data = structuredClone(value); }) };
  const config = readSearchConfig(env); const options = { now: () => mono, utcNow: () => utc };
  return { store, config, options, budget: new SearchBudget(config, store, options), data: () => data,
    advance: (ms: number) => { mono += ms; utc += ms; }, setUtc: (value: number) => { utc = value; } };
}
describe('Task 20 Step 2: 搜索配置与原子额度', () => {
  it('默认配置与额度层级校验不读取Key', () => {
    const c = readSearchConfig({ SESSION_DATA_DIR: '/private/tmp/isolated-search' });
    expect(c).toMatchObject({ requestsPerMinute: 4, webReservedRequestsPerMinute: 2, requestsPerDay: 30, discordRequestsPerDay: 10,
      userRequestsPerMinute: 1, userRequestsPerDay: 5, channelRequestsPerMinute: 2, channelRequestsPerDay: 10, timeoutMs: 8000 });
    expect(c.ledgerPath).toBe('/private/tmp/isolated-search/search-ledger.json');
    for (const value of ['', '0', '-1', 'NaN', '1.5', 'Infinity', '9007199254740992']) expect(() => readSearchConfig({ SEARCH_TIMEOUT_MS: value })).toThrow();
    expect(() => readSearchConfig({ SEARCH_WEB_RESERVED_REQUESTS_PER_MINUTE: '5' })).toThrow();
    expect(() => readSearchConfig({ SEARCH_DISCORD_REQUESTS_PER_DAY: '31' })).toThrow();
    expect(() => readSearchConfig({ SEARCH_DISCORD_USER_REQUESTS_PER_MINUTE: '3' })).toThrow();
    expect(() => readSearchConfig({ SEARCH_LEDGER_PATH: '' })).toThrow();
    expect(() => readSearchConfig({ SEARCH_LEDGER_PATH: 'bad\0path' })).toThrow();
    expect(() => readSearchConfig({ SEARCH_LEDGER_PATH: 'data' })).toThrow();
  });
  it('Discord达到分钟子额后Web仍可用保留额度且拒绝不扣任何计数', async () => {
    const f = fixture(); expect(await f.budget.acquire(discord())).toEqual({ allowed: true });
    expect(await f.budget.acquire(discord('333333333333333333'))).toEqual({ allowed: true });
    const before = structuredClone(f.data()); expect(await f.budget.acquire(discord('444444444444444444', '555555555555555555'))).toEqual({ allowed: false, reason: 'admission_denied' });
    expect(f.data()).toEqual(before); expect(await f.budget.acquire(web)).toEqual({ allowed: true }); expect(await f.budget.acquire(web)).toEqual({ allowed: true });
    expect(await f.budget.acquire(web)).toEqual({ allowed: false, reason: 'admission_denied' }); expect(f.data()?.total).toEqual({ attempts: 4, credits: 4 });
    f.advance(60000); expect(await f.budget.acquire(web)).toEqual({ allowed: true });
  });
  it('用户与频道分钟守卫原子拒绝并且零Discord分钟份额合法', async () => {
    const f = fixture(); expect(await f.budget.acquire(discord())).toEqual({ allowed: true });
    expect(await f.budget.acquire(discord())).toEqual({ allowed: false, reason: 'admission_denied' });
    expect(await f.budget.acquire(discord('333333333333333333'))).toEqual({ allowed: true });
    expect(await f.budget.acquire(discord('444444444444444444'))).toEqual({ allowed: false, reason: 'admission_denied' });
    expect(f.data()?.total.attempts).toBe(2);
    const zero = fixture({ SEARCH_WEB_RESERVED_REQUESTS_PER_MINUTE: '4' });
    expect(await zero.budget.acquire(discord())).toEqual({ allowed: false, reason: 'admission_denied' }); expect(await zero.budget.acquire(web)).toEqual({ allowed: true });
  });
  it('用户日额度跨分钟保留而换频道不能绕过', async () => {
    const f = fixture();
    for (let i = 0; i < 5; i++) { expect(await f.budget.acquire(discord(undefined, String(222222222222222220n + BigInt(i))))).toEqual({ allowed: true }); f.advance(60000); }
    const before = structuredClone(f.data()); expect(await f.budget.acquire(discord())).toEqual({ allowed: false, reason: 'admission_denied' }); expect(f.data()).toEqual(before);
  });
  it('频道与Discord总日额度跨用户保留而Web可用剩余额度', async () => {
    const f = fixture();
    for (let i = 0; i < 10; i++) { expect(await f.budget.acquire(discord(String(111111111111111110n + BigInt(i))))).toEqual({ allowed: true }); f.advance(60000); }
    expect(await f.budget.acquire(discord('444444444444444444', '555555555555555555'))).toEqual({ allowed: false, reason: 'admission_denied' });
    expect(await f.budget.acquire(web)).toEqual({ allowed: true }); expect(f.data()?.discord.attempts).toBe(10);
  });
  it('全局日额度不可通过重建守卫绕过且UTC换日正常开启', async () => {
    const f = fixture(); for (let i = 0; i < 30; i++) { expect(await f.budget.acquire(web)).toEqual({ allowed: true }); f.advance(60000); }
    expect(await new SearchBudget(f.config, f.store, f.options).acquire(web)).toEqual({ allowed: false, reason: 'admission_denied' });
    f.advance(86400000); expect(await f.budget.acquire(web)).toEqual({ allowed: true }); expect(f.data()?.total).toEqual({ attempts: 1, credits: 1 });
  });
  it('并发请求串行检查后再写账本不会超额', async () => {
    const f = fixture(); const allowed = await Promise.all(Array.from({ length: 20 }, () => f.budget.acquire(web)));
    expect(allowed.filter(result => result.allowed)).toHaveLength(4); expect(f.store.write).toHaveBeenCalledTimes(4);
  });
  it('429只暂停搜索所有来源60秒且日计数不退款', async () => {
    const f = fixture(); expect(await f.budget.acquire(web)).toEqual({ allowed: true }); f.budget.pause();
    expect(await f.budget.acquire(web)).toEqual({ allowed: false, reason: 'admission_denied' }); expect(await f.budget.acquire(discord())).toEqual({ allowed: false, reason: 'admission_denied' });
    f.advance(60000); expect(await f.budget.acquire(discord())).toEqual({ allowed: true }); expect(f.data()?.total.attempts).toBe(2);
  });
  it('缺身份与预先取消均不写账本', async () => {
    const f = fixture(); expect(await f.budget.acquire({ source: 'discord' })).toEqual({ allowed: false, reason: 'admission_denied' });
    const c = new AbortController(); c.abort(); await expect(f.budget.acquire(web, c.signal)).rejects.toMatchObject({ code: 'ABORTED' });
    expect(f.store.write).not.toHaveBeenCalled();
  });
  it('账本读写失败关闭搜索且不自动恢复或清零', async () => {
    for (const action of ['read', 'write'] as const) {
      const f = fixture(); vi.mocked(f.store[action]).mockRejectedValueOnce(Object.assign(new Error('private query key user'), { code: 'EIO' }));
      expect(await f.budget.acquire(web)).toEqual({ allowed: false, reason: 'ledger_unavailable' }); expect(await f.budget.acquire(web)).toEqual({ allowed: false, reason: 'ledger_unavailable' });
      expect(f.store[action]).toHaveBeenCalledOnce(); expect(f.data()).toBeUndefined();
    }
  });
  it('写入期间取消仍等待串行落账，后续请求保留预留并正常准入', async () => {
    const f = fixture(); let finish!: () => void; let started!: () => void;
    const ready = new Promise<void>(resolve => { started = resolve; }); const persist = vi.mocked(f.store.write).getMockImplementation()!;
    vi.mocked(f.store.write).mockImplementationOnce(async value => { started(); await new Promise<void>(resolve => { finish = resolve; }); await persist(value); });
    const c = new AbortController(); const pending = f.budget.acquire(web, c.signal);
    await ready; c.abort(); await expect(pending).rejects.toMatchObject({ code: 'ABORTED' });
    const next = f.budget.acquire(web); finish(); expect(await next).toEqual({ allowed: true });
    expect(f.data()?.total).toEqual({ attempts: 2, credits: 2 });
  });
});

describe('Task 20 Step 2: 账本运行中故障', () => {
  it('已存在账本丢失或被改写时关闭搜索而不从空状态恢复', async () => {
    const f = fixture(); expect(await f.budget.acquire(web)).toEqual({ allowed: true });
    vi.mocked(f.store.read).mockResolvedValueOnce(undefined);
    expect(await f.budget.acquire(web)).toEqual({ allowed: false, reason: 'ledger_unavailable' }); expect(f.store.write).toHaveBeenCalledOnce();
  });
  it('读操作期间取消不写入，后续请求重读后正常准入', async () => {
    const f = fixture(); let finish!: () => void; let started!: () => void;
    const ready = new Promise<void>(resolve => { started = resolve; });
    vi.mocked(f.store.read).mockImplementationOnce(async () => { started(); await new Promise<void>(resolve => { finish = resolve; }); return undefined; });
    const c = new AbortController(); const pending = f.budget.acquire(web, c.signal);
    await ready; c.abort(); await expect(pending).rejects.toMatchObject({ code: 'ABORTED' });
    expect(f.store.write).not.toHaveBeenCalled(); const next = f.budget.acquire(web); finish();
    expect(await next).toEqual({ allowed: true }); expect(f.data()?.total.attempts).toBe(1);
  });
  it('单独频道日上限拒绝不消耗用户或全局额度', async () => {
    const f = fixture({ SEARCH_DISCORD_CHANNEL_REQUESTS_PER_DAY: '1' });
    expect(await f.budget.acquire(discord())).toEqual({ allowed: true }); f.advance(60000);
    expect(await f.budget.acquire(discord('333333333333333333'))).toEqual({ allowed: false, reason: 'admission_denied' });
    expect(await f.budget.acquire(discord('333333333333333333', '555555555555555555'))).toEqual({ allowed: true });
    expect(f.data()?.total.attempts).toBe(2);
  });
});

describe('Task 20 Step 2: 准入期间状态变化', () => {
  it('落账期间收到429或跨UTC日时不再发起该次搜索', async () => {
    for (const change of ['pause', 'day'] as const) {
      const f = fixture(); const write = f.store.write;
      vi.mocked(f.store.write).mockImplementationOnce(async value => {
        if (change === 'pause') f.budget.pause(); else f.advance(86400000);
        // Reservation is already committed: it is conservatively retained without issuing a request.
        void value;
      });
      expect(await f.budget.acquire(web)).toEqual({ allowed: false, reason: 'admission_denied' }); expect(write).toHaveBeenCalledOnce();
    }
  });
});


describe('T2: 取消不永久关闭搜索', () => {
  it.each(['read', 'write'] as const)('%s期间取消后其他请求等待同一串行任务并正常准入', async operation => {
    const f = fixture(); let finish!: () => void; let started!: () => void;
    const ready = new Promise<void>(resolve => { started = resolve; }); const gate = new Promise<void>(resolve => { finish = resolve; });
    const originalRead = f.store.read; const originalWrite = f.store.write;
    const read = vi.mocked(f.store.read).getMockImplementation()!; const write = vi.mocked(f.store.write).getMockImplementation()!;
    if (operation === 'read') vi.mocked(f.store.read).mockImplementationOnce(async () => { started(); await gate; return read(); });
    else vi.mocked(f.store.write).mockImplementationOnce(async value => { started(); await gate; return write(value); });
    const controller = new AbortController(); const cancelled = f.budget.acquire(web, controller.signal);
    await ready; controller.abort(); await expect(cancelled).rejects.toMatchObject({ code: 'ABORTED' });
    let settled = false; const next = f.budget.acquire(web).then(result => { settled = true; return result; });
    await Promise.resolve(); await Promise.resolve(); expect(settled).toBe(false);
    finish(); expect(await next).toEqual({ allowed: true });
    expect(f.data()?.total).toEqual({ attempts: operation === 'read' ? 1 : 2, credits: operation === 'read' ? 1 : 2 });
    expect(originalRead).toHaveBeenCalledTimes(2); expect(originalWrite).toHaveBeenCalledTimes(operation === 'read' ? 1 : 2);
  });
});
