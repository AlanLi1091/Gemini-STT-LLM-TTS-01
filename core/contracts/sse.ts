/**
 * 前后端共享的聊天流式传输契约。
 *
 * Task 13 采用无状态请求：客户端发送完整 messages，sessionId 省略。
 * Task 14 带 sessionId 时，messages 是本轮待追加输入，服务端以该会话的
 * 完整持久化历史作为模型上下文；SSE 事件结构保持不变。
 * 当前协议不支持通过 Last-Event-ID 断点续传，断线后必须发起全新请求。
 */

export const SSE_DEFAULT_HEARTBEAT_MS = 15_000;
export const SSE_SUPPORTS_RESUMPTION = false;

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
  /** 省略时使用无状态模式；提供时由服务端寻址持久化会话。 */
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
