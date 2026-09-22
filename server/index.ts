import dotenv from 'dotenv';
import { createApp } from './app';
import { parseAllowedOrigins } from './cors';
import { createChatStreamSourceFromEnv } from './chat-adapter-stream-source';
import { SessionService } from './session-service';
import { JsonSessionStorage } from './storage/json-session-storage';

dotenv.config();

const PORT = Number(process.env.PORT) || 3001;
const sessionStorage = new JsonSessionStorage();
const app = createApp({
  allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
  sessionService: new SessionService(sessionStorage),
  chatStreamSource: createChatStreamSourceFromEnv(process.env, { sessionStorage }),
});

app.listen(PORT, () => {
  console.log(`Gemini Chat Server running on http://localhost:${PORT}`);
});
