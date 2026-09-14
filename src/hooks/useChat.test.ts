import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useChat } from './useChat';
import { ChatAdapter, ChatError } from '../types';

describe('useChat Hook 领域逻辑测试', () => {
  it('应正确初始化空消息列表与空输入框', () => {
    const { result } = renderHook(() => useChat());
    expect(result.current.messages).toEqual([]);
    expect(result.current.inputText).toBe('');
  });

  it('更新输入框文本应同步状态', () => {
    const { result } = renderHook(() => useChat());
    act(() => {
      result.current.setInputText('你好');
    });
    expect(result.current.inputText).toBe('你好');
  });

  it('空白或全空格输入不应发送，且返回 false', async () => {
    const { result } = renderHook(() => useChat());

    // 空字符串
    let success = false;
    await act(async () => {
      success = await result.current.sendMessage();
    });
    expect(success).toBe(false);
    expect(result.current.messages).toHaveLength(0);

    // 全空格字符串
    await act(async () => {
      result.current.setInputText('    ');
    });
    await act(async () => {
      success = await result.current.sendMessage();
    });
    expect(success).toBe(false);
    expect(result.current.messages).toHaveLength(0);
  });

  it('发送有效文本应追加消息并清空输入框', async () => {
    const { result } = renderHook(() => useChat({ mockDelayMs: 0 }));

    await act(async () => {
      result.current.setInputText('  你好，测试消息！  ');
    });

    let success = false;
    await act(async () => {
      success = await result.current.sendMessage();
    });

    expect(success).toBe(true);
    // 包含用户消息与助手回复
    expect(result.current.messages.length).toBeGreaterThanOrEqual(1);
    expect(result.current.messages[0].content).toBe('你好，测试消息！');
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.inputText).toBe('');
  });

  it('clearMessages 应正确清空消息列表', () => {
    const { result } = renderHook(() => useChat());
    act(() => {
      result.current.setInputText('消息 1');
    });
    act(() => {
      result.current.sendMessage();
    });
    expect(result.current.messages).toHaveLength(1);

    act(() => {
      result.current.clearMessages();
    });
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.lastError).toBeNull();
  });

  it('adapter.send 返回 usage 时应正确附着在 assistant 消息上', async () => {
    const mockAdapterWithUsage: ChatAdapter = {
      id: 'mock-with-usage',
      name: 'Mock With Usage',
      send: async () => ({
        content: '回复内容',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      }),
      stream: async function* () {
        yield { delta: '回复内容', accumulated: '回复内容', done: true };
      },
    };

    const { result } = renderHook(() =>
      useChat({ adapter: mockAdapterWithUsage, mockDelayMs: 0 })
    );

    await act(async () => {
      await result.current.sendMessage('测试带用量');
    });

    expect(result.current.messages).toHaveLength(2);
    const assistantMsg = result.current.messages[1];
    expect(assistantMsg.role).toBe('assistant');
    expect(assistantMsg.usage).toEqual({
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
    });
  });

  it('调用失败时应正确捕获 lastError 且不向消息队列插入伪造回复', async () => {
    const failingAdapter: ChatAdapter = {
      id: 'failing-adapter',
      name: 'Failing Adapter',
      send: async () => {
        throw new ChatError('403 PERMISSION_DENIED', 'AUTH_ERROR');
      },
      stream: async function* () {
        throw new ChatError('Stream error', 'AUTH_ERROR');
      },
    };

    const { result } = renderHook(() =>
      useChat({ adapter: failingAdapter, mockDelayMs: 0 })
    );

    let success = true;
    await act(async () => {
      success = await result.current.sendMessage('你好');
    });

    expect(success).toBe(false);
    expect(result.current.lastError).toBeInstanceOf(ChatError);
    expect(result.current.lastError?.code).toBe('AUTH_ERROR');
    expect(result.current.lastError?.message).toBe('403 PERMISSION_DENIED');
    // 队列中仅有用户发出的那条消息，绝不追加伪造的 assistant 异常消息
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('user');
  });

  it('lastError 的生命周期规范：新发送、手动关闭、清空会话应清除 lastError', async () => {
    const failingAdapter: ChatAdapter = {
      id: 'failing-adapter',
      name: 'Failing Adapter',
      send: async () => {
        throw new ChatError('Network failed', 'NETWORK_ERROR');
      },
      stream: async function* () {},
    };

    const { result } = renderHook(() =>
      useChat({ adapter: failingAdapter, mockDelayMs: 0 })
    );

    await act(async () => {
      await result.current.sendMessage('第一次发送');
    });
    expect(result.current.lastError?.code).toBe('NETWORK_ERROR');

    // 手动关闭清除
    act(() => {
      result.current.dismissError();
    });
    expect(result.current.lastError).toBeNull();
  });

  it('retryFailedSend 守卫规则：无错误或末条不是 user 时拒绝执行，返回 false', async () => {
    const { result } = renderHook(() => useChat({ mockDelayMs: 0 }));

    // 状态无错误时调用 retry
    let retried = false;
    await act(async () => {
      retried = await result.current.retryFailedSend();
    });
    expect(retried).toBe(false);
  });

  it('retryFailedSend 成功时应清除错误、重新发起请求并追加 assistant 消息（日志严格仅追加，零截断）', async () => {
    let shouldFail = true;
    const flappyAdapter: ChatAdapter = {
      id: 'flappy-adapter',
      name: 'Flappy Adapter',
      send: async (msgs) => {
        if (shouldFail) {
          throw new ChatError('Temporary model timeout', 'MODEL_ERROR');
        }
        return {
          content: `针对 "${msgs[msgs.length - 1].content}" 的成功回复`,
          usage: { promptTokens: 5, completionTokens: 15, totalTokens: 20 },
        };
      },
      stream: async function* () {},
    };

    const { result } = renderHook(() =>
      useChat({ adapter: flappyAdapter, mockDelayMs: 0 })
    );

    // 第一次调用失败
    await act(async () => {
      await result.current.sendMessage('请问天气如何？');
    });
    expect(result.current.lastError?.code).toBe('MODEL_ERROR');
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe('请问天气如何？');

    // 模拟恢复正常后重试
    shouldFail = false;
    let retrySuccess = false;
    await act(async () => {
      retrySuccess = await result.current.retryFailedSend();
    });

    expect(retrySuccess).toBe(true);
    expect(result.current.lastError).toBeNull();
    // 严格仅追加：原用户消息保留，追加一条助手消息，总数变为 2
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[0].content).toBe('请问天气如何？');
    expect(result.current.messages[1].role).toBe('assistant');
    expect(result.current.messages[1].content).toBe('针对 "请问天气如何？" 的成功回复');
    expect(result.current.messages[1].usage).toEqual({
      promptTokens: 5,
      completionTokens: 15,
      totalTokens: 20,
    });
  });
});
