import type { Message } from '@core/index';
import type { SessionOrigin } from '@core/index';

/** A persisted, append-only conversation log (ADR-005). */
export interface Session {
  id: string;
  createdAt: number;
  messages: Message[];
  /** Soft-delete marker. Archived logs remain readable but cannot accept turns. */
  archivedAt?: number;
  /** Missing on legacy files, which are treated as Web sessions. */
  origin?: SessionOrigin;
}

/**
 * Storage boundary for conversations. Implementations must never mutate or
 * replace a previously persisted message; they may only append a new one.
 * ADR-012 request-tagged writes must atomically reject a duplicate role for
 * the same requestId; a tagged reply must follow its corresponding input.
 */
export interface SessionStorage {
  createSession(origin?: SessionOrigin): Promise<Session>;
  resolveDiscordSession(guildId: string, channelId: string): Promise<Session>;
  getSession(sessionId: string): Promise<Session | undefined>;
  appendMessage(sessionId: string, message: Message): Promise<Session>;
  archiveSession(sessionId: string): Promise<Session>;
}

export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`);
    this.name = 'SessionNotFoundError';
  }
}

export class DuplicateMessageIdError extends Error {
  constructor(messageId: string) {
    super(`Message already exists in this session: ${messageId}`);
    this.name = 'DuplicateMessageIdError';
  }
}

/** A request identity cannot be reused for another input or completed reply. */
export class SessionRequestConflictError extends Error {
  constructor() {
    super('会话请求正在处理或已发生变化，请稍后重试或刷新会话。');
    this.name = 'SessionRequestConflictError';
  }
}
