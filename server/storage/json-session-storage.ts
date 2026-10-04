import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Message, SessionOrigin } from '@core/index';
import {
  DuplicateMessageIdError,
  type Session,
  SessionNotFoundError,
  type SessionStorage,
} from './session-storage';

const SESSION_FILE_SUFFIX = '.json';

function cloneSession(session: Session): Session {
  return {
    ...session,
    ...(session.origin ? { origin: { ...session.origin } } : {}),
    messages: session.messages.map((message) => ({
      ...message,
      ...(message.usage ? { usage: { ...message.usage } } : {}),
    })),
  };
}

function isSafeSessionId(sessionId: string): boolean {
  return /^[a-zA-Z0-9-]+$/.test(sessionId);
}

function isValidMessage(message: Message): boolean {
  return (
    typeof message.id === 'string' &&
    message.id.trim().length > 0 &&
    (message.role === 'user' || message.role === 'assistant' || message.role === 'system') &&
    typeof message.content === 'string' &&
    Number.isFinite(message.createdAt)
  );
}

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<Session>;
  return (
    typeof candidate.id === 'string' &&
    Number.isFinite(candidate.createdAt) &&
    (candidate.origin === undefined || isOrigin(candidate.origin)) &&
    (candidate.archivedAt === undefined || Number.isFinite(candidate.archivedAt)) &&
    Array.isArray(candidate.messages) &&
    candidate.messages.every(isValidMessage) &&
    new Set(candidate.messages.map((message) => message.id)).size === candidate.messages.length
  );
}

function isOrigin(value: unknown): value is SessionOrigin {
  if (!value || typeof value !== 'object') return false;
  const origin = value as Partial<{ type: string; guildId: string; channelId: string }>;
  return origin.type === 'web' || (origin.type === 'discord' &&
    /^\d{17,20}$/.test(origin.guildId ?? '') && /^\d{17,20}$/.test(origin.channelId ?? ''));
}

/**
 * JSON-backed implementation for local deployments. Each session is isolated
 * in one file, while per-session writes are serialized to preserve log order.
 */
export class JsonSessionStorage implements SessionStorage {
  private readonly pendingWrites = new Map<string, Promise<void>>();

  constructor(private readonly dataDirectory = 'data') {}

  async createSession(origin: SessionOrigin = { type: 'web' }): Promise<Session> {
    if (!isOrigin(origin)) throw new TypeError('Invalid session origin');
    await mkdir(this.dataDirectory, { recursive: true });

    const session: Session = {
      id: randomUUID(),
      createdAt: Date.now(),
      messages: [],
      origin: { ...origin },
    };
    await this.writeSession(session);
    return cloneSession(session);
  }

  async resolveDiscordSession(guildId: string, channelId: string): Promise<Session> {
    const origin: SessionOrigin = { type: 'discord', guildId, channelId };
    if (!isOrigin(origin)) throw new TypeError('Invalid Discord channel');
    // One writer instance in Express. Serialize the binding read/create/write transaction.
    return this.serializeWrite('discord-bindings', async () => {
      const path = join(this.dataDirectory, 'discord-bindings.json');
      let bindings: Record<string, string> = {};
      try {
        const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
            !Object.entries(parsed).every(([key, id]) => /^\d{17,20}:\d{17,20}$/.test(key) &&
              typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id))) {
          throw new TypeError('Invalid Discord bindings');
        }
        bindings = parsed as Record<string, string>;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      const key = `${guildId}:${channelId}`;
      if (bindings[key]) {
        const existing = await this.getSession(bindings[key]);
        if (!existing) throw new SessionNotFoundError(bindings[key]);
        if (existing.origin?.type !== 'discord' || existing.origin.guildId !== guildId || existing.origin.channelId !== channelId) {
          throw new TypeError('Discord binding origin mismatch');
        }
        if (existing.archivedAt === undefined) return existing;
      }
      const session = await this.createSession(origin);
      bindings[key] = session.id;
      const temporary = `${path}.${randomUUID()}.tmp`;
      await writeFile(temporary, `${JSON.stringify(bindings, null, 2)}\n`, 'utf8');
      await rename(temporary, path);
      return session;
    });
  }

  async getSession(sessionId: string): Promise<Session | undefined> {
    this.assertSafeSessionId(sessionId);
    return this.readSession(sessionId);
  }

  async appendMessage(sessionId: string, message: Message): Promise<Session> {
    this.assertSafeSessionId(sessionId);
    if (!isValidMessage(message)) {
      throw new TypeError('Invalid message for session storage');
    }

    return this.serializeWrite(sessionId, async () => {
      const session = await this.readSession(sessionId);
      if (!session) throw new SessionNotFoundError(sessionId);
      if (session.messages.some((storedMessage) => storedMessage.id === message.id)) {
        throw new DuplicateMessageIdError(message.id);
      }

      const nextSession: Session = {
        ...session,
        messages: [...session.messages, { ...message, ...(message.usage ? { usage: { ...message.usage } } : {}) }],
      };
      await this.writeSession(nextSession);
      return cloneSession(nextSession);
    });
  }

  async archiveSession(sessionId: string): Promise<Session> {
    this.assertSafeSessionId(sessionId);

    return this.serializeWrite(sessionId, async () => {
      const session = await this.readSession(sessionId);
      if (!session) throw new SessionNotFoundError(sessionId);
      if (session.archivedAt !== undefined) return cloneSession(session);

      const archivedSession: Session = { ...session, archivedAt: Date.now() };
      await this.writeSession(archivedSession);
      return cloneSession(archivedSession);
    });
  }

  private async serializeWrite<T>(sessionId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.pendingWrites.get(sessionId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queue = previous.then(() => current);
    this.pendingWrites.set(sessionId, queue);

    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.pendingWrites.get(sessionId) === queue) this.pendingWrites.delete(sessionId);
    }
  }

  private sessionFilePath(sessionId: string): string {
    return join(this.dataDirectory, `${sessionId}${SESSION_FILE_SUFFIX}`);
  }

  private async readSession(sessionId: string): Promise<Session | undefined> {
    try {
      const raw = await readFile(this.sessionFilePath(sessionId), 'utf8');
      const parsed: unknown = JSON.parse(raw);
      if (!isSession(parsed) || parsed.id !== sessionId) {
        throw new TypeError(`Invalid persisted session: ${sessionId}`);
      }
      return cloneSession(parsed);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    }
  }

  private async writeSession(session: Session): Promise<void> {
    const filePath = this.sessionFilePath(session.id);
    await mkdir(dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(session, null, 2)}\n`, 'utf8');
    await rename(temporaryPath, filePath);
  }

  private assertSafeSessionId(sessionId: string): void {
    if (!isSafeSessionId(sessionId)) {
      throw new TypeError('Invalid session id');
    }
  }
}
