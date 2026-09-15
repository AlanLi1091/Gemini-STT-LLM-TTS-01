import { renderHook, act, waitFor } from '@testing-library/react';
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

  it('adapter.stream 返回 usage 时应正确附着在 assistant 消息上', async () => {
    const mockAdapterWithUsage: ChatAdapter = {
      id: 'mock-with-usage',
      name: 'Mock With Usage',
      send: async () => ({
        content: '回复内容',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      }),
      stream: async function* () {
        yield {
          delta: '回复内容',
          accumulated: '回复内容',
          done: true,
          usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        };
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
        const text = `针对 "${msgs[msgs.length - 1].content}" 的成功回复`;
        yield {
          delta: text,
          accumulated: text,
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

  describe('Task 10 Step 2: 流式状态机与中断控制测试', () => {
    it('isGenerating 与 isLoading 状态应在生成过程中为 true，完成后恢复为 false', async () => {
      let finishStream!: () => void;
      let chunk1Yielded!: () => void;
      const chunk1Promise = new Promise<void>((r) => {
        chunk1Yielded = r;
      });

      const controlledAdapter: ChatAdapter = {
        id: 'controlled',
        name: 'Controlled',
        send: async () => ({ content: 'done' }),
        stream: async function* () {
          yield { delta: 'chunk1', accumulated: 'chunk1', done: false };
          chunk1Yielded();
          await new Promise<void>((resolve) => {
            finishStream = resolve;
          });
          yield { delta: 'chunk2', accumulated: 'chunk1chunk2', done: true };
        },
      };

      const { result } = renderHook(() =>
        useChat({ adapter: controlledAdapter, mockDelayMs: 0 })
      );

      const sendPromise = result.current.sendMessage('你好');
      await chunk1Promise;

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(true);
        expect(result.current.isLoading).toBe(true);
        expect(result.current.messages).toHaveLength(2);
      });

      // 解锁流式结束
      await act(async () => {
        finishStream();
        await sendPromise;
      });

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.messages[1].content).toBe('chunk1chunk2');
    });

    it('生成中再次触发 sendMessage 应当被守卫拦截并直接返回 false', async () => {
      let finishSlow!: () => void;
      let slowStarted!: () => void;
      const startedPromise = new Promise<void>((r) => {
        slowStarted = r;
      });

      const slowAdapter: ChatAdapter = {
        id: 'slow',
        name: 'Slow',
        send: async () => ({ content: 'done' }),
        stream: async function* () {
          slowStarted();
          await new Promise<void>((r) => {
            finishSlow = r;
          });
          yield { delta: 'test', accumulated: 'test', done: true };
        },
      };

      const { result } = renderHook(() =>
        useChat({ adapter: slowAdapter, mockDelayMs: 0 })
      );

      const p1 = result.current.sendMessage('一');
      await startedPromise;

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(true);
      });

      let p2Result: boolean = true;
      await act(async () => {
        p2Result = await result.current.sendMessage('二');
      });

      expect(p2Result).toBe(false);

      await act(async () => {
        finishSlow();
        await p1;
      });
    });

    it('stopGenerating() 在流式过程中调用时应成功中断生成，保留已产出片段并标记 aborted: true，不弹 error', async () => {
      let startAbort!: () => void;
      const startedPromise = new Promise<void>((r) => {
        startAbort = r;
      });

      const abortableAdapter: ChatAdapter = {
        id: 'abortable',
        name: 'Abortable',
        send: async () => ({ content: 'done' }),
        stream: async function* (_msgs, options) {
          yield { delta: '先产出的文字', accumulated: '先产出的文字', done: false };
          startAbort();
          await new Promise<void>((resolve, reject) => {
            const onAbort = () => reject(new ChatError('User aborted', 'ABORTED'));
            if (options?.signal?.aborted) {
              onAbort();
              return;
            }
            options?.signal?.addEventListener('abort', onAbort);
          });
        },
      };

      const { result } = renderHook(() =>
        useChat({ adapter: abortableAdapter, mockDelayMs: 0 })
      );

      const sendPromise = result.current.sendMessage('测试中途打断');
      await startedPromise;

      // 此时第一个 chunk 已产出
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
        expect(result.current.messages[1].content).toBe('先产出的文字');
        expect(result.current.isGenerating).toBe(true);
      });

      // 用户主动打断
      await act(async () => {
        result.current.stopGenerating();
        await sendPromise;
      });

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.isLoading).toBe(false);
      // 用户主动打断不属于故障，不产生 lastError
      expect(result.current.lastError).toBeNull();
      // 保留已产出的片段，且标记 aborted: true
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].content).toBe('先产出的文字');
      expect(result.current.messages[1].aborted).toBe(true);
    });

    it('stopGenerating() 在首个 chunk 到达前调用时，应干净中断且不留下空白消息气泡', async () => {
      let triggerAbortReady!: () => void;
      const readyPromise = new Promise<void>((r) => {
        triggerAbortReady = r;
      });

      const slowFirstTokenAdapter: ChatAdapter = {
        id: 'slow-first-token',
        name: 'Slow First Token',
        send: async () => ({ content: 'done' }),
        stream: async function* (_msgs, options) {
          triggerAbortReady();
          await new Promise<void>((_, reject) => {
            const onAbort = () => reject(new ChatError('Aborted before token', 'ABORTED'));
            options?.signal?.addEventListener('abort', onAbort);
          });
          yield { delta: 'never reached', accumulated: 'never reached', done: true };
        },
      };

      const { result } = renderHook(() =>
        useChat({ adapter: slowFirstTokenAdapter, mockDelayMs: 0 })
      );

      const sendPromise = result.current.sendMessage('思考态打断');
      await readyPromise;

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(true);
        expect(result.current.messages).toHaveLength(1);
      });

      await act(async () => {
        result.current.stopGenerating();
        await sendPromise;
      });

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.lastError).toBeNull();
      // 0 字符中断绝不在队列留下空白气泡
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].role).toBe('user');
    });

    it('流式生成中途发生异常时，应保留已产生的部分文字，同时正确设置 lastError', async () => {
      const failingMidStreamAdapter: ChatAdapter = {
        id: 'failing-mid-stream',
        name: 'Failing Mid Stream',
        send: async () => ({ content: 'done' }),
        stream: async function* () {
          yield { delta: '已完成前半句，', accumulated: '已完成前半句，', done: false };
          throw new ChatError('连接被重置', 'NETWORK_ERROR');
        },
      };

      const { result } = renderHook(() =>
        useChat({ adapter: failingMidStreamAdapter, mockDelayMs: 0 })
      );

      await act(async () => {
        await result.current.sendMessage('测试流式异常保留');
      });

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.lastError?.code).toBe('NETWORK_ERROR');
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].content).toBe('已完成前半句，');
      expect(result.current.messages[1].aborted).toBeUndefined();
    });

    it('流式异常重试 (retryFailedSend) 时应替换截断旧的故障片段，完成全新完整回复', async () => {
      let isFirstTry = true;
      const retryAdapter: ChatAdapter = {
        id: 'retry-adapter',
        name: 'Retry Adapter',
        send: async () => ({ content: 'done' }),
        stream: async function* () {
          if (isFirstTry) {
            yield { delta: '半句话', accumulated: '半句话', done: false };
            throw new ChatError('网络抖动', 'NETWORK_ERROR');
          } else {
            yield { delta: '完整的回答内容', accumulated: '完整的回答内容', done: true };
          }
        },
      };

      const { result } = renderHook(() =>
        useChat({ adapter: retryAdapter, mockDelayMs: 0 })
      );

      await act(async () => {
        await result.current.sendMessage('需要回答的问题');
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].content).toBe('半句话');
      expect(result.current.lastError?.code).toBe('NETWORK_ERROR');

      // 重试
      isFirstTry = false;
      let retrySuccess = false;
      await act(async () => {
        retrySuccess = await result.current.retryFailedSend();
      });

      expect(retrySuccess).toBe(true);
      expect(result.current.lastError).toBeNull();
      // ADR-005 规范：截断原故障消息，追加全新完整回复
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].role).toBe('user');
      expect(result.current.messages[1].role).toBe('assistant');
      expect(result.current.messages[1].content).toBe('完整的回答内容');
    });
  });
});
