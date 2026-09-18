import {
  ChatError,
  type ChatAdapter,
  type ChatAdapterOptions,
  type ChatChunk,
  type ChatResponse,
  type Message,
} from '../chat';

export interface MockChatAdapterOptions {
  delayMs?: number;
  streamChunkDelayMs?: number;
}

/** 本地 Mock 对话适配器共享实现 (ADR-001, ADR-003, ADR-007)。 */
export class MockChatAdapter implements ChatAdapter {
  readonly id = 'mock';
  readonly name = 'Mock 助手 (本地演示)';

  private readonly defaultDelayMs: number;
  private readonly streamChunkDelayMs: number;

  constructor(options: MockChatAdapterOptions = {}) {
    this.defaultDelayMs = options.delayMs ?? 800;
    this.streamChunkDelayMs = options.streamChunkDelayMs ?? 30;
  }

  generateContent(messages: Message[]): string {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
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

    if (signal?.aborted) throw new ChatError('The operation was aborted.', 'ABORTED');

    const delay = (options.delayMs as number | undefined) ?? this.defaultDelayMs;
    if (delay > 0) await waitForDelay(delay, signal);

    const content = this.generateContent(messages);
    const promptLength = messages.reduce((total, message) => total + message.content.length, 0);

    return {
      content,
      usage: {
        promptTokens: promptLength,
        completionTokens: content.length,
        totalTokens: promptLength + content.length,
      },
    };
  }

  async *stream(
    messages: Message[],
    options: ChatAdapterOptions = {},
  ): AsyncIterable<ChatChunk> {
    const { signal } = options;

    if (signal?.aborted) throw new ChatError('The operation was aborted.', 'ABORTED');

    const initialDelay =
      (options.delayMs as number | undefined) ?? (this.defaultDelayMs > 0 ? 100 : 0);
    if (initialDelay > 0) await waitForDelay(initialDelay, signal);

    const fullContent = this.generateContent(messages);
    const promptLength = messages.reduce((total, message) => total + message.content.length, 0);
    const chunks: string[] = [];
    for (let index = 0; index < fullContent.length; index += 3) {
      chunks.push(fullContent.slice(index, index + 3));
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
    const chunkDelay =
      (options.streamChunkDelayMs as number | undefined) ?? this.streamChunkDelayMs;

    for (let index = 0; index < chunks.length; index += 1) {
      if (signal?.aborted) throw new ChatError('The operation was aborted.', 'ABORTED');

      const delta = chunks[index];
      accumulated += delta;
      const isLast = index === chunks.length - 1;

      if (chunkDelay > 0) await waitForDelay(chunkDelay, signal);

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

function waitForDelay(delayMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new ChatError('The operation was aborted.', 'ABORTED'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
