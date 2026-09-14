export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  /** 单次回复消耗的 Token 用量（Task 10 流式完成时回填于此字段，与 ADR-007 语义保持一致） */
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

export type ChatErrorCode =
  | 'AUTH_ERROR'
  | 'RATE_LIMIT'
  | 'NETWORK_ERROR'
  | 'MODEL_ERROR'
  | 'ABORTED'
  | 'UNKNOWN';

export class ChatError extends Error {
  readonly code: ChatErrorCode;
  readonly status?: number;
  readonly originalError?: unknown;

  constructor(message: string, code: ChatErrorCode, options?: { status?: number; originalError?: unknown }) {
    super(message);
    this.name = 'ChatError';
    this.code = code;
    this.status = options?.status;
    this.originalError = options?.originalError;
  }
}

export interface GeminiAdapterConfig {
  apiKey: string;
  model?: string; // 默认 'gemini-3.8-flash'
  systemInstruction?: string;
}

/**
 * 统一聊天模型适配器契约 (ADR-003, ADR-007)
 */
export interface ChatAdapter {
  readonly id: string;
  readonly name: string;
  send(messages: Message[], options?: ChatAdapterOptions): Promise<ChatResponse>;
  stream(messages: Message[], options?: ChatAdapterOptions): AsyncIterable<ChatChunk>;
}

export type ProviderType = 'mock' | 'gemini';

export interface AppSettings {
  provider: ProviderType;
  geminiApiKey: string;
  geminiModel: string;
}

export const AVAILABLE_GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (快速 & 推荐)' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (深度推理)' },
] as const;

export const DEFAULT_SETTINGS: Readonly<AppSettings> = Object.freeze({
  provider: 'mock',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
});
