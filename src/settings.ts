import { AppSettings, DEFAULT_SETTINGS, AVAILABLE_GEMINI_MODELS } from './types';

export const SETTINGS_STORAGE_KEY = 'app_settings_v1';

/**
 * 校验并防御性解析配置对象
 * 任何损坏、缺失字段或非法枚举一律优雅回退到安全默认值
 */
export function sanitizeSettings(raw: unknown): AppSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SETTINGS };
  }

  const record = raw as Record<string, unknown>;

  // 校验 provider
  const provider = record.provider === 'gemini' ? 'gemini' : 'mock';

  // 校验 apiKey：去除首尾空白并剔除所有非 ASCII 字符（防止 Headers 抛出 non ISO-8859-1 code point 异常）
  const geminiApiKey =
    typeof record.geminiApiKey === 'string'
      ? record.geminiApiKey.trim().replace(/[^\x20-\x7E]/g, '')
      : '';

  // 校验 model 是否在支持列表中
  const validModelIds = AVAILABLE_GEMINI_MODELS.map((m) => m.id as string);
  const geminiModel =
    typeof record.geminiModel === 'string' && validModelIds.includes(record.geminiModel)
      ? record.geminiModel
      : DEFAULT_SETTINGS.geminiModel;

  return {
    provider,
    geminiApiKey,
    geminiModel,
  };
}

/**
 * 从 localStorage 读取配置，损坏或异常时不抛出异常并回退默认值
 */
export function loadSettings(storage: Storage = window.localStorage): AppSettings {
  try {
    const rawValue = storage.getItem(SETTINGS_STORAGE_KEY);
    if (!rawValue) {
      return { ...DEFAULT_SETTINGS };
    }
    const parsed = JSON.parse(rawValue);
    return sanitizeSettings(parsed);
  } catch {
    // JSON 解析失败或 storage 访问受阻，回退默认配置
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * 保存配置至 localStorage
 */
export function saveSettings(settings: AppSettings, storage: Storage = window.localStorage): void {
  try {
    const sanitized = sanitizeSettings(settings);
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (error) {
    console.error('Failed to save app settings to storage:', error);
  }
}
