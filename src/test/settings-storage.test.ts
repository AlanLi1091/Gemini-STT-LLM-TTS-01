import { describe, it, expect, beforeEach } from 'vitest';
import { loadSettings, saveSettings, sanitizeSettings, SETTINGS_STORAGE_KEY } from '../settings';
import { DEFAULT_SETTINGS } from '../types';

describe('Settings persistence and sanitization (ADR-006, Task 8)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('sanitizeSettings (防御性解析)', () => {
    it('对于 null / undefined / 非对象一律回退 DEFAULT_SETTINGS', () => {
      expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
      expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
      expect(sanitizeSettings('string')).toEqual(DEFAULT_SETTINGS);
      expect(sanitizeSettings(123)).toEqual(DEFAULT_SETTINGS);
    });

    it('非法 provider 枚举强制回退为 mock', () => {
      const sanitized = sanitizeSettings({
        provider: 'openai_unsupported',
        geminiApiKey: 'test-key',
        geminiModel: 'gemini-2.5-flash',
      });
      expect(sanitized.provider).toBe('mock');
      expect(sanitized.geminiApiKey).toBe('test-key');
    });

    it('非法或不存在的 geminiModel 回退为默认模型', () => {
      const sanitized = sanitizeSettings({
        provider: 'gemini',
        geminiApiKey: 'key-123',
        geminiModel: 'invalid-model-name',
      });
      expect(sanitized.geminiModel).toBe(DEFAULT_SETTINGS.geminiModel);
    });

    it('非字符串的 apiKey 安全转为空字符串并修剪前后空格', () => {
      const sanitized = sanitizeSettings({
        provider: 'gemini',
        geminiApiKey: '   valid-trimmed-key   ',
        geminiModel: 'gemini-3.1-pro',
      });
      expect(sanitized.geminiApiKey).toBe('valid-trimmed-key');
      expect(sanitized.geminiModel).toBe('gemini-3.1-pro');

      const nonString = sanitizeSettings({
        provider: 'gemini',
        geminiApiKey: 12345,
      });
      expect(nonString.geminiApiKey).toBe('');
    });

    it('剔除 apiKey 中的不可见字符与非 ASCII 字符（防止 Headers 抛出 non ISO-8859-1 code point 异常）', () => {
      const sanitized = sanitizeSettings({
        provider: 'gemini',
        geminiApiKey: '  AIzaSy123\u200b\uFEFF\u3000key\u00A0  ',
      });
      expect(sanitized.geminiApiKey).toBe('AIzaSy123key');
    });
  });

  describe('loadSettings & saveSettings', () => {
    it('localStorage 为空时返回默认设置', () => {
      const settings = loadSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
      expect(settings.provider).toBe('mock');
      expect(settings.connectionMode).toBe('server');
    });

    it('正常写入并正确回读 (往返一致性)', () => {
      const newSettings = {
        connectionMode: 'direct' as const,
        provider: 'gemini' as const,
        geminiApiKey: 'AIzaSyExampleKey',
        geminiModel: 'gemini-3.1-pro',
      };

      saveSettings(newSettings);
      const loaded = loadSettings();

      expect(loaded).toEqual(newSettings);
      expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBe(JSON.stringify(newSettings));
    });

    it('带首尾空白的 key 在 saveSettings 存入前与 loadSettings 读取后均保持干净 trim', () => {
      saveSettings({
        connectionMode: 'direct',
        provider: 'gemini',
        geminiApiKey: '   AIzaSyKeyWithSpaces   ',
        geminiModel: 'gemini-3.8-flash',
      });

      const loaded = loadSettings();
      expect(loaded.geminiApiKey).toBe('AIzaSyKeyWithSpaces');
      expect(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)!).geminiApiKey).toBe(
        'AIzaSyKeyWithSpaces'
      );
    });

    it('localStorage 存有损坏的 JSON 字符串时，优雅捕获并回退默认设置', () => {
      localStorage.setItem(SETTINGS_STORAGE_KEY, '{ invalid_json: ... corrupt');
      const settings = loadSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('localStorage 缺少部分字段时，缺失字段自动补齐安全默认值', () => {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ provider: 'gemini' }));
      const settings = loadSettings();
      expect(settings.provider).toBe('gemini');
      expect(settings.geminiApiKey).toBe('');
      expect(settings.geminiModel).toBe(DEFAULT_SETTINGS.geminiModel);
      expect(settings.connectionMode).toBe('direct');
    });

    it('新版非法连接模式回退后端服务，旧版配置迁移为前端直连调试模式', () => {
      expect(sanitizeSettings({ connectionMode: 'unsupported' }).connectionMode).toBe('server');
      expect(sanitizeSettings({ provider: 'gemini', geminiApiKey: 'legacy-key' }).connectionMode).toBe('direct');
    });
  });
});
