import dotenv from 'dotenv';
import { createApp, readServerConfig } from './app';
import { parseAllowedOrigins } from './cors';
import { createChatStreamSourceFromEnv } from './chat-adapter-stream-source';
import { SessionService } from './session-service';
import { JsonSessionStorage } from './storage/json-session-storage';

dotenv.config();

const config = readServerConfig(process.env);
const sessionStorage = new JsonSessionStorage(config.dataDirectory);
const app = createApp({
  staticDirectory: config.staticDirectory,
  allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
  sessionService: new SessionService(sessionStorage),
  chatStreamSource: createChatStreamSourceFromEnv(process.env, { sessionStorage }),
});

const server = app.listen(config.port, config.host, () => {
  console.log(`[server] listening host=${config.host} port=${config.port}`);
});
server.on('error', () => { console.error('[server] startup failed'); process.exitCode = 1; });
let stopping = false;
const shutdown = () => {
  if (stopping) return;
  stopping = true;
  console.log('[server] stopping');
  // Drain active requests; forcibly close remaining SSE sockets after 15 seconds.
  const deadline = setTimeout(() => server.closeAllConnections(), 15000);
  deadline.unref();
  server.close(error => {
    clearTimeout(deadline);
    process.off('SIGINT', shutdown); process.off('SIGTERM', shutdown);
    if (error) process.exitCode = 1;
    console.log('[server] stopped');
  });
};
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
