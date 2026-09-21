import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from '../App';
import { SETTINGS_STORAGE_KEY } from '../settings';

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

describe('Task 13 Step 3: App 远端 SSE 装配', () => {
  beforeEach(() => {
    localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('默认后端模式通过 SSE 服务流式展示回复', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      sseResponse(
        'event: chunk\ndata: {"delta":"服务端", "accumulated":"服务端"}\n\n',
        'event: done\ndata: {"content":"服务端回复"}\n\n',
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    expect(screen.getByText('后端服务（SSE）')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: '输入消息' }), { target: { value: '你好' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));

    await waitFor(() => expect(screen.getByText('服务端回复')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith('/api/chat/stream', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ messages: [{ role: 'user', content: '你好' }] }),
    }));
  });

  it('前端直连 Mock 模式不请求后端服务', async () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
      connectionMode: 'direct',
      provider: 'mock',
      geminiApiKey: '',
      geminiModel: 'gemini-3.8-flash',
    }));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    expect(screen.getByText('Web Mock MVP')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: '输入消息' }), { target: { value: '你好' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));

    await waitFor(() => expect(screen.getByText(/你好！我是你的角色扮演与对话助手/)).toBeInTheDocument());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
