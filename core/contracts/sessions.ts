export type SessionOrigin =
  | { type: 'web' }
  | { type: 'discord'; guildId: string; channelId: string };

export interface ResolveDiscordSessionRequest { guildId: string; channelId: string }
export interface ResolveDiscordSessionResponse { sessionId: string }

/** Reset only the explicitly resolved target, never a later replacement. */
export interface ResetDiscordSessionRequest extends ResolveDiscordSessionRequest { sessionId: string }
export interface ResetDiscordSessionResponse { archivedSessionId: string; sessionId: string }
