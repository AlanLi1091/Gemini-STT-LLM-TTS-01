import type { Message } from '@core/index';

export const RECENT_SESSION_STORAGE_KEY = 'recent_chat_session_id_v1';

export interface PersistedSession {
  id: string;
  createdAt: number;
  messages: Message[];
  archivedAt?: number;
}

export class SessionApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'SessionApiError';
  }
}

function isPersistedSession(value: unknown): value is PersistedSession {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PersistedSession>;
  return (
    typeof candidate.id === 'string' &&
    Number.isFinite(candidate.createdAt) &&
    Array.isArray(candidate.messages) &&
    (candidate.archivedAt === undefined || Number.isFinite(candidate.archivedAt))
  );
}

async function readSessionResponse(response: Response): Promise<PersistedSession> {
  if (!response.ok) {
    throw new SessionApiError(`Chat session request failed (${response.status}).`, response.status);
  }
  const body: unknown = await response.json();
  if (!isPersistedSession(body)) {
    throw new SessionApiError('Chat session service returned an invalid response.');
  }
  return body;
}

export function loadRecentSessionId(storage: Storage = window.localStorage): string | undefined {
  try {
    const sessionId = storage.getItem(RECENT_SESSION_STORAGE_KEY)?.trim();
    return sessionId || undefined;
  } catch {
    return undefined;
  }
}

export function saveRecentSessionId(sessionId: string, storage: Storage = window.localStorage): void {
  try {
    storage.setItem(RECENT_SESSION_STORAGE_KEY, sessionId);
  } catch {
    // Storage failures should not prevent an active in-memory conversation.
  }
}

export function clearRecentSessionId(storage: Storage = window.localStorage): void {
  try {
    storage.removeItem(RECENT_SESSION_STORAGE_KEY);
  } catch {
    // Storage failures should not prevent session archival.
  }
}

export async function createSession(): Promise<PersistedSession> {
  return readSessionResponse(
    await fetch('/api/sessions', { method: 'POST', headers: { Accept: 'application/json' } }),
  );
}

export async function getSession(sessionId: string): Promise<PersistedSession> {
  return readSessionResponse(
    await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Accept: 'application/json' },
    }),
  );
}

export async function archiveSession(sessionId: string): Promise<PersistedSession> {
  return readSessionResponse(
    await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/archive`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    }),
  );
}
