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

export type ConnectionMode = 'server';

export interface AppSettings {
  connectionMode: ConnectionMode;
}

export const AVAILABLE_GEMINI_MODELS = [
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (推荐 & 最快)' },
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash (稳定轻量)' },
  { id: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro (深度推理)' },
] as const;

export const DEFAULT_SETTINGS: Readonly<AppSettings> = Object.freeze({
  connectionMode: 'server',
});
