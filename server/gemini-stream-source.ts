import {
  GeminiChatAdapter,
  type Message,
} from '@core/index';
import type { ChatStreamSource } from './chat-stream';

export interface GeminiServerEnvironment {
  GEMINI_API_KEY?: string;
}

/**
 * 使用服务端环境变量创建 Gemini 流源。
 * API Key 只进入服务端 Adapter，不进入请求或 SSE 响应。
 */
export function createGeminiStreamSourceFromEnv(
  environment: GeminiServerEnvironment,
): ChatStreamSource {
  const adapter = new GeminiChatAdapter({
    apiKey: environment.GEMINI_API_KEY ?? '',
  });

  return async function* geminiStreamSource(request, { signal }) {
    const messages: Message[] = request.messages.map((message, index) => ({
      id: `request-${index}`,
      role: message.role,
      content: message.content,
      createdAt: 0,
    }));

    for await (const chunk of adapter.stream(messages, { signal })) {
      if (chunk.done) {
        yield {
          event: 'done',
          data: {
            content: chunk.accumulated,
            usage: chunk.usage,
          },
        };
        return;
      }

      yield {
        event: 'chunk',
        data: {
          delta: chunk.delta,
          accumulated: chunk.accumulated,
        },
      };
    }
  };
}
