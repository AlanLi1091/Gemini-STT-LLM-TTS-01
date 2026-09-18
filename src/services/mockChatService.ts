import { Message } from '../types';
import { MockChatAdapter } from '@core/adapters/MockChatAdapter';

export interface MockResponseOptions {
  delayMs?: number;
}

export const defaultMockAdapter = new MockChatAdapter();

/**
 * 纯逻辑 Mock 响应生成策略（遵循 ADR-003，重构对接 MockChatAdapter）
 */
export async function generateMockReply(
  userText: string,
  options: MockResponseOptions = {}
): Promise<string> {
  const dummyMessage: Message = {
    id: 'temp-user-msg',
    role: 'user',
    content: userText,
    createdAt: Date.now(),
  };

  const response = await defaultMockAdapter.send([dummyMessage], {
    delayMs: options.delayMs,
  });

  return response.content;
}

export function createAssistantMessage(content: string, usage?: Message['usage']): Message {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role: 'assistant',
    content,
    createdAt: Date.now(),
    ...(usage ? { usage } : {}),
  };
}
