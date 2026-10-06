import { AppSettings, DEFAULT_SETTINGS } from './types';

export const SETTINGS_STORAGE_KEY = 'app_settings_v1';

/** 旧设置中的直连模式、模型和浏览器密钥均不进入新设置对象。 */
export function sanitizeSettings(_raw: unknown): AppSettings {
  return { ...DEFAULT_SETTINGS };
}

/** 读取旧设置时立即以仅后端模式覆写，清除浏览器中遗留的密钥字段。 */
export function loadSettings(storage: Storage = window.localStorage): AppSettings {
  try {
    const rawValue = storage.getItem(SETTINGS_STORAGE_KEY);
    if (!rawValue) return { ...DEFAULT_SETTINGS };

    const sanitized = sanitizeSettings(JSON.parse(rawValue));
    const cleanValue = JSON.stringify(sanitized);
    if (rawValue !== cleanValue) storage.setItem(SETTINGS_STORAGE_KEY, cleanValue);
    return sanitized;
  } catch {
    try {
      storage.removeItem(SETTINGS_STORAGE_KEY);
    } catch {
      // Storage may be unavailable; the in-memory default still uses only the server.
    }
    return { ...DEFAULT_SETTINGS };
  }
}

/** 保存时只写入后端模式，即使调用方传入旧字段也不会持久化它们。 */
export function saveSettings(settings: AppSettings, storage: Storage = window.localStorage): void {
  try {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(sanitizeSettings(settings)));
  } catch (error) {
    console.error('Failed to save app settings to storage:', error);
  }
}
