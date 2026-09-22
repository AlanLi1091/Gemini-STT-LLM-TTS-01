import type { Message } from '@core/index';

/** A persisted, append-only conversation log (ADR-005). */
export interface Session {
  id: string;
  createdAt: number;
  messages: Message[];
  /** Soft-delete marker. Archived logs remain readable but cannot accept turns. */
  archivedAt?: number;
}

/**
 * Storage boundary for conversations. Implementations must never mutate or
 * replace a previously persisted message; they may only append a new one.
 */
export interface SessionStorage {
  createSession(): Promise<Session>;
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
