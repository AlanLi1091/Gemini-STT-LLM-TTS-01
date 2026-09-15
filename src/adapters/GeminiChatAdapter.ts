import { GoogleGenAI } from '@google/genai';
import {
  ChatAdapter,
  ChatAdapterOptions,
  ChatChunk,
  ChatError,
  ChatErrorCode,
  ChatResponse,
  ChatUsage,
  GeminiAdapterConfig,
  Message,
} from '../types';

/**
 * 转换领域消息格式至 Gemini SDK 请求格式
 */
export function formatGeminiContents(messages: Message[]) {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: m.content }],
    }));
}

/**
 * 提取对话中的系统指令（合并 config 与历史中的 system 角色消息）
 */
export function resolveSystemInstruction(
  messages: Message[],
  configuredInstruction?: string
): string | undefined {
  const systemMessages = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content.trim())
    .filter(Boolean);

  const parts: string[] = [];
  if (configuredInstruction?.trim()) {
    parts.push(configuredInstruction.trim());
  }
  parts.push(...systemMessages);

  return parts.length > 0 ? parts.join('\n\n') : undefined;
}

/**
 * 结构化分类并映射异常为 ChatError
 */
export function classifyGeminiError(error: unknown, signal?: AbortSignal): ChatError {
  if (error instanceof ChatError) {
    return error;
  }

  if (
    signal?.aborted ||
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error as Error)?.name === 'AbortError' ||
    (error as Error)?.message?.toLowerCase().includes('aborted')
  ) {
    return new ChatError('Request was aborted by user.', 'ABORTED', {
      originalError: error,
    });
  }

  const errObj = error as {
    status?: number;
    statusCode?: number;
    code?: string | number;
    message?: string;
  };
  const status = errObj.status || errObj.statusCode;
  const message = errObj.message || String(error);
  const lowerMsg = message.toLowerCase();

  // 1. 鉴权与 API Key 错误（含 PERMISSION_DENIED 与 Headers 非法字符）
  if (
    status === 401 ||
    status === 403 ||
    lowerMsg.includes('permission_denied') ||
    lowerMsg.includes('permission denied') ||
    lowerMsg.includes('api_key_invalid') ||
    lowerMsg.includes('api key not valid') ||
    lowerMsg.includes('unauthenticated') ||
    lowerMsg.includes('invalid api key') ||
    lowerMsg.includes('iso-8859-1')
  ) {
    const hint = lowerMsg.includes('iso-8859-1')
      ? 'API Key 中包含不可见的非法字符，请重新复制粘贴。'
      : message;
    return new ChatError(hint, 'AUTH_ERROR', { status: status || 403, originalError: error });
  }

  // 2. 限流 / 配额耗尽
  if (
    status === 429 ||
    lowerMsg.includes('resource_exhausted') ||
    lowerMsg.includes('quota') ||
    lowerMsg.includes('rate limit')
  ) {
    return new ChatError(message, 'RATE_LIMIT', { status, originalError: error });
  }

  // 3. 网络通信错误
  if (
    error instanceof TypeError ||
    errObj.code === 'ENOTFOUND' ||
    errObj.code === 'ECONNREFUSED' ||
    lowerMsg.includes('failed to fetch') ||
    lowerMsg.includes('network error') ||
    lowerMsg.includes('networkerror')
  ) {
    return new ChatError(message, 'NETWORK_ERROR', { status, originalError: error });
  }

  // 4. 服务端 / 模型安全策略拦截等模型侧错误
  if (
    (status && status >= 500) ||
    lowerMsg.includes('safety') ||
    lowerMsg.includes('blocked') ||
    lowerMsg.includes('recitation') ||
    lowerMsg.includes('overloaded')
  ) {
    return new ChatError(message, 'MODEL_ERROR', { status, originalError: error });
  }

  return new ChatError(message, 'UNKNOWN', { status, originalError: error });
}

/**
 * Gemini 对话适配器实现 (ADR-003, ADR-006, ADR-007)
 */
export class GeminiChatAdapter implements ChatAdapter {
  readonly id: string;
  readonly name: string;
  private apiKey: string;
  private model: string;
  private systemInstruction?: string;

  constructor(config: GeminiAdapterConfig) {
    this.apiKey = (config.apiKey || '').trim().replace(/[^\x20-\x7E]/g, '');
    this.model = config.model?.trim() || 'gemini-3.8-flash';
    this.systemInstruction = config.systemInstruction;
    this.id = `gemini-${this.model}`;
    this.name = `Gemini (${this.model})`;
  }

  /**
   * 发送非流式请求
   */
  async send(messages: Message[], options: ChatAdapterOptions = {}): Promise<ChatResponse> {
    const { signal, temperature, maxTokens } = options;

    if (signal?.aborted) {
      throw new ChatError('The operation was aborted.', 'ABORTED');
    }

    const key = this.apiKey.trim();
    if (!key) {
      throw new ChatError(
        'Gemini API key is required. Please configure your API key.',
        'AUTH_ERROR'
      );
    }

    const contents = formatGeminiContents(messages);
    if (contents.length === 0) {
      return { content: '' };
    }

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

      return {
        content,
        usage,
      };
    } catch (err) {
      throw classifyGeminiError(err, signal);
    }
  }

  /**
   * 流式生成接口（Task 7 为契约占位，Task 10 将完整落地打字机流式）
   */
  async *stream(messages: Message[], options: ChatAdapterOptions = {}): AsyncIterable<ChatChunk> {
    const { signal } = options;
    if (signal?.aborted) {
      throw new ChatError('The operation was aborted.', 'ABORTED');
    }
    const key = this.apiKey.trim();
    if (!key) {
      throw new ChatError(
        'Gemini API key is required. Please configure your API key.',
        'AUTH_ERROR'
      );
    }
    throw new Error('GeminiChatAdapter stream is not yet implemented (scheduled for Task 10)');
  }
}
