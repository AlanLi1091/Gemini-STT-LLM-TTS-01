import express, { Express, Request, Response } from 'express';
import { CORE_VERSION, type HealthResponse } from '@core/index';
import { createCorsMiddleware } from './cors';
import { createChatStreamHandler, type ChatStreamSource } from './chat-stream';
import { SessionService } from './session-service';
import { SessionNotFoundError } from './storage/session-storage';

export interface AppOptions {
  allowedOrigins?: readonly string[];
  chatStreamSource?: ChatStreamSource;
  chatStreamHeartbeatIntervalMs?: number;
  sessionService?: SessionService;
}

function sendSessionError(error: unknown, res: Response): void {
  if (error instanceof SessionNotFoundError) {
    res.status(404).json({ error: 'Chat session was not found.' });
    return;
  }
  if (error instanceof TypeError) {
    res.status(400).json({ error: 'Invalid chat session id.' });
    return;
  }
  res.status(500).json({ error: 'Chat session operation failed.' });
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

  app.post('/api/sessions', async (_req: Request, res: Response) => {
    if (!options.sessionService) {
      res.status(503).json({ error: 'Chat session storage is not configured.' });
      return;
    }
    try {
      res.status(201).json(await options.sessionService.createSession());
    } catch (error) {
      sendSessionError(error, res);
    }
  });

  app.get('/api/sessions/:sessionId', async (req: Request, res: Response) => {
    if (!options.sessionService) {
      res.status(503).json({ error: 'Chat session storage is not configured.' });
      return;
    }
    try {
      const session = await options.sessionService.getSession(req.params.sessionId);
      if (!session) {
        res.status(404).json({ error: 'Chat session was not found.' });
        return;
      }
      res.json(session);
    } catch (error) {
      sendSessionError(error, res);
    }
  });

  app.post('/api/sessions/:sessionId/archive', async (req: Request, res: Response) => {
    if (!options.sessionService) {
      res.status(503).json({ error: 'Chat session storage is not configured.' });
      return;
    }
    try {
      res.json(await options.sessionService.archiveSession(req.params.sessionId));
    } catch (error) {
      sendSessionError(error, res);
    }
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
