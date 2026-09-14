import { useState, useCallback, useRef, useEffect } from 'react';
import { Message, ChatAdapter } from '../types';
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
  setInputText: (text: string) => void;
  sendMessage: (content?: string) => Promise<boolean>;
  clearMessages: () => void;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { initialMessages = [], mockDelayMs = 800, adapter = defaultMockAdapter } = options;
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 用 ref 保持最新 adapter 引用，避免切换 adapter 时导致进行中请求被打断或引用滞后
  const adapterRef = useRef<ChatAdapter>(adapter);
  useEffect(() => {
    adapterRef.current = adapter;
  }, [adapter]);

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
      const assistantMessage = createAssistantMessage(response.content);
      setMessages((prev) => [...prev, assistantMessage]);
      return true;
    } catch (err) {
      console.error('Failed to generate reply:', err);
      const fallbackMessage = createAssistantMessage('抱歉，本地回复生成异常，请稍后重试。');
      setMessages((prev) => [...prev, fallbackMessage]);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, messages, mockDelayMs]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    inputText,
    isLoading,
    setInputText,
    sendMessage,
    clearMessages,
  };
}

