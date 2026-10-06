import { useState, useCallback, useRef, useEffect } from 'react';
import { Message, ChatAdapter, ChatError } from '../types';
import { defaultMockAdapter, createAssistantMessage } from '../services/mockChatService';

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
  retryFailedSend: () => Promise<boolean>;
  stopGenerating: () => void;
  dismissError: () => void;
  replaceMessages: (messages: Message[]) => void;
  clearMessages: () => void;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { initialMessages = [], mockDelayMs = 800, adapter = defaultMockAdapter } = options;
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [lastError, setLastError] = useState<ChatError | null>(null);

  // 维护当前活跃流式生成所关联的 AbortController 实例
  const abortControllerRef = useRef<AbortController | null>(null);

  // 用 ref 保持最新 adapter 引用，避免切换 adapter 时导致进行中请求被打断或引用滞后
  const adapterRef = useRef<ChatAdapter>(adapter);
  useEffect(() => {
    adapterRef.current = adapter;
  }, [adapter]);

  // 组件卸载时自动 abort 正在进行的请求，防止内存泄漏或无效回调
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
    setIsGenerating(false);
    setIsLoading(false);
  }, []);

  const dismissError = useCallback(() => {
    setLastError(null);
  }, []);

  const replaceMessages = useCallback((nextMessages: Message[]) => {
    stopGenerating();
    setMessages(nextMessages);
    setLastError(null);
  }, [stopGenerating]);

  const clearMessages = useCallback(() => {
    stopGenerating();
    setMessages([]);
    setLastError(null);
  }, [stopGenerating]);

  const executeSend = useCallback(
    async (contextMessages: Message[]): Promise<boolean> => {
      const activeAdapter = adapterRef.current;
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setIsGenerating(false);

      // 创建一个尚未挂载的 assistant 占位消息对象
      const assistantId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      let assistantMounted = false;

      try {
        // 优先尝试流式接口
        if (typeof activeAdapter.stream === 'function') {
          const streamIterable = activeAdapter.stream(contextMessages, {
            delayMs: mockDelayMs,
            signal: controller.signal,
          });

          for await (const chunk of streamIterable) {
            // 第一个 chunk 到达：解除 initial loading 思考态，进入 generating 打字机态
            if (!assistantMounted) {
              assistantMounted = true;
              setIsLoading(false);
              setIsGenerating(true);
              const initialAssistantMessage: Message = {
                id: assistantId,
                role: 'assistant',
                content: chunk.accumulated,
                createdAt: Date.now(),
                ...(chunk.usage ? { usage: chunk.usage } : {}),
              };
              setMessages((prev) => [...prev, initialAssistantMessage]);
            } else {
              // 逐 chunk 更新最后一条 assistant 消息（ADR-007: 流式追加更新符合不可变约束）
              setMessages((prev) => {
                const lastIdx = prev.length - 1;
                if (lastIdx < 0 || prev[lastIdx].id !== assistantId) {
                  return prev;
                }
                const updated = [...prev];
                updated[lastIdx] = {
                  ...updated[lastIdx],
                  content: chunk.accumulated,
                  ...(chunk.usage ? { usage: chunk.usage } : {}),
                };
                return updated;
              });
            }
          }

          setIsGenerating(false);
          return true;
        }

        // 降级非流式接口
        const response = await activeAdapter.send(contextMessages, {
          delayMs: mockDelayMs,
          signal: controller.signal,
        });
        const assistantMessage = createAssistantMessage(response.content, response.usage);
        setMessages((prev) => [...prev, assistantMessage]);
        return true;
      } catch (err) {
        // 检查是否是被主动中止（手动打断）
        const isAbort =
          controller.signal.aborted ||
          (err instanceof ChatError && err.code === 'ABORTED') ||
          (err instanceof Error && err.name === 'AbortError');

        if (isAbort) {
          // 主动打断不视为致命故障，保留已上屏的片段，不设 lastError
          return false;
        }

        console.error('Failed to generate reply:', err);
        const normalizedError =
          err instanceof ChatError
            ? err
            : new ChatError(
                err instanceof Error ? err.message : 'Unknown chat error',
                'UNKNOWN'
              );
        setLastError(normalizedError);
        return false;
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        setIsLoading(false);
        setIsGenerating(false);
      }
    },
    [mockDelayMs]
  );

  const sendMessage = useCallback(
    async (customContent?: string): Promise<boolean> => {
      // 思考中或流式生成中禁止重复触发
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

      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setInputText('');

      return await executeSend(nextMessages);
    },
    [executeSend, inputText, isGenerating, isLoading, messages]
  );

  /**
   * 失败重试（限定失败场景，会话日志严格仅追加，零截断）
   * 守卫规则：仅当存在未恢复的 lastError 且最后一条为 user 消息时可用
   */
  const retryFailedSend = useCallback(async (): Promise<boolean> => {
    if (isLoading || isGenerating || !lastError || messages.length === 0) {
      return false;
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'user') {
      return false;
    }

    // 开始重试，清空当前错误
    setLastError(null);
    return await executeSend(messages);
  }, [executeSend, isGenerating, isLoading, lastError, messages]);

  return {
    messages,
    inputText,
    isLoading,
    isGenerating,
    lastError,
    setInputText,
    sendMessage,
    retryFailedSend,
    stopGenerating,
    dismissError,
    replaceMessages,
    clearMessages,
  };
}
