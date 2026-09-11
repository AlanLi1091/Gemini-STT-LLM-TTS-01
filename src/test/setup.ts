import '@testing-library/jest-dom/vitest';

// jsdom 环境下 mock scrollIntoView（防范风险 2：无头环境 DOM 滚动）
if (typeof window !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
