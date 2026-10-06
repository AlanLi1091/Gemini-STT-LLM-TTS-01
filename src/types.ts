export {
  ChatError,
  type ChatAdapter,
  type ChatAdapterOptions,
  type ChatChunk,
  type ChatErrorCode,
  type ChatResponse,
  type ChatUsage,
  type GeminiAdapterConfig,
  type Message,
  type MessageRole,
} from '@core/chat';

export interface AppSettings {
  connectionMode: 'server';
}

export const DEFAULT_SETTINGS: Readonly<AppSettings> = Object.freeze({
  connectionMode: 'server',
});
