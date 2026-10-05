// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { RequestBudget } from '../request-budget';
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
