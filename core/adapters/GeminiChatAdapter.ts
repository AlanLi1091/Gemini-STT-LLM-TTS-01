import { GoogleGenAI } from '@google/genai';
import {
  ChatError,
  type ChatAdapter,
  type ChatAdapterOptions,
  type ChatChunk,
  type ChatResponse,
  type ChatUsage,
  type GeminiAdapterConfig,
  type Message,
} from '../chat';

/** 转换领域消息格式至 Gemini SDK 请求格式。 */
export function formatGeminiContents(messages: Message[]) {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      role: message.role === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: message.content }],
    }));
}

/** 提取并合并配置与消息历史中的系统指令。 */
export function resolveSystemInstruction(
  messages: Message[],
  configuredInstruction?: string,
): string | undefined {
  const systemMessages = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content.trim())
    .filter(Boolean);

  const parts: string[] = [];
  if (configuredInstruction?.trim()) parts.push(configuredInstruction.trim());
  parts.push(...systemMessages);

  return parts.length > 0 ? parts.join('\n\n') : undefined;
}

/** 结构化分类并映射 Gemini 异常为共享 ChatError。 */
export function classifyGeminiError(error: unknown, signal?: AbortSignal): ChatError {
  if (error instanceof ChatError) return error;

  const errObj = error as {
    status?: number;
    statusCode?: number;
    code?: string | number;
    message?: string;
    name?: string;
  };

  if (
    signal?.aborted ||
    errObj.name === 'AbortError' ||
    errObj.message?.toLowerCase().includes('aborted')
  ) {
    return new ChatError('Request was aborted by user.', 'ABORTED', {
      originalError: error,
    });
  }

  const status = errObj.status || errObj.statusCode;
  const message = errObj.message || String(error);
  const lowerMessage = message.toLowerCase();

  if (
    status === 401 ||
    status === 403 ||
    lowerMessage.includes('permission_denied') ||
    lowerMessage.includes('permission denied') ||
    lowerMessage.includes('api_key_invalid') ||
    lowerMessage.includes('api key not valid') ||
    lowerMessage.includes('unauthenticated') ||
    lowerMessage.includes('invalid api key') ||
    lowerMessage.includes('iso-8859-1')
  ) {
    const hint = lowerMessage.includes('iso-8859-1')
      ? 'API Key 中包含不可见的非法字符，请重新复制粘贴。'
      : message;
    return new ChatError(hint, 'AUTH_ERROR', {
      status: status || 403,
      originalError: error,
    });
  }

  if (
    status === 429 ||
    lowerMessage.includes('resource_exhausted') ||
    lowerMessage.includes('quota') ||
    lowerMessage.includes('rate limit')
  ) {
    return new ChatError(message, 'RATE_LIMIT', { status, originalError: error });
  }

  if (
    error instanceof TypeError ||
    errObj.code === 'ENOTFOUND' ||
    errObj.code === 'ECONNREFUSED' ||
    lowerMessage.includes('failed to fetch') ||
    lowerMessage.includes('network error') ||
    lowerMessage.includes('networkerror')
  ) {
    return new ChatError(message, 'NETWORK_ERROR', { status, originalError: error });
  }

  if (
    (status && status >= 500) ||
    lowerMessage.includes('safety') ||
    lowerMessage.includes('blocked') ||
    lowerMessage.includes('recitation') ||
    lowerMessage.includes('overloaded')
  ) {
    return new ChatError(message, 'MODEL_ERROR', { status, originalError: error });
  }

  return new ChatError(message, 'UNKNOWN', { status, originalError: error });
}

/** Gemini 对话适配器共享实现 (ADR-003, ADR-006, ADR-007)。 */
export class GeminiChatAdapter implements ChatAdapter {
  readonly id: string;
  readonly name: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly systemInstruction?: string;

  constructor(config: GeminiAdapterConfig) {
    this.apiKey = (config.apiKey || '').trim().replace(/[^\x20-\x7E]/g, '');
    this.model = config.model?.trim() || 'gemini-3.8-flash';
    this.systemInstruction = config.systemInstruction;
    this.id = `gemini-${this.model}`;
    this.name = `Gemini (${this.model})`;
  }

  async send(messages: Message[], options: ChatAdapterOptions = {}): Promise<ChatResponse> {
    const { signal, temperature, maxTokens } = options;

    if (signal?.aborted) throw new ChatError('The operation was aborted.', 'ABORTED');

    const key = this.apiKey.trim();
    if (!key) {
      throw new ChatError(
        'Gemini API key is required. Please configure your API key.',
        'AUTH_ERROR',
      );
    }

    const contents = formatGeminiContents(messages);
    if (contents.length === 0) return { content: '' };

    const systemInstruction = resolveSystemInstruction(messages, this.systemInstruction);

    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: this.model,
        contents,
        config: {
          systemInstruction,
          temperature,
          maxOutputTokens: maxTokens,
          abortSignal: signal,
        },
      });

      const content = response.text || '';
      let usage: ChatUsage | undefined;
      if (response.usageMetadata) {
        usage = {
          promptTokens: response.usageMetadata.promptTokenCount,
          completionTokens: response.usageMetadata.candidatesTokenCount,
          totalTokens: response.usageMetadata.totalTokenCount,
        };
      }

      return { content, usage };
    } catch (error) {
      throw classifyGeminiError(error, signal);
    }
  }

  async *stream(
    messages: Message[],
    options: ChatAdapterOptions = {},
  ): AsyncIterable<ChatChunk> {
    const { signal, temperature, maxTokens } = options;

    if (signal?.aborted) throw new ChatError('The operation was aborted.', 'ABORTED');

    const key = this.apiKey.trim();
    if (!key) {
      throw new ChatError(
        'Gemini API key is required. Please configure your API key.',
        'AUTH_ERROR',
      );
    }

    const contents = formatGeminiContents(messages);
    if (contents.length === 0) {
      yield { delta: '', accumulated: '', done: true };
      return;
    }

    const systemInstruction = resolveSystemInstruction(messages, this.systemInstruction);

    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const streamResponse = await ai.models.generateContentStream({
        model: this.model,
        contents,
        config: {
          systemInstruction,
          temperature,
          maxOutputTokens: maxTokens,
          abortSignal: signal,
        },
      });

      let accumulated = '';
      let latestUsage: ChatUsage | undefined;

      for await (const chunk of streamResponse) {
        if (signal?.aborted) throw new ChatError('The operation was aborted.', 'ABORTED');

        if (chunk.usageMetadata) {
          latestUsage = {
            promptTokens: chunk.usageMetadata.promptTokenCount,
            completionTokens: chunk.usageMetadata.candidatesTokenCount,
            totalTokens: chunk.usageMetadata.totalTokenCount,
          };
        }

        const delta = chunk.text || '';
        if (delta) {
          accumulated += delta;
          yield { delta, accumulated, done: false };
        }
      }

      if (signal?.aborted) throw new ChatError('The operation was aborted.', 'ABORTED');

      yield {
        delta: '',
        accumulated,
        done: true,
        usage: latestUsage,
      };
    } catch (error) {
      throw classifyGeminiError(error, signal);
    }
  }
}
