import { useState, useCallback, useRef, useEffect } from 'react';
import { Message, ChatAdapter, ChatError, ChatUsage } from '../types';
import { defaultMockAdapter } from '../services/mockChatService';

export interface UseChatOptions {
  initialMessages?: Message[];
  mockDelayMs?: number;
  adapter?: ChatAdapter;
}

export interface UseChatReturn {
  messages: Message[];
  inputText: string;
  isLoading: boolean;
  isGenerating: boolean;
  lastError: ChatError | null;
  setInputText: (text: string) => void;
  sendMessage: (content?: string) => Promise<boolean>;
  stopGenerating: () => void;
  retryFailedSend: () => Promise<boolean>;
  dismissError: () => void;
  clearMessages: () => void;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { initialMessages = [], mockDelayMs = 800, adapter = defaultMockAdapter } = options;
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [lastError, setLastError] = useState<ChatError | null>(null);

  // 用 ref 保持最新 adapter 引用，避免切换 adapter 时导致进行中请求被打断或引用滞后
  const adapterRef = useRef<ChatAdapter>(adapter);
  useEffect(() => {
    adapterRef.current = adapter;
  }, [adapter]);

  // 控制当前进行中的流式中断控制器
  const abortControllerRef = useRef<AbortController | null>(null);

  // 组件卸载时安全中断进行中的请求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const stopGenerating = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const dismissError = useCallback(() => {
    setLastError(null);
  }, []);

  const clearMessages = useCallback(() => {
    stopGenerating();
    setMessages([]);
    setLastError(null);
  }, [stopGenerating]);

  const executeStream = useCallback(
    async (contextMessages: Message[]): Promise<boolean> => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setIsGenerating(true);

      let accumulatedContent = '';
      let latestUsage: ChatUsage | undefined;
      let assistantMessageId: string | null = null;

      try {
        const activeAdapter = adapterRef.current;
        const streamIterable = activeAdapter.stream(contextMessages, {
          signal: controller.signal,
          delayMs: mockDelayMs,
        });

        for await (const chunk of streamIterable) {
          if (chunk.usage) {
            latestUsage = chunk.usage;
          }
          if (chunk.accumulated !== undefined) {
            accumulatedContent = chunk.accumulated;
          } else if (chunk.delta) {
            accumulatedContent += chunk.delta;
          }

          if (!assistantMessageId) {
            assistantMessageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const newAssistantMsg: Message = {
              id: assistantMessageId,
              role: 'assistant',
              content: accumulatedContent,
              createdAt: Date.now(),
              ...(latestUsage ? { usage: latestUsage } : {}),
            };
            setMessages((prev) => [...prev, newAssistantMsg]);
          } else {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: accumulatedContent,
                      ...(latestUsage ? { usage: latestUsage } : {}),
                    }
                  : msg
              )
            );
          }
        }

        // 若流未抛出异常但未分块产生且已有累积内容，兜底插入
        if (!assistantMessageId && accumulatedContent) {
          assistantMessageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          const newAssistantMsg: Message = {
            id: assistantMessageId,
            role: 'assistant',
            content: accumulatedContent,
            createdAt: Date.now(),
            ...(latestUsage ? { usage: latestUsage } : {}),
          };
          setMessages((prev) => [...prev, newAssistantMsg]);
        }

        return true;
      } catch (err: unknown) {
        const isAborted =
          controller.signal.aborted ||
          (err instanceof ChatError && err.code === 'ABORTED') ||
          (err as Error)?.name === 'AbortError';

        if (isAborted) {
          // 用户主动停止生成
          if (assistantMessageId) {
            if (accumulatedContent.trim() === '') {
              setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
            } else {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: accumulatedContent, aborted: true }
                    : msg
                )
              );
            }
          }
          return false;
        } else {
          // 外部调用故障
          console.error('Failed to generate reply:', err);
          const normalizedError =
            err instanceof ChatError
              ? err
              : new ChatError(
                  err instanceof Error ? err.message : 'Unknown chat error',
                  'UNKNOWN'
                );
          setLastError(normalizedError);

          if (assistantMessageId) {
            if (accumulatedContent.trim() === '') {
              setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
            } else {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: accumulatedContent }
                    : msg
                )
              );
            }
          }
          return false;
        }
      } finally {
        setIsLoading(false);
        setIsGenerating(false);
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [mockDelayMs]
  );

  const sendMessage = useCallback(
    async (customContent?: string): Promise<boolean> => {
      // 生成中禁止重复触发
      if (isLoading || isGenerating) {
        return false;
      }

      const rawContent = customContent !== undefined ? customContent : inputText;
      const trimmed = rawContent.trim();

      // 空白防误触：空字符串或全空格不发送
      if (!trimmed) {
        return false;
      }

      // 发起新发送前清除既有错误
      setLastError(null);

      const userMessage: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: 'user',
        content: trimmed,
        createdAt: Date.now(),
      };

      const contextMessages = [...messages, userMessage];
      setMessages(contextMessages);
      setInputText('');

      return await executeStream(contextMessages);
    },
    [executeStream, inputText, isGenerating, isLoading, messages]
  );

  /**
   * 失败重试（限定失败场景，会话日志严格仅追加，零截断）
   * 守卫规则：仅当存在未恢复的 lastError 且不在生成中时可用
   */
  const retryFailedSend = useCallback(async (): Promise<boolean> => {
    if (isLoading || isGenerating || !lastError || messages.length === 0) {
      return false;
    }

    // 寻找最近一条用户消息作为重试上下文
    const lastUserIndex = messages.map((m) => m.role).lastIndexOf('user');
    if (lastUserIndex === -1) {
      return false;
    }

    // 遵循 ADR-005：截断目标消息之后的消息，并重新驱动流
    const contextMessages = messages.slice(0, lastUserIndex + 1);

    // 开始重试，清空当前错误
    setLastError(null);
    setMessages(contextMessages);

    return await executeStream(contextMessages);
  }, [executeStream, isGenerating, isLoading, lastError, messages]);

  return {
    messages,
    inputText,
    isLoading,
    isGenerating,
    lastError,
    setInputText,
    sendMessage,
    stopGenerating,
    retryFailedSend,
    dismissError,
    clearMessages,
  };
}

