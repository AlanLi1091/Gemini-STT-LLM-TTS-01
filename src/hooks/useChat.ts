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
  lastError: ChatError | null;
  setInputText: (text: string) => void;
  sendMessage: (content?: string) => Promise<boolean>;
  retryFailedSend: () => Promise<boolean>;
  dismissError: () => void;
  clearMessages: () => void;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { initialMessages = [], mockDelayMs = 800, adapter = defaultMockAdapter } = options;
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastError, setLastError] = useState<ChatError | null>(null);

  // 用 ref 保持最新 adapter 引用，避免切换 adapter 时导致进行中请求被打断或引用滞后
  const adapterRef = useRef<ChatAdapter>(adapter);
  useEffect(() => {
    adapterRef.current = adapter;
  }, [adapter]);

  const dismissError = useCallback(() => {
    setLastError(null);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setLastError(null);
  }, []);

  const sendMessage = useCallback(async (customContent?: string): Promise<boolean> => {
    // 思考中禁止重复触发
    if (isLoading) {
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
    setIsLoading(true);

    try {
      const activeAdapter = adapterRef.current;
      const response = await activeAdapter.send(nextMessages, { delayMs: mockDelayMs });
      const assistantMessage = createAssistantMessage(response.content, response.usage);
      setMessages((prev) => [...prev, assistantMessage]);
      return true;
    } catch (err) {
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
      setIsLoading(false);
    }
  }, [inputText, isLoading, messages, mockDelayMs]);

  /**
   * 失败重试（限定失败场景，会话日志严格仅追加，零截断）
   * 守卫规则：仅当存在未恢复的 lastError 且最后一条为 user 消息时可用
   */
  const retryFailedSend = useCallback(async (): Promise<boolean> => {
    if (isLoading || !lastError || messages.length === 0) {
      return false;
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'user') {
      return false;
    }

    // 开始重试，清空当前错误
    setLastError(null);
    setIsLoading(true);

    try {
      const activeAdapter = adapterRef.current;
      const response = await activeAdapter.send(messages, { delayMs: mockDelayMs });
      const assistantMessage = createAssistantMessage(response.content, response.usage);
      setMessages((prev) => [...prev, assistantMessage]);
      return true;
    } catch (err) {
      console.error('Failed to retry send:', err);
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
      setIsLoading(false);
    }
  }, [isLoading, lastError, messages, mockDelayMs]);

  return {
    messages,
    inputText,
    isLoading,
    lastError,
    setInputText,
    sendMessage,
    retryFailedSend,
    dismissError,
    clearMessages,
  };
}

