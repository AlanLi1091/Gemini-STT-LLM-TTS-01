import { existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import express, { Express, Request, Response } from 'express';
import { CORE_VERSION, type HealthResponse } from '@core/index';
import { createCorsMiddleware } from './cors';
import { createChatStreamHandler, type ChatStreamSource } from './chat-stream';
import { SessionService } from './session-service';
import { SessionNotFoundError, SessionRequestConflictError } from './storage/session-storage';

export interface AppOptions {
  staticDirectory?: string;
  allowedOrigins?: readonly string[];
  chatStreamSource?: ChatStreamSource;
  chatStreamHeartbeatIntervalMs?: number;
  sessionService?: SessionService;
}

/** Private deployment: only SSH-forwardable loopback listeners are accepted. */
export function readServerConfig(env: NodeJS.ProcessEnv) {
  const host = env.HOST?.trim() || '127.0.0.1';
  const port = env.PORT === undefined ? 3001 : Number(env.PORT);
  if (!['127.0.0.1', '::1'].includes(host)) throw new Error('HOST must be a loopback address.');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid server PORT.');
  const dataDirectory = resolve(env.SESSION_DATA_DIR?.trim() || 'data');
  const staticDirectory = env.STATIC_DIRECTORY?.trim() ? resolve(env.STATIC_DIRECTORY.trim()) : undefined;
  if (staticDirectory && !existsSync(resolve(staticDirectory, 'index.html'))) {
    throw new Error('Build the Playground before setting STATIC_DIRECTORY.');
  }
  return { host, port, dataDirectory, staticDirectory };
}

function sendSessionError(error: unknown, res: Response): void {
  if (error instanceof SessionRequestConflictError) {
    res.status(409).json({ error: { code: 'REQUEST_CONFLICT', message: error.message } });
    return;
  }
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
  if (!options.staticDirectory) app.get('/', (_req: Request, res: Response) => {
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

  const requireLocalDiscordRequest = (req: Request, res: Response): boolean => {
    const address = req.socket.remoteAddress;
    if (req.get('Origin') || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address ?? '')) {
      res.status(403).json({ error: 'Discord session resolution is local only.' });
      return false;
    }
    return true;
  };

  app.post('/api/discord/sessions/resolve', async (req: Request, res: Response) => {
    if (!requireLocalDiscordRequest(req, res)) return;
    if (!options.sessionService) {
      res.status(503).json({ error: 'Chat session storage is not configured.' });
      return;
    }
    const { guildId, channelId } = req.body ?? {};
    if (typeof guildId !== 'string' || typeof channelId !== 'string') {
      res.status(400).json({ error: 'Invalid Discord channel.' }); return;
    }
    try {
      const session = await options.sessionService.resolveDiscordSession(guildId, channelId);
      res.json({ sessionId: session.id });
    } catch (error) { sendSessionError(error, res); }
  });

  app.post('/api/discord/sessions/reset', async (req: Request, res: Response) => {
    if (!requireLocalDiscordRequest(req, res)) return;
    if (!options.sessionService) {
      res.status(503).json({ error: 'Chat session storage is not configured.' }); return;
    }
    const { guildId, channelId, sessionId } = req.body ?? {};
    const snowflake = (value: unknown) => typeof value === 'string' && /^\d{17,20}$/.test(value);
    if (!snowflake(guildId) || !snowflake(channelId) || typeof sessionId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
      res.status(400).json({ error: 'Invalid Discord reset request.' }); return;
    }
    try { res.json(await options.sessionService.resetDiscordSession({ guildId, channelId, sessionId })); }
    catch (error) { sendSessionError(error, res); }
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

  if (options.staticDirectory) {
    const directory = resolve(options.staticDirectory);
    // API misses never return HTML. Deploy only dist/web, not server / Bot bundles.
    app.use('/api', (_req, res) => { res.status(404).json({ error: 'API route not found.' }); });
    app.use((req, res, next) => {
      let path: string;
      try { path = decodeURIComponent(req.path); } catch { res.sendStatus(400); return; }
      if (path.split('/').some(part => part.startsWith('.'))) { res.sendStatus(404); return; }
      next();
    });
    app.use(express.static(directory, { dotfiles: 'deny', index: 'index.html', redirect: false }));
    app.get('*', (req, res, next) => {
      if (extname(req.path) || !req.accepts('html')) { next(); return; }
      res.sendFile(resolve(directory, 'index.html'));
    });
  }
  return app;
}
