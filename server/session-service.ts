import { randomUUID } from 'node:crypto';
import type { ChatUsage, Message, ResetDiscordSessionRequest, ResetDiscordSessionResponse } from '@core/index';
import {
  type Session,
  SessionNotFoundError,
  type SessionStorage,
  SessionRequestConflictError,
} from './storage/session-storage';

export class SessionArchivedError extends Error {
  constructor(sessionId: string) {
    super(`Session is archived: ${sessionId}`);
    this.name = 'SessionArchivedError';
  }
}

/** Application service for session lifecycle and append-only chat turns. */
export class SessionService {
  private readonly activeSessions = new Set<string>();
  constructor(private readonly storage: SessionStorage) {}

  /** Covers every session generation, including legacy Web and Bot requests. */
  tryAcquireRequest(sessionId: string): (() => void) | undefined {
    if (this.activeSessions.has(sessionId)) return undefined;
    this.activeSessions.add(sessionId);
    return () => { this.activeSessions.delete(sessionId); };
  }

  async inspectRequest(sessionId: string, content: string, requestId?: string): Promise<{
    session: Session; inputExists: boolean; response?: Message;
  }> {
    const session = await this.requireActiveSession(sessionId);
    if (!requestId) return { session, inputExists: false };
    const input = session.messages.find(message => message.role === 'user' && message.requestId === requestId);
    if (!input) return { session, inputExists: false };
    if (input.content !== content) throw new SessionRequestConflictError();
    // A completed reply is replayable even after later conversation turns.
    const response = session.messages.find(message => message.role === 'assistant' && message.requestId === requestId);
    if (response) return { session, inputExists: true, response };
    if (session.messages.at(-1)?.id !== input.id) throw new SessionRequestConflictError();
    return { session, inputExists: true };
  }

  createSession(): Promise<Session> {
    return this.storage.createSession();
  }

  resolveDiscordSession(guildId: string, channelId: string): Promise<Session> {
    return this.storage.resolveDiscordSession(guildId, channelId);
  }

  getSession(sessionId: string): Promise<Session | undefined> {
    return this.storage.getSession(sessionId);
  }

  async archiveSession(sessionId: string): Promise<Session> {
    const release = this.tryAcquireRequest(sessionId);
    if (!release) throw new SessionRequestConflictError();
    try { return await this.storage.archiveSession(sessionId); }
    finally { release(); }
  }

  async resetDiscordSession(request: ResetDiscordSessionRequest): Promise<ResetDiscordSessionResponse> {
    const { sessionId, guildId, channelId } = request;
    const release = this.tryAcquireRequest(sessionId);
    if (!release) throw new SessionRequestConflictError();
    try {
      const target = await this.storage.getSession(sessionId);
      if (!target) throw new SessionNotFoundError(sessionId);
      if (target.origin?.type !== 'discord' || target.origin.guildId !== guildId || target.origin.channelId !== channelId) {
        throw new TypeError('Invalid Discord reset target');
      }
      // archiveSession is idempotent; do not acquire the same lock twice.
      await this.storage.archiveSession(sessionId);
      const next = await this.storage.resolveDiscordSession(guildId, channelId);
      return { archivedSessionId: sessionId, sessionId: next.id };
    } finally { release(); }
  }

  async appendTurnInputs(
    sessionId: string,
    inputs: ReadonlyArray<{ role: Message['role']; content: string }>,
    requestId?: string,
  ): Promise<Session> {
    let session = await this.requireActiveSession(sessionId);
    for (const input of inputs) {
      session = await this.storage.appendMessage(sessionId, {
        id: requestId ?? randomUUID(),
        role: input.role,
        content: input.content,
        createdAt: Date.now(),
        ...(requestId ? { requestId } : {}),
      });
    }
    return session;
  }

  async appendAssistantResponse(
    sessionId: string,
    content: string,
    usage?: ChatUsage,
    requestId?: string,
  ): Promise<Session> {
    await this.requireActiveSession(sessionId);
    return this.storage.appendMessage(sessionId, {
      id: randomUUID(),
      role: 'assistant',
      content,
      createdAt: Date.now(),
      ...(usage ? { usage } : {}),
      ...(requestId ? { requestId } : {}),
    });
  }

  private async requireActiveSession(sessionId: string): Promise<Session> {
    const session = await this.storage.getSession(sessionId);
    if (!session) throw new SessionNotFoundError(sessionId);
    if (session.archivedAt !== undefined) throw new SessionArchivedError(sessionId);
    return session;
  }
}
