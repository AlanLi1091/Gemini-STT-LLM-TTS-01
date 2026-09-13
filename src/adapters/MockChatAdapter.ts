import { ChatAdapter, ChatAdapterOptions, ChatChunk, ChatResponse, Message } from '../types';

export interface MockChatAdapterOptions {
  delayMs?: number;
  streamChunkDelayMs?: number;
}

/**
 * 本地 Mock 对话适配器实现 (ADR-001, ADR-003, ADR-007)
 * 提供符合 ChatAdapter 契约的非流式与流式实现
 */
export class MockChatAdapter implements ChatAdapter {
  readonly id = 'mock';
  readonly name = 'Mock 助手 (本地演示)';

  private defaultDelayMs: number;
  private streamChunkDelayMs: number;

  constructor(options: MockChatAdapterOptions = {}) {
    this.defaultDelayMs = options.delayMs ?? 800;
    this.streamChunkDelayMs = options.streamChunkDelayMs ?? 30;
  }

  generateContent(messages: Message[]): string {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    const cleanInput = lastUserMessage ? lastUserMessage.content.trim() : '';

    if (/你好|hello|hi/i.test(cleanInput)) {
      return '你好！我是你的角色扮演与对话助手（Phase 1 本地 Mock 模式）。我已经收到你的问候了！';
    }

    if (/who are you|你是谁|自我介绍/i.test(cleanInput)) {
      return '我是正在开发中的角色扮演对话机器人。在当前 Phase 1 阶段，我使用纯前端 Mock 引擎为你演示思考加载与回复闭环；在 Phase 2 将无缝接入大模型。';
    }

    return `[Mock 回复] 已收到你的消息："${cleanInput}"。当前处于 Phase 1 本地 Mock 响应阶段，已完成思考延时与消息追加链路。`;
  }

  async send(messages: Message[], options: ChatAdapterOptions = {}): Promise<ChatResponse> {
    const { signal } = options;

    if (signal?.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }

    const delay = (options.delayMs as number | undefined) ?? this.defaultDelayMs;
    if (delay > 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          signal?.removeEventListener('abort', onAbort);
          resolve();
        }, delay);

        const onAbort = () => {
          clearTimeout(timer);
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        };

        if (signal) {
          signal.addEventListener('abort', onAbort, { once: true });
        }
      });
    }

    const content = this.generateContent(messages);
    const promptLength = messages.reduce((acc, m) => acc + m.content.length, 0);

    return {
      content,
      usage: {
        promptTokens: promptLength,
        completionTokens: content.length,
        totalTokens: promptLength + content.length,
      },
    };
  }

  async *stream(messages: Message[], options: ChatAdapterOptions = {}): AsyncIterable<ChatChunk> {
    const { signal } = options;

    if (signal?.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }

    const initialDelay = (options.delayMs as number | undefined) ?? (this.defaultDelayMs > 0 ? 100 : 0);
    if (initialDelay > 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          signal?.removeEventListener('abort', onAbort);
          resolve();
        }, initialDelay);

        const onAbort = () => {
          clearTimeout(timer);
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        };

        if (signal) {
          signal.addEventListener('abort', onAbort, { once: true });
        }
      });
    }

    const fullContent = this.generateContent(messages);
    const promptLength = messages.reduce((acc, m) => acc + m.content.length, 0);

    // 将文本分词为 2~3 个字符的片段模拟打字流
    const chunks: string[] = [];
    for (let i = 0; i < fullContent.length; i += 3) {
      chunks.push(fullContent.slice(i, i + 3));
    }

    if (chunks.length === 0) {
      yield {
        delta: '',
        accumulated: '',
        done: true,
        usage: {
          promptTokens: promptLength,
          completionTokens: 0,
          totalTokens: promptLength,
        },
      };
      return;
    }

    let accumulated = '';
    const chunkDelay = (options.streamChunkDelayMs as number | undefined) ?? this.streamChunkDelayMs;

    for (let i = 0; i < chunks.length; i++) {
      if (signal?.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError');
      }

      const delta = chunks[i];
      accumulated += delta;
      const isLast = i === chunks.length - 1;

      if (chunkDelay > 0) {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolve();
          }, chunkDelay);

          const onAbort = () => {
            clearTimeout(timer);
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          };

          if (signal) {
            signal.addEventListener('abort', onAbort, { once: true });
          }
        });
      }

      yield {
        delta,
        accumulated,
        done: isLast,
        usage: isLast
          ? {
              promptTokens: promptLength,
              completionTokens: fullContent.length,
              totalTokens: promptLength + fullContent.length,
            }
          : undefined,
      };
    }
  }
}
