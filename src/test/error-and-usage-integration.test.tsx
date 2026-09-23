import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App } from '../App';
import { ChatError, ChatAdapter } from '../types';
import * as useChatModule from '../hooks/useChat';

describe('Task 9: 错误提示与用量记录 UI 集成测试', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('当 assistant 消息包含 usage 时，消息列表内应正确渲染 TokenUsageBadge 徽章', () => {
    // Mock useChat hook 返回一条带有 usage 的 assistant 消息
    vi.spyOn(useChatModule, 'useChat').mockReturnValue({
      messages: [
        {
          id: 'user-1',
          role: 'user',
          content: '请写一首短诗',
          createdAt: Date.now(),
        },
        {
          id: 'assistant-1',
          role: 'assistant',
          content: '床前明月光，疑是地上霜。',
          createdAt: Date.now(),
          usage: { promptTokens: 12, completionTokens: 24, totalTokens: 36 },
        },
      ],
      inputText: '',
      isLoading: false,
      isGenerating: false,
      lastError: null,
      setInputText: vi.fn(),
      sendMessage: vi.fn(),
      retryFailedSend: vi.fn(),
      stopGenerating: vi.fn(),
      dismissError: vi.fn(),
      replaceMessages: vi.fn(),
      clearMessages: vi.fn(),
    });

    render(<App />);

    // 消息内容渲染
    expect(screen.getByText('床前明月光，疑是地上霜。')).toBeInTheDocument();
    // TokenUsageBadge 徽章渲染
    const tokenBadge = screen.getByRole('status');
    expect(tokenBadge).toBeInTheDocument();
    expect(tokenBadge).toHaveTextContent('36');
    expect(tokenBadge).toHaveAttribute('aria-label', expect.stringContaining('共 36 tokens'));
  });

  it('当存在 lastError 时，顶部正确展示 ChatErrorBanner 错误横幅', async () => {
    const dismissErrorMock = vi.fn();
    const retryFailedSendMock = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'test-session', createdAt: 1, messages: [],
    }), { status: 201 })));

    vi.spyOn(useChatModule, 'useChat').mockReturnValue({
      messages: [
        {
          id: 'user-1',
          role: 'user',
          content: '你好',
          createdAt: Date.now(),
        },
      ],
      inputText: '',
      isLoading: false,
      isGenerating: false,
      lastError: new ChatError('403 PERMISSION_DENIED: region unsupported', 'AUTH_ERROR'),
      setInputText: vi.fn(),
      sendMessage: vi.fn(),
      retryFailedSend: retryFailedSendMock,
      stopGenerating: vi.fn(),
      dismissError: dismissErrorMock,
      replaceMessages: vi.fn(),
      clearMessages: vi.fn(),
    });

    render(<App />);

    // 校验错误横幅渲染
    const banner = screen.getByRole('alert');
    expect(banner).toBeInTheDocument();
    expect(screen.getByText(/服务端鉴权或地区受限/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /检查设置/i })).not.toBeInTheDocument();

    // 点击“重试”应触发 retryFailedSend
    const retryBtn = screen.getByRole('button', { name: /重试/i });
    await waitFor(() => expect(retryBtn).not.toBeDisabled());
    fireEvent.click(retryBtn);
    expect(retryFailedSendMock).toHaveBeenCalledTimes(1);

    // 点击“关闭”应触发 dismissError
    const dismissBtn = screen.getByRole('button', { name: /关闭错误提示/i });
    fireEvent.click(dismissBtn);
    expect(dismissErrorMock).toHaveBeenCalledTimes(1);
  });

});
