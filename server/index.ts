import dotenv from 'dotenv';
import { createApp } from './app';
import { parseAllowedOrigins } from './cors';
import { createChatStreamSourceFromEnv } from './chat-adapter-stream-source';

dotenv.config();

const PORT = Number(process.env.PORT) || 3001;
const app = createApp({
  allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
  chatStreamSource: createChatStreamSourceFromEnv(process.env),
});

app.listen(PORT, () => {
  console.log(`Gemini Chat Server running on http://localhost:${PORT}`);
});
