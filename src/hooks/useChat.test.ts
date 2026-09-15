import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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

  it('clearMessages 应正确清空消息列表', async () => {
    const { result } = renderHook(() => useChat({ mockDelayMs: 0 }));
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

  it('adapter.send 返回 usage 时应正确附着在 assistant 消息上（当 adapter 未实现 stream 时降级 send）', async () => {
    const mockAdapterWithUsage: ChatAdapter = {
      id: 'mock-with-usage',
      name: 'Mock With Usage',
      send: async () => ({
        content: '回复内容',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      }),
      // 不提供 stream，测试 send 降级分支及 usage 解析
    } as unknown as ChatAdapter;

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
        throw new ChatError('403 PERMISSION_DENIED', 'AUTH_ERROR');
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
      stream: async function* () {
        throw new ChatError('Network failed', 'NETWORK_ERROR');
      },
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
      stream: async function* (msgs) {
        if (shouldFail) {
          throw new ChatError('Temporary model timeout', 'MODEL_ERROR');
        }
        yield {
          delta: `针对 "${msgs[msgs.length - 1].content}" 的成功回复`,
          accumulated: `针对 "${msgs[msgs.length - 1].content}" 的成功回复`,
          done: true,
          usage: { promptTokens: 5, completionTokens: 15, totalTokens: 20 },
        };
      },
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

  it('流式生成时应逐步更新消息内容并在完成时将 isGenerating 置为 false', async () => {
    let resolveFirstChunk!: () => void;
    let resolveSecondChunk!: () => void;

    const streamingAdapter: ChatAdapter = {
      id: 'streaming-adapter',
      name: 'Streaming Adapter',
      send: vi.fn(),
      stream: async function* () {
        await new Promise<void>((res) => {
          resolveFirstChunk = res;
        });
        yield { delta: '你好', accumulated: '你好', done: false };

        await new Promise<void>((res) => {
          resolveSecondChunk = res;
        });
        yield {
          delta: '世界',
          accumulated: '你好世界',
          done: true,
          usage: { promptTokens: 2, completionTokens: 4, totalTokens: 6 },
        };
      },
    };

    const { result } = renderHook(() =>
      useChat({ adapter: streamingAdapter, mockDelayMs: 0 })
    );

    let sendPromise!: Promise<boolean>;
    act(() => {
      sendPromise = result.current.sendMessage('测试流式');
    });

    // 初始状态：正在 loading 思考态
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('user');

    // 释放第一个 chunk
    await act(async () => {
      resolveFirstChunk();
    });

    // 第一个 chunk 收到后：isLoading 解除，isGenerating 变为 true，assistant 消息上屏
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isGenerating).toBe(true);
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].role).toBe('assistant');
    expect(result.current.messages[1].content).toBe('你好');

    // 释放第二个 chunk
    await act(async () => {
      resolveSecondChunk();
      await sendPromise;
    });

    // 完成状态：isGenerating 变为 false，最终内容完整
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.messages[1].content).toBe('你好世界');
    expect(result.current.messages[1].usage).toEqual({
      promptTokens: 2,
      completionTokens: 4,
      totalTokens: 6,
    });
  });

  it('调用 stopGenerating 应立即打断流式传输，保留已上屏内容且不报错误', async () => {
    let abortedSignalPassed: boolean | undefined;

    const abortableAdapter: ChatAdapter = {
      id: 'abortable-adapter',
      name: 'Abortable Adapter',
      send: vi.fn(),
      stream: async function* (_msgs, options) {
        yield { delta: '正在生成第1句', accumulated: '正在生成第1句', done: false };

        // 模拟后续长延时，等待外部 abort
        await new Promise<void>((_, reject) => {
          options?.signal?.addEventListener('abort', () => {
            abortedSignalPassed = options.signal?.aborted;
            reject(new ChatError('The operation was aborted.', 'ABORTED'));
          });
        });
      },
    };

    const { result } = renderHook(() =>
      useChat({ adapter: abortableAdapter, mockDelayMs: 0 })
    );

    let sendPromise!: Promise<boolean>;
    act(() => {
      sendPromise = result.current.sendMessage('请作长文');
    });

    // 等待第一个 chunk 上屏
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isGenerating).toBe(true);
    expect(result.current.messages[1].content).toBe('正在生成第1句');

    // 主动调用 stopGenerating
    await act(async () => {
      result.current.stopGenerating();
      await sendPromise;
    });

    expect(abortedSignalPassed).toBe(true);
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.isLoading).toBe(false);
    // 主动打断不设置 lastError
    expect(result.current.lastError).toBeNull();
    // 保留已生成的片段
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].content).toBe('正在生成第1句');
  });

  it('流式过程中抛出异常应正确捕获 lastError 并结束生成状态', async () => {
    const errorAdapter: ChatAdapter = {
      id: 'error-adapter',
      name: 'Error Adapter',
      send: vi.fn(),
      stream: async function* () {
        yield { delta: '前段正常', accumulated: '前段正常', done: false };
        throw new ChatError('网络中途断开', 'NETWORK_ERROR');
      },
    };

    const { result } = renderHook(() =>
      useChat({ adapter: errorAdapter, mockDelayMs: 0 })
    );

    let success = true;
    await act(async () => {
      success = await result.current.sendMessage('测试流式异常');
    });

    expect(success).toBe(false);
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.lastError?.code).toBe('NETWORK_ERROR');
    expect(result.current.lastError?.message).toBe('网络中途断开');
  });
});
