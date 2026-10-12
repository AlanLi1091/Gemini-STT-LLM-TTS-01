// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { RequestBudget, SourceRequestBudget, readSourceBudgetConfig } from '../request-budget';
describe('Task 17 Step 1: Gemini 请求预算', () => {
  it('滚动一分钟预算原子占位，边界恢复', () => {
    let now = 0; const budget = new RequestBudget({ requestsPerMinute: 2, now: () => now });
    expect(budget.acquire()).toBe(0); expect(budget.acquire()).toBe(0); expect(budget.acquire()).toBe(60000);
    now = 59999; expect(budget.acquire()).toBe(1); now = 60000; expect(budget.acquire()).toBe(0);
  });
  it('上游限流开启暂停，到期后恢复', () => {
    let now = 0; const budget = new RequestBudget({ now: () => now }); budget.pause();
    now = 10000; expect(budget.acquire()).toBe(50000); now = 60000; expect(budget.acquire()).toBe(0);
  });
  it('再次限流延长暂停且不缩短已有窗口', () => {
    let now = 0; const budget = new RequestBudget({ now: () => now }); budget.pause(); now = 30000; budget.pause();
    now = 60000; expect(budget.acquire()).toBe(30000);
  });
  it('拒绝非法预算配置', () => { expect(() => new RequestBudget({ requestsPerMinute: 0 })).toThrow(); expect(() => new RequestBudget({ cooldownMs: -1 })).toThrow(); });
});


describe('P1-7: 来源保留额度', () => {
  it('Discord 占满子额度后重复拒绝不扣全局额度，Web 用完保留额度', () => {
    const budget = new SourceRequestBudget({ requestsPerMinute: 10, sourceLimits: { discord: 6 } });
    for (let i = 0; i < 6; i++) expect(budget.acquire('discord')).toBe(0);
    for (let i = 0; i < 5; i++) expect(budget.acquire('discord')).toBeGreaterThan(0);
    for (let i = 0; i < 4; i++) expect(budget.acquire('web')).toBe(0);
    expect(budget.acquire('web')).toBeGreaterThan(0);
  });
  it('Web 可独占全部额度，混合来源总量仍受全局守卫', () => {
    const onlyWeb = new SourceRequestBudget({ requestsPerMinute: 10, sourceLimits: { discord: 6 } });
    for (let i = 0; i < 10; i++) expect(onlyWeb.acquire('web')).toBe(0);
    expect(onlyWeb.acquire('discord')).toBeGreaterThan(0);
    const mixed = new SourceRequestBudget({ requestsPerMinute: 10, sourceLimits: { discord: 6 } });
    for (let i = 0; i < 8; i++) expect(mixed.acquire('web')).toBe(0);
    expect(mixed.acquire('discord')).toBe(0); expect(mixed.acquire('discord')).toBe(0);
    expect(mixed.acquire('discord')).toBeGreaterThan(0);
  });
  it('不同来源共享 pause，窗口恢复与再次暂停不缩短等待', () => {
    let now = 0;
    const budget = new SourceRequestBudget({ requestsPerMinute: 3, sourceLimits: { discord: 2 }, now: () => now });
    expect(budget.acquire('discord')).toBe(0); now = 1000; expect(budget.acquire('discord')).toBe(0);
    expect(budget.acquire('discord')).toBe(59000); budget.pause();
    expect(budget.acquire('web')).toBe(60000); now = 30000; budget.pause();
    now = 60000; expect(budget.acquire('web')).toBe(30000); expect(budget.acquire('discord')).toBe(30000);
    now = 90000; expect(budget.acquire('discord')).toBe(0); expect(budget.acquire('web')).toBe(0);
  });
  it('默认来源为 web，通用来源键子额度拒绝时不会占用其他额度', () => {
    const budget = new SourceRequestBudget({ requestsPerMinute: 3, sourceLimits: { limited: 1 } });
    expect(budget.acquire('limited')).toBe(0); expect(budget.acquire('limited')).toBeGreaterThan(0);
    expect(budget.acquire()).toBe(0); expect(budget.acquire('web')).toBe(0);
    expect(budget.acquire()).toBeGreaterThan(0);
  });
  it('默认配置保持生成10保留4与计数20保留8及60秒暂停', () => {
    expect(readSourceBudgetConfig({})).toEqual({ requestsPerMinute: 10, webReservedRequests: 4, cooldownMs: 60000, countsPerMinute: 20, webReservedCounts: 8 });
  });
  it('拒绝非法总额度保留额度和子额度，省略保留值不自动缩放', () => {
    for (const value of ['', '0', '-1', '1.5', 'NaN', 'Infinity', '9007199254740992', '10']) {
      expect(() => readSourceBudgetConfig({ GEMINI_WEB_RESERVED_REQUESTS_PER_MINUTE: value })).toThrow();
    }
    for (const value of ['', '0', '-1', '1.5', 'NaN', '20']) {
      expect(() => readSourceBudgetConfig({ CHAT_WEB_RESERVED_COUNTS_PER_MINUTE: value })).toThrow();
    }
    expect(() => readSourceBudgetConfig({ GEMINI_REQUESTS_PER_MINUTE: '4' })).toThrow();
    expect(() => readSourceBudgetConfig({ CHAT_COUNTS_PER_MINUTE: '8' })).toThrow();
    expect(() => readSourceBudgetConfig({ CHAT_COUNTS_PER_MINUTE: '1001' })).toThrow();
    expect(() => readSourceBudgetConfig({ GEMINI_RATE_LIMIT_COOLDOWN_MS: '0' })).toThrow();
    for (const cap of [0, -1, 0.5, 11, NaN, Infinity]) expect(() => new SourceRequestBudget({ requestsPerMinute: 10, sourceLimits: { discord: cap } })).toThrow();
    expect(readSourceBudgetConfig({ GEMINI_REQUESTS_PER_MINUTE: '2', GEMINI_WEB_RESERVED_REQUESTS_PER_MINUTE: '1', CHAT_COUNTS_PER_MINUTE: '2', CHAT_WEB_RESERVED_COUNTS_PER_MINUTE: '1' })).toMatchObject({ requestsPerMinute: 2, webReservedRequests: 1, countsPerMinute: 2, webReservedCounts: 1 });
  });
});
