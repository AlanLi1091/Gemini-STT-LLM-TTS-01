import express, { Express, Request, Response } from 'express';
import { CORE_VERSION, type HealthResponse } from '@core/index';
import { createCorsMiddleware } from './cors';
import { createChatStreamHandler, type ChatStreamSource } from './chat-stream';

export interface AppOptions {
  allowedOrigins?: readonly string[];
  chatStreamSource?: ChatStreamSource;
  chatStreamHeartbeatIntervalMs?: number;
}

/**
 * 创建并配置 Express 应用程序实例
 * 分离 app 工厂与 listen 启动逻辑，方便使用 Supertest 进行无端口启动的集成与单元测试
 */
export function createApp(options: AppOptions = {}): Express {
  const app = express();

  app.use(createCorsMiddleware(options.allowedOrigins ?? []));
  app.use(express.json());

  // 基础根路由，用于服务骨架与版本探测
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'gemini-chat-server',
      coreVersion: CORE_VERSION,
    });
  });

  app.get('/api/health', (_req: Request, res: Response<HealthResponse>) => {
    res.json({
      status: 'ok',
      service: 'gemini-chat-server',
      coreVersion: CORE_VERSION,
    });
  });

  app.post(
    '/api/chat/stream',
    createChatStreamHandler({
      source: options.chatStreamSource,
      heartbeatIntervalMs: options.chatStreamHeartbeatIntervalMs,
    }),
  );

  return app;
}
