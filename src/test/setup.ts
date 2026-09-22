import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';
import { SETTINGS_STORAGE_KEY } from '../settings';

// Most legacy UI tests cover browser-direct behavior. Session-specific tests
// explicitly replace this with server mode and mock the session API.
beforeEach(() => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
    connectionMode: 'direct',
    provider: 'mock',
    geminiApiKey: '',
    geminiModel: 'gemini-3.8-flash',
  }));
});

// jsdom 环境下 mock scrollIntoView 与 scrollTo（防范风险 2：无头环境 DOM 滚动）
if (typeof window !== 'undefined') {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = () => {};
  }
  if (!HTMLElement.prototype.scrollTo) {
    HTMLElement.prototype.scrollTo = () => {};
  }
}
