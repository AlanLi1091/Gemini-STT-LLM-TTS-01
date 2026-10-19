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

  it('最近记录指向 Discord 会话时创建 Web 会话而不恢复频道历史', async () => {
    localStorage.setItem(RECENT_SESSION_STORAGE_KEY, 'discord-session');
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/discord-session')) return Promise.resolve(sessionResponse({
        id: 'discord-session', createdAt: 1,
        origin: { type: 'discord', guildId: '111111111111111111', channelId: '222222222222222222' },
        messages: [{ id: 'm1', role: 'user', content: '频道私有历史', createdAt: 1 }],
      }));
      if (url === '/api/sessions') return Promise.resolve(sessionResponse({ id: 'new-web', createdAt: 1, messages: [], origin: { type: 'web' } }, 201));
      throw new Error('Unexpected request');
    });
    vi.stubGlobal('fetch', fetchMock); render(<App />);
    await waitFor(() => expect(localStorage.getItem(RECENT_SESSION_STORAGE_KEY)).toBe('new-web'));
    expect(screen.queryByText('频道私有历史')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '输入消息' })).not.toBeDisabled();
  });

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
      body: expect.any(String),
    }));
    const chatCall = fetchMock.mock.calls.find(([url]) => url === '/api/chat/stream');
    expect(JSON.parse(chatCall![1].body)).toEqual({ sessionId: 'session-created', requestId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/), messages: [{ role: 'user', content: '你好' }] });
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

describe('P0-2: Web 重试集成', () => {
  afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
  it('模型失败后点击重试复用输入标识且页面只显示一条用户消息', async () => {
    localStorage.clear(); Element.prototype.scrollIntoView = vi.fn();
    const bodies: { requestId: string }[] = [];
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/sessions') return Promise.resolve(sessionResponse({ id: 'retry-session', createdAt: 1, messages: [] }, 201));
      if (url === '/api/chat/stream') {
        bodies.push(JSON.parse(init!.body as string));
        return Promise.resolve(bodies.length === 1
          ? sseResponse('event: error\ndata: {"error":{"code":"MODEL_ERROR","message":"failed"}}\n\n')
          : sseResponse('event: done\ndata: {"content":"retried"}\n\n'));
      }
      throw new Error('Unexpected URL');
    });
    vi.stubGlobal('fetch', fetchMock); render(<App />);
    await waitFor(() => expect(screen.getByRole('textbox', { name: '输入消息' })).not.toBeDisabled());
    fireEvent.change(screen.getByRole('textbox', { name: '输入消息' }), { target: { value: 'retry-hi' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));
    fireEvent.click(await screen.findByRole('button', { name: '重试' }));
    await screen.findByText('retried');
    expect(bodies).toHaveLength(2); expect(bodies[1].requestId).toBe(bodies[0].requestId);
    expect(screen.getAllByText('retry-hi')).toHaveLength(1);
  });
  it('请求冲突横幅使用固定提示并保留重试入口', async () => {
    const { ChatErrorBanner } = await import('../components/ChatErrorBanner');
    const { ChatError } = await import('../types');
    const onRetry = vi.fn();
    render(<ChatErrorBanner error={new ChatError('raw internal detail', 'REQUEST_CONFLICT')} onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('上一条回复仍在处理中');
    expect(screen.queryByText('raw internal detail')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重试' })); expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe('Task 21: Web联网搜索全流程（Mock）', () => {
  const source = { provider: 'tavily', retrievedAt: 1, index: 1, title: '检索标题', domain: 'forged.example', url: 'https://real.example/path', summary: '检索摘要' };
  const search = { status: 'succeeded', sources: [source] };
  afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
  async function start() {
    render(<App />);
    await waitFor(() => expect(screen.getByRole('textbox', { name: '输入消息' })).not.toBeDisabled());
  }
  it('默认关闭并告知外发与保存，开启发送后复位，下一轮不带search', async () => {
    const bodies: Record<string, unknown>[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/sessions') return sessionResponse({ id: 's', createdAt: 1, messages: [] });
      bodies.push(JSON.parse(String(init?.body)));
      return sseResponse(`event: done\ndata: ${JSON.stringify({ content: `回复${bodies.length}`, search })}\n\n`);
    }));
    await start();
    const toggle = screen.getByRole('checkbox', { name: '联网搜索' });
    expect(toggle).not.toBeChecked(); expect(screen.getByText(/本轮问题会发送给 Tavily/)).toHaveTextContent('随回复保存');
    fireEvent.click(toggle);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '第一问' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));
    expect(toggle).not.toBeChecked();
    await screen.findByText('回复1');
    expect(screen.getByRole('link', { name: 'real.example' })).toHaveAttribute('href', source.url);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '第二问' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));
    await screen.findByText('回复2');
    expect(bodies[0].search).toBe(true); expect(bodies[1]).not.toHaveProperty('search');
  });
  it('501码点被拦截且开关不复位，500个emoji可完整发送', async () => {
    const bodies: { messages: { content: string }[] }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/sessions') return sessionResponse({ id: 's', createdAt: 1, messages: [] });
      bodies.push(JSON.parse(String(init?.body)));
      return sseResponse('event: done\ndata: {"content":"完成"}\n\n');
    }));
    await start(); fireEvent.click(screen.getByRole('checkbox', { name: '联网搜索' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '😀'.repeat(501) } });
    expect(screen.getByRole('alert')).toHaveTextContent('500');
    fireEvent.submit(screen.getByRole('form', { name: '消息发送表单' }));
    expect(bodies).toHaveLength(0); expect(screen.getByRole('checkbox')).toBeChecked();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '😀'.repeat(500) } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' })); await screen.findByText('完成');
    expect(bodies[0].messages[0].content).toBe('😀'.repeat(500));
  });
  it.each([true, false])('失败重试不随当前开关改变原模式 %s 且复用UUID，单done回放来源', async requested => {
    const bodies: { requestId: string; search?: boolean }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/sessions') return sessionResponse({ id: 's', createdAt: 1, messages: [] });
      bodies.push(JSON.parse(String(init?.body)));
      return bodies.length === 1 ? sseResponse('event: error\ndata: {"error":{"code":"MODEL_ERROR","message":"失败"}}\n\n') : sseResponse(`event: done\ndata: ${JSON.stringify({ content: '回放正文', search })}\n\n`);
    }));
    await start(); if (requested) fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '问题' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));
    await screen.findByRole('button', { name: '重试' });
    if (!requested) fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '重试' })); await screen.findByText('回放正文');
    expect(bodies[1]).toEqual(bodies[0]);
    expect(bodies[1].search).toBe(requested ? true : undefined);
    expect(screen.getByRole('link', { name: 'real.example' })).toBeInTheDocument();
  });
  it.each(['javascript:alert(1)', 'data:text/html,evil', 'vbscript:evil', '//evil.example', 'https://u:p@real.example', 'https://real.example/a\nb', 'https://real.example/' + 'a'.repeat(2048)])('篡改done和持久化来源均不产生危险链接 %s', async url => {
    const unsafeSearch = { ...search, sources: [{ ...source, url, title: '<script>evil</script>', summary: '<img onerror=evil>' }] };
    localStorage.setItem(RECENT_SESSION_STORAGE_KEY, 's');
    vi.stubGlobal('fetch', vi.fn(async (path: string) => path === '/api/sessions/s'
      ? sessionResponse({ id: 's', createdAt: 1, messages: [{ id: 'a', role: 'assistant', createdAt: 1, content: '持久化正文', search: unsafeSearch }] })
      : sseResponse(`event: done\ndata: ${JSON.stringify({ content: '最终正文', search: unsafeSearch })}\n\n`)));
    const view = render(<App />); await screen.findByText('持久化正文');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '问题' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' })); await screen.findByText('最终正文');
    expect(screen.queryByRole('link')).not.toBeInTheDocument(); expect(view.container.querySelector('script, img')).toBeNull();
    expect(screen.getAllByText('<script>evil</script>')).toHaveLength(2);
  });
  it('刷新还原成功和降级展示，坏搜索字段与旧会话正常显示正文', async () => {
    const { SEARCH_DEGRADED_NOTICE } = await import('@core/index');
    localStorage.setItem(RECENT_SESSION_STORAGE_KEY, 's');
    vi.stubGlobal('fetch', vi.fn(async () => sessionResponse({ id: 's', createdAt: 1, messages: [
      { id: 'a', role: 'assistant', createdAt: 1, content: '成功正文', search },
      { id: 'b', role: 'assistant', createdAt: 2, content: '降级正文', search: { status: 'degraded', sources: [], reason: 'unavailable', notice: SEARCH_DEGRADED_NOTICE } },
      { id: 'c', role: 'assistant', createdAt: 3, content: '坏字段正文', search: { status: 'degraded', reason: 'SECRET', notice: 'SECRET', sources: [] } },
      { id: 'd', role: 'assistant', createdAt: 4, content: '旧会话正文' },
    ] })));
    await start(); expect(screen.getByText('旧会话正文')).toBeInTheDocument();
    expect(screen.getByText('坏字段正文')).toBeInTheDocument(); expect(screen.queryByText('SECRET')).not.toBeInTheDocument();
    expect(screen.getByText(SEARCH_DEGRADED_NOTICE)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'real.example' })).toBeInTheDocument();
  });
});
