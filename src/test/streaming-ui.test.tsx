import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App } from '../App';
import { MessageList } from '../components/MessageList';
import * as useChatModule from '../hooks/useChat';
import { Message } from '../types';
import { SETTINGS_STORAGE_KEY } from '../settings';

describe('Task 10 Step 3: 流式 UI 交互与端到端集成测试', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
      connectionMode: 'direct', provider: 'mock', geminiApiKey: '', geminiModel: 'gemini-3.8-flash',
    }));
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
      replaceMessages: vi.fn(),
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
      replaceMessages: vi.fn(),
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
      replaceMessages: vi.fn(),
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
      replaceMessages: vi.fn(),
      clearMessages: vi.fn(),
    });

    render(<App />);

    const clearBtn = screen.getByRole('button', { name: '清空对话' });
    expect(clearBtn).toBeDisabled();

    const settingsBtn = screen.getByRole('button', { name: '设置' });
    expect(settingsBtn).toBeDisabled();
  });

  describe('流式触底滚动与用户滚动守卫 (Smart Sticky Bottom)', () => {
    it('流式 content 变化且用户在底部区域时，应触发 scrollTo 吸底', async () => {
      let rAFCallback: FrameRequestCallback | null = null;
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rAFCallback = cb;
        return 1;
      });

      const scrollToSpy = vi.fn();
      Element.prototype.scrollTo = scrollToSpy;

      const initialMessages: Message[] = [
        { id: '1', role: 'user', content: 'hello', createdAt: 1 },
        { id: '2', role: 'assistant', content: '第一段', createdAt: 2 },
      ];

      const { rerender } = render(
        <MessageList messages={initialMessages} isGenerating={true} />
      );

      // 容器滚动高度设置：让 scrollTop 保持在底部 (distance <= 100)
      const container = screen.getByRole('log', { name: '消息列表' });
      Object.defineProperty(container, 'scrollHeight', { value: 1000, configurable: true });
      Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
      Object.defineProperty(container, 'scrollTop', { value: 400, configurable: true, writable: true });

      scrollToSpy.mockClear();

      // 流式 chunk 到达：仅修改末条消息的 content
      const updatedMessages: Message[] = [
        { id: '1', role: 'user', content: 'hello', createdAt: 1 },
        { id: '2', role: 'assistant', content: '第一段第二段内容增加', createdAt: 2 },
      ];

      rerender(<MessageList messages={updatedMessages} isGenerating={true} />);

      // 执行 rAF 调度
      expect(rAFCallback).not.toBeNull();
      rAFCallback!(performance.now());

      // 验证 auto 方式吸底被调用
      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 1000,
        behavior: 'auto',
      });
    });

    it('用户主动上滑离开底部区域时，流式 chunk 更新不得强制吸底（用户滚动守卫生效）', async () => {
      let rAFCallback: FrameRequestCallback | null = null;
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rAFCallback = cb;
        return 1;
      });

      const scrollToSpy = vi.fn();
      Element.prototype.scrollTo = scrollToSpy;

      const initialMessages: Message[] = [
        { id: '1', role: 'user', content: 'hello', createdAt: 1 },
        { id: '2', role: 'assistant', content: '第一段', createdAt: 2 },
      ];

      const { rerender } = render(
        <MessageList messages={initialMessages} isGenerating={true} />
      );

      const container = screen.getByRole('log', { name: '消息列表' });
      Object.defineProperty(container, 'scrollHeight', { value: 1000, configurable: true });
      Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
      // 用户上滑：scrollTop 变为 100，距离底部 1000 - 100 - 600 = 300px > 100px
      Object.defineProperty(container, 'scrollTop', { value: 100, configurable: true, writable: true });

      // 触发用户滚动事件
      fireEvent.scroll(container);

      scrollToSpy.mockClear();
      rAFCallback = null;

      // 流式 chunk 追加
      const updatedMessages: Message[] = [
        { id: '1', role: 'user', content: 'hello', createdAt: 1 },
        { id: '2', role: 'assistant', content: '第一段继续输出中...', createdAt: 2 },
      ];

      rerender(<MessageList messages={updatedMessages} isGenerating={true} />);

      // 此时不应调度 rAF 触底滚动
      expect(rAFCallback).toBeNull();
      expect(scrollToSpy).not.toHaveBeenCalled();
    });

    it('用户滑回底部区域时，恢复自动吸底追踪', async () => {
      let rAFCallback: FrameRequestCallback | null = null;
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rAFCallback = cb;
        return 1;
      });

      const scrollToSpy = vi.fn();
      Element.prototype.scrollTo = scrollToSpy;

      const initialMessages: Message[] = [
        { id: '1', role: 'user', content: 'hello', createdAt: 1 },
        { id: '2', role: 'assistant', content: '段落 A', createdAt: 2 },
      ];

      const { rerender } = render(
        <MessageList messages={initialMessages} isGenerating={true} />
      );

      const container = screen.getByRole('log', { name: '消息列表' });
      Object.defineProperty(container, 'scrollHeight', { value: 1000, configurable: true });
      Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });

      // 步骤 1：先滑离底部
      Object.defineProperty(container, 'scrollTop', { value: 100, configurable: true, writable: true });
      fireEvent.scroll(container);

      // 步骤 2：滑回底部区域 (scrollTop = 350，距底部 1000 - 350 - 600 = 50px <= 100px)
      Object.defineProperty(container, 'scrollTop', { value: 350, configurable: true, writable: true });
      fireEvent.scroll(container);

      scrollToSpy.mockClear();
      rAFCallback = null;

      // 步骤 3：chunk 再次到达
      const updatedMessages: Message[] = [
        { id: '1', role: 'user', content: 'hello', createdAt: 1 },
        { id: '2', role: 'assistant', content: '段落 A 紧跟段落 B', createdAt: 2 },
      ];

      rerender(<MessageList messages={updatedMessages} isGenerating={true} />);

      expect(rAFCallback).not.toBeNull();
      rAFCallback!(performance.now());

      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 1000,
        behavior: 'auto',
      });
    });

    it('用户上滑期间发送新消息时，无条件 smooth 强制吸底并重置守卫', async () => {
      const scrollToSpy = vi.fn();
      Element.prototype.scrollTo = scrollToSpy;

      const initialMessages: Message[] = [
        { id: '1', role: 'user', content: 'hello', createdAt: 1 },
        { id: '2', role: 'assistant', content: '回答内容', createdAt: 2 },
      ];

      const { rerender } = render(
        <MessageList messages={initialMessages} isGenerating={false} />
      );

      const container = screen.getByRole('log', { name: '消息列表' });
      Object.defineProperty(container, 'scrollHeight', { value: 1200, configurable: true });
      Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
      // 用户上滑
      Object.defineProperty(container, 'scrollTop', { value: 100, configurable: true, writable: true });
      fireEvent.scroll(container);

      scrollToSpy.mockClear();

      // 发送新消息：messages.length 增加
      const newMessages: Message[] = [
        ...initialMessages,
        { id: '3', role: 'user', content: '上滑中发送新提问', createdAt: 3 },
      ];

      rerender(<MessageList messages={newMessages} isGenerating={false} />);

      // 验证无论当前 scrollTop 处于何处，均执行 smooth 强制吸底
      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 1200,
        behavior: 'smooth',
      });
    });
  });
});
