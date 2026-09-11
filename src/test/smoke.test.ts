import { describe, it, expect } from 'vitest';

describe('Smoke Test Infrastructure', () => {
  it('should run basic assertion in vitest', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have dom environment available in jsdom', () => {
    const div = document.createElement('div');
    div.textContent = 'Web Playground';
    document.body.appendChild(div);

    expect(document.body.textContent).toContain('Web Playground');
    document.body.removeChild(div);
  });

  it('should support mocked scrollIntoView', () => {
    const el = document.createElement('div');
    expect(typeof el.scrollIntoView).toBe('function');
    expect(() => el.scrollIntoView()).not.toThrow();
  });
});
