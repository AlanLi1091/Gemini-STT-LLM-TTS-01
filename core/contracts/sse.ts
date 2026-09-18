/**
 * 前后端共享的聊天流式传输契约。
 *
 * Task 13 采用无状态请求：客户端发送完整 messages，sessionId 省略。
 * Task 14 启用持久化后可逐步携带 sessionId，而无需改变 SSE 事件结构。
 */

export const CHAT_ERROR_CODES = [
  'AUTH_ERROR',
  'RATE_LIMIT',
  'NETWORK_ERROR',
  'MODEL_ERROR',
  'ABORTED',
  'UNKNOWN',
] as const;

export type ChatErrorCode = (typeof CHAT_ERROR_CODES)[number];

export interface ChatStreamMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatStreamRequest {
  messages: ChatStreamMessage[];
  /** Task 13 省略；Task 14 启用会话持久化后由客户端传入。 */
  sessionId?: string;
}

export interface SseUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface SseChunkEvent {
  event: 'chunk';
  data: {
    delta: string;
    accumulated: string;
  };
}

export interface SseDoneEvent {
  event: 'done';
  data: {
    content: string;
    usage?: SseUsage;
  };
}

export interface SseErrorEvent {
  event: 'error';
  data: {
    error: {
      code: ChatErrorCode;
      message: string;
    };
  };
}

export type ChatSseEvent = SseChunkEvent | SseDoneEvent | SseErrorEvent;

export interface HealthResponse {
  status: 'ok';
  service: 'gemini-chat-server';
  coreVersion: string;
}
