import type { ChatErrorCode } from './contracts/sse';

export type { ChatErrorCode } from './contracts/sse';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  usage?: ChatUsage;
}

export interface ChatUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ChatResponse {
  content: string;
  usage?: ChatUsage;
}

export interface ChatChunk {
  delta: string;
  accumulated: string;
  usage?: ChatUsage;
  done: boolean;
}

export interface ChatAdapterOptions {
  signal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;
  [key: string]: unknown;
}

export class ChatError extends Error {
  readonly code: ChatErrorCode;
  readonly status?: number;
  readonly originalError?: unknown;

  constructor(
    message: string,
    code: ChatErrorCode,
    options?: { status?: number; originalError?: unknown },
  ) {
    super(message);
    this.name = 'ChatError';
    this.code = code;
    this.status = options?.status;
    this.originalError = options?.originalError;
  }
}

export interface GeminiAdapterConfig {
  apiKey: string;
  model?: string;
  systemInstruction?: string;
}

/** 统一聊天模型适配器契约 (ADR-003, ADR-007) */
export interface ChatAdapter {
  readonly id: string;
  readonly name: string;
  send(messages: Message[], options?: ChatAdapterOptions): Promise<ChatResponse>;
  stream(messages: Message[], options?: ChatAdapterOptions): AsyncIterable<ChatChunk>;
}
