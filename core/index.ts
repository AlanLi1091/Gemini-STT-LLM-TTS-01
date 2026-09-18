/**
 * @core 领域内核与通用契约入口
 * 遵循 ADR-009 架构设计：纯 TS 实现，无 DOM、无 React、无 Node 特有依赖
 */

export const CORE_VERSION = '0.1.0';

export type {
  ChatErrorCode,
  ChatSseEvent,
  ChatStreamMessage,
  ChatStreamRequest,
  HealthResponse,
  SseChunkEvent,
  SseDoneEvent,
  SseErrorEvent,
  SseUsage,
} from './contracts/sse';

export {
  CHAT_ERROR_CODES,
  SSE_DEFAULT_HEARTBEAT_MS,
  SSE_SUPPORTS_RESUMPTION,
} from './contracts/sse';

export {
  ChatError,
  type ChatAdapter,
  type ChatAdapterOptions,
  type ChatChunk,
  type ChatResponse,
  type ChatUsage,
  type GeminiAdapterConfig,
  type Message,
  type MessageRole,
} from './chat';

export {
  GeminiChatAdapter,
  classifyGeminiError,
  formatGeminiContents,
  resolveSystemInstruction,
  sanitizeGeminiApiKey,
} from './adapters/GeminiChatAdapter';

export {
  MockChatAdapter,
  type MockChatAdapterOptions,
} from './adapters/MockChatAdapter';
