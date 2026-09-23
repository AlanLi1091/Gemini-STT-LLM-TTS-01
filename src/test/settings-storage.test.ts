import { describe, it, expect, beforeEach } from 'vitest';
import { loadSettings, saveSettings, sanitizeSettings, SETTINGS_STORAGE_KEY } from '../settings';
import { DEFAULT_SETTINGS } from '../types';

describe('Settings migration to server-only mode (ADR-010)', () => {
  beforeEach(() => localStorage.clear());

  it('空值与非对象均回退后端默认设置', () => {
    for (const raw of [null, undefined, 'text', 123]) {
      expect(sanitizeSettings(raw)).toEqual(DEFAULT_SETTINGS);
    }
  });

  it('存量直连与含 Key 配置均迁移到后端模式且丢弃 Key', () => {
    expect(sanitizeSettings({ connectionMode: 'direct', provider: 'gemini', geminiApiKey: 'legacy-key' }))
      .toEqual({ connectionMode: 'server' });
    expect(sanitizeSettings({ connectionMode: 'server', geminiApiKey: 'legacy-key' }))
      .toEqual({ connectionMode: 'server' });
  });

  it('非法连接模式回退后端模式', () => {
    expect(sanitizeSettings({ connectionMode: 'unsupported' })).toEqual(DEFAULT_SETTINGS);
  });

  it('localStorage 为空时返回默认设置且不创建记录', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull();
  });

  it('后端设置正常写入并回读', () => {
    saveSettings({ connectionMode: 'server' });
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBe(JSON.stringify(DEFAULT_SETTINGS));
  });

  it('读取旧版配置时覆写 localStorage，清除直连与密钥字段', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
      connectionMode: 'direct', provider: 'gemini', geminiApiKey: 'legacy-key', geminiModel: 'gemini-3.1-pro',
    }));
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBe(JSON.stringify(DEFAULT_SETTINGS));
  });

  it('损坏的 JSON 被清除并回退默认设置', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{ invalid_json: ...');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull();
  });

  it('运行时传入旧字段时保存仍只写入后端模式', () => {
    saveSettings({ connectionMode: 'direct', geminiApiKey: 'legacy-key' } as unknown as typeof DEFAULT_SETTINGS);
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBe(JSON.stringify(DEFAULT_SETTINGS));
  });
});
