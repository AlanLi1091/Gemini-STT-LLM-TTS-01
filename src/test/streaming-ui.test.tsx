import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App } from '../App';
import * as useChatModule from '../hooks/useChat';
import { Message } from '../types';

describe('Task 10 Step 3: 流式 UI 交互与端到端集成测试', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('当 isGenerating 为 true 时，应在最后一条 assistant 消息末尾渲染打字机光标，而之前历史消息不应渲染光标', () => {
    const messages: Message[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: '你好',
        createdAt: 1000,
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: '这是历史回复',
        createdAt: 2000,
      },
      {
        id: 'msg-3',
        role: 'user',
        content: '请继续',
        createdAt: 3000,
      },
      {
        id: 'msg-4',
        role: 'assistant',
        content: '正在流式输出当前回答...',
        createdAt: 4000,
      },
    ];

    vi.spyOn(useChatModule, 'useChat').mockReturnValue({
      messages,
      inputText: '',
      isLoading: false,
      isGenerating: true,
      lastError: null,
      setInputText: vi.fn(),
      sendMessage: vi.fn(),
      retryFailedSend: vi.fn(),
      stopGenerating: vi.fn(),
      dismissError: vi.fn(),
      clearMessages: vi.fn(),
    });

    render(<App />);

    // 确认光标存在
    const cursors = screen.getAllByTestId('chat-typing-cursor');
    expect(cursors).toHaveLength(1);

    // 验证光标是否渲染在最后一条消息容器内
    const lastMsgContainer = screen.getByText('正在流式输出当前回答...').closest('div');
    expect(lastMsgContainer).toContainElement(cursors[0]);

    // 验证历史 assistant 消息不包含光标
    const oldMsgContainer = screen.getByText('这是历史回复').closest('div');
    expect(oldMsgContainer).not.toContainElement(cursors[0]);
  });

  it('当 isGenerating 为 false 时，即使存在 assistant 消息也不应渲染打字机光标', () => {
    const messages: Message[] = [
      {
        id: 'msg-1',
        role: 'assistant',
        content: '完整回答完毕',
        createdAt: 1000,
      },
    ];

    vi.spyOn(useChatModule, 'useChat').mockReturnValue({
      messages,
      inputText: '',
      isLoading: false,
      isGenerating: false,
      lastError: null,
      setInputText: vi.fn(),
      sendMessage: vi.fn(),
      retryFailedSend: vi.fn(),
      stopGenerating: vi.fn(),
      dismissError: vi.fn(),
      clearMessages: vi.fn(),
    });

    render(<App />);

    expect(screen.queryByTestId('chat-typing-cursor')).not.toBeInTheDocument();
  });

  it('当 isGenerating 为 true 时，发送按钮应替换为停止生成按钮，点击应触发 stopGenerating', () => {
    const stopGeneratingMock = vi.fn();

    vi.spyOn(useChatModule, 'useChat').mockReturnValue({
      messages: [],
      inputText: '',
      isLoading: false,
      isGenerating: true,
      lastError: null,
      setInputText: vi.fn(),
      sendMessage: vi.fn(),
      retryFailedSend: vi.fn(),
      stopGenerating: stopGeneratingMock,
      dismissError: vi.fn(),
      clearMessages: vi.fn(),
    });

    render(<App />);

    // 发送按钮不存在
    expect(screen.queryByRole('button', { name: '发送消息' })).not.toBeInTheDocument();

    // 停止生成按钮存在并可点击
    const stopBtn = screen.getByRole('button', { name: '停止生成' });
    expect(stopBtn).toBeInTheDocument();
    expect(stopBtn).toHaveTextContent('停止');

    fireEvent.click(stopBtn);
    expect(stopGeneratingMock).toHaveBeenCalledTimes(1);
  });

  it('当 isGenerating 为 true 时，顶部 Header 的操作应联动禁用', () => {
    vi.spyOn(useChatModule, 'useChat').mockReturnValue({
      messages: [
        { id: '1', role: 'user', content: 'hello', createdAt: 1 },
      ],
      inputText: '',
      isLoading: false,
      isGenerating: true,
      lastError: null,
      setInputText: vi.fn(),
      sendMessage: vi.fn(),
      retryFailedSend: vi.fn(),
      stopGenerating: vi.fn(),
      dismissError: vi.fn(),
      clearMessages: vi.fn(),
    });

    render(<App />);

    const clearBtn = screen.getByRole('button', { name: '清空对话' });
    expect(clearBtn).toBeDisabled();

    const settingsBtn = screen.getByRole('button', { name: '设置' });
    expect(settingsBtn).toBeDisabled();
  });
});
