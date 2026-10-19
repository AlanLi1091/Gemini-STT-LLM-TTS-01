// @vitest-environment node
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { JsonSearchLedger, emptySearchLedger, isSearchLedger } from '../storage/search-ledger';
import { SearchBudget } from '../search-budget';
import { readSearchConfig } from '../search-config';
const dirs: string[] = [];
async function fixture() { const dir = await mkdtemp(join(tmpdir(), 'search-ledger-')); dirs.push(dir); const path = join(dir, 'ledger.json'); return { dir, path, ledger: new JsonSearchLedger(path) }; }
afterEach(async () => { await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true }))); });
describe('Task 20 Step 2: UTC每日账本', () => {
  it('首次ENOENT合法且读操作不创建账本', async () => {
    const f = await fixture(); expect(await f.ledger.read()).toBeUndefined(); await expect(readFile(f.path)).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('原子落盘并重启恢复尝试数和credits且不存query等内容', async () => {
    const f = await fixture(); const c = readSearchConfig({ SEARCH_LEDGER_PATH: f.path });
    const budget = new SearchBudget(c, f.ledger); expect(await budget.acquire({ source: 'web' })).toEqual({ allowed: true });
    const restored = await new JsonSearchLedger(f.path).read(); expect(restored?.total).toEqual({ attempts: 1, credits: 1 });
    expect(Object.keys(restored!)).toEqual(['version', 'day', 'total', 'discord', 'users', 'channels']);
    expect(JSON.stringify(restored)).not.toMatch(/query|url|key|content/i);
  });
  it.each(['{bad', '{}', JSON.stringify({ ...emptySearchLedger('2026-10-18'), day: '2026-02-30' }), JSON.stringify({ ...emptySearchLedger('2026-10-18'), total: { attempts: -1, credits: 0 } })])('损坏账本保持原文且关闭搜索: %s', async text => {
    const f = await fixture(); await writeFile(f.path, text);
    const budget = new SearchBudget(readSearchConfig({ SEARCH_LEDGER_PATH: f.path }), f.ledger);
    expect(await budget.acquire({ source: 'web' })).toEqual({ allowed: false, reason: 'ledger_unavailable' }); expect(await readFile(f.path, 'utf8')).toBe(text);
  });
  it('目录或非ENOENT读取错误不能当作首次启动', async () => {
    const f = await fixture(); await mkdir(f.path);
    expect(await new SearchBudget(readSearchConfig({ SEARCH_LEDGER_PATH: f.path }), f.ledger).acquire({ source: 'web' })).toEqual({ allowed: false, reason: 'ledger_unavailable' });
  });
  it('结构拒绝错账未来日期及额外内容但不受额度配置降低影响', async () => {
    const data = emptySearchLedger('2026-10-18'); expect(isSearchLedger(data)).toBe(true);
    expect(isSearchLedger({ ...data, query: 'secret' })).toBe(false);
    expect(isSearchLedger({ ...data, total: { attempts: 1, credits: 0 } })).toBe(false);
    const f = await fixture(); await f.ledger.write(emptySearchLedger('2099-01-01'));
    expect(await new SearchBudget(readSearchConfig({ SEARCH_LEDGER_PATH: f.path }), f.ledger).acquire({ source: 'web' })).toEqual({ allowed: false, reason: 'ledger_unavailable' });
  });
});

describe('Task 20 Step 2: 账本写入和既有证据', () => {
  it('rename失败保留原账本并禁止发起搜索', async () => {
    const f = await fixture(); const { readdir } = await import('node:fs/promises');
    await mkdir(f.path); const budget = new SearchBudget(readSearchConfig({ SEARCH_LEDGER_PATH: f.path }), {
      read: async () => undefined, write: value => f.ledger.write(value),
    });
    expect(await budget.acquire({ source: 'web' })).toEqual({ allowed: false, reason: 'ledger_unavailable' });
    expect((await readdir(f.dir)).sort()).toEqual(['ledger.json']);
  });
  it('降低配置仍保留既有使用量且过期合法账本换日不带旧身份', async () => {
    const f = await fixture(); const old = emptySearchLedger('2026-10-17'); old.total = { attempts: 50, credits: 50 };
    await f.ledger.write(old);
    const budget = new SearchBudget(readSearchConfig({ SEARCH_LEDGER_PATH: f.path }), f.ledger, { utcNow: () => Date.parse('2026-10-18T00:00:00Z') });
    expect(await budget.acquire({ source: 'web' })).toEqual({ allowed: true }); expect((await f.ledger.read())?.total.attempts).toBe(1);
    const today = emptySearchLedger('2026-10-18'); today.total = { attempts: 50, credits: 50 }; await f.ledger.write(today);
    const reloaded = new SearchBudget(readSearchConfig({ SEARCH_LEDGER_PATH: f.path }), f.ledger, { utcNow: () => Date.parse('2026-10-18T12:00:00Z') });
    expect(await reloaded.acquire({ source: 'web' })).toEqual({ allowed: false, reason: 'admission_denied' }); expect((await f.ledger.read())?.total.attempts).toBe(50);
  });
});
