import { randomUUID } from 'node:crypto';
import type { ChatUsage, Message } from '@core/index';
import {
  type Session,
  SessionNotFoundError,
  type SessionStorage,
} from './storage/session-storage';

export class SessionArchivedError extends Error {
  constructor(sessionId: string) {
    super(`Session is archived: ${sessionId}`);
    this.name = 'SessionArchivedError';
  }
}

/** Application service for session lifecycle and append-only chat turns. */
export class SessionService {
  constructor(private readonly storage: SessionStorage) {}

  createSession(): Promise<Session> {
    return this.storage.createSession();
  }

  getSession(sessionId: string): Promise<Session | undefined> {
    return this.storage.getSession(sessionId);
  }

  archiveSession(sessionId: string): Promise<Session> {
    return this.storage.archiveSession(sessionId);
  }

  async appendTurnInputs(
    sessionId: string,
    inputs: ReadonlyArray<{ role: Message['role']; content: string }>,
  ): Promise<Session> {
    let session = await this.requireActiveSession(sessionId);
    for (const input of inputs) {
      session = await this.storage.appendMessage(sessionId, {
        id: randomUUID(),
        role: input.role,
        content: input.content,
        createdAt: Date.now(),
      });
    }
    return session;
  }

  async appendAssistantResponse(
    sessionId: string,
    content: string,
    usage?: ChatUsage,
  ): Promise<Session> {
    await this.requireActiveSession(sessionId);
    return this.storage.appendMessage(sessionId, {
      id: randomUUID(),
      role: 'assistant',
      content,
      createdAt: Date.now(),
      ...(usage ? { usage } : {}),
    });
  }

  private async requireActiveSession(sessionId: string): Promise<Session> {
    const session = await this.storage.getSession(sessionId);
    if (!session) throw new SessionNotFoundError(sessionId);
    if (session.archivedAt !== undefined) throw new SessionArchivedError(sessionId);
    return session;
  }
}
