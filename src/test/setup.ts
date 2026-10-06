import '@testing-library/jest-dom/vitest';
import { beforeEach, vi } from 'vitest';
import { generateMockReply } from '../services/mockChatService';

// 默认模拟经后端 Mock 引擎返回的会话与 SSE；专门测试可覆盖 fetch。
beforeEach(() => {
  if (typeof window === 'undefined') return;
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    if (input === '/api/sessions' && init?.method === 'POST') {
      return new Response(JSON.stringify({ id: 'mock-session', createdAt: 1, messages: [] }), { status: 201 });
    }
    if (input === '/api/sessions/mock-session') {
      return new Response(JSON.stringify({ id: 'mock-session', createdAt: 1, messages: [] }));
    }
    if (input === '/api/sessions/mock-session/archive') {
      return new Response(JSON.stringify({ id: 'mock-session', createdAt: 1, archivedAt: 2, messages: [] }));
    }
    if (input === '/api/chat/stream') {
      const request = JSON.parse(String(init?.body)) as { messages: { content: string }[] };
      const reply = await generateMockReply(request.messages.at(-1)?.content ?? '', { delayMs: 800 });
      return new Response(`event: done\ndata: ${JSON.stringify({ content: reply })}\n\n`, {
        headers: { 'Content-Type': 'text/event-stream' },
      });
    }
    throw new Error(`Unexpected URL: ${input}`);
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
