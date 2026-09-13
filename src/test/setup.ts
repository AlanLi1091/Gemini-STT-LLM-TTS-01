import '@testing-library/jest-dom/vitest';

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
