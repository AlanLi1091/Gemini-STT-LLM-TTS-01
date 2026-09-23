import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from '../App';
import { SETTINGS_STORAGE_KEY } from '../settings';
import { RECENT_SESSION_STORAGE_KEY } from '../services/sessionApi';

function sseResponse(...frames: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const frame of frames) controller.enqueue(encoder.encode(frame));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

function sessionResponse(session: object, status = 200): Response {
  return new Response(JSON.stringify(session), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Task 13 Step 3 / Task 14 Step 3: App 服务端会话装配', () => {
  beforeEach(() => {
    localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('默认后端模式创建会话，并携带 sessionId 流式展示回复', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/sessions') {
        return Promise.resolve(sessionResponse({ id: 'session-created', createdAt: 1, messages: [] }, 201));
      }
      if (url === '/api/chat/stream') {
        return Promise.resolve(sseResponse(
          'event: chunk\ndata: {"delta":"服务端", "accumulated":"服务端"}\n\n',
          'event: done\ndata: {"content":"服务端回复"}\n\n',
        ));
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    expect(screen.getByText('后端服务（SSE）')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('textbox', { name: '输入消息' })).not.toBeDisabled());
    fireEvent.change(screen.getByRole('textbox', { name: '输入消息' }), { target: { value: '你好' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));

    await waitFor(() => expect(screen.getByText('服务端回复')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith('/api/chat/stream', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'session-created',
        messages: [{ role: 'user', content: '你好' }],
      }),
    }));
    expect(localStorage.getItem(RECENT_SESSION_STORAGE_KEY)).toBe('session-created');
  });

  it('启动时恢复最近活动会话及其持久化消息', async () => {
    localStorage.setItem(RECENT_SESSION_STORAGE_KEY, 'session-existing');
    const fetchMock = vi.fn().mockResolvedValue(
      sessionResponse({
        id: 'session-existing',
        createdAt: 1,
        messages: [{ id: 'persisted-1', role: 'user', content: '已保存消息', createdAt: 1 }],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    await waitFor(() => expect(screen.getByText('已保存消息')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith('/api/sessions/session-existing', {
      headers: { Accept: 'application/json' },
    });
  });

  it('清空对话会归档旧会话、创建新会话并清除本地消息', async () => {
    localStorage.setItem(RECENT_SESSION_STORAGE_KEY, 'session-old');
    const oldSession = {
      id: 'session-old',
      createdAt: 1,
      messages: [{ id: 'persisted-1', role: 'user', content: '将被归档', createdAt: 1 }],
    };
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/sessions/session-old') return Promise.resolve(sessionResponse(oldSession));
      if (url === '/api/sessions/session-old/archive') {
        return Promise.resolve(sessionResponse({ ...oldSession, archivedAt: 2 }));
      }
      if (url === '/api/sessions' && init?.method === 'POST') {
        return Promise.resolve(sessionResponse({ id: 'session-new', createdAt: 3, messages: [] }, 201));
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    await screen.findByText('将被归档');
    fireEvent.click(screen.getByRole('button', { name: '清空对话' }));
    fireEvent.click(screen.getByRole('button', { name: '确定' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/sessions/session-old/archive',
      expect.objectContaining({ method: 'POST' }),
    ));
    await waitFor(() => expect(localStorage.getItem(RECENT_SESSION_STORAGE_KEY)).toBe('session-new'));
    expect(screen.queryByText('将被归档')).not.toBeInTheDocument();
  });

  it('旧直连配置迁移后仍只请求后端会话与流式接口', async () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
      connectionMode: 'direct',
      provider: 'gemini',
      geminiApiKey: 'legacy-browser-key',
      geminiModel: 'gemini-3.8-flash',
    }));
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/sessions') {
        return Promise.resolve(sessionResponse({ id: 'migrated-session', createdAt: 1, messages: [] }, 201));
      }
      if (url === '/api/chat/stream') {
        return Promise.resolve(sseResponse('event: done\ndata: {"content":"[Mock 回复] 已收到"}\n\n'));
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    expect(screen.getByText('后端服务（SSE）')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('textbox', { name: '输入消息' })).not.toBeDisabled());
    fireEvent.change(screen.getByRole('textbox', { name: '输入消息' }), { target: { value: '你好' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));

    await waitFor(() => expect(screen.getByText('[Mock 回复] 已收到')).toBeInTheDocument());
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBe(JSON.stringify({ connectionMode: 'server' }));
    expect(fetchMock).toHaveBeenCalledWith('/api/chat/stream', expect.objectContaining({ method: 'POST' }));
  });
});
