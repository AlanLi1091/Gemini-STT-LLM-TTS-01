export type SessionOrigin =
  | { type: 'web' }
  | { type: 'discord'; guildId: string; channelId: string };

export interface ResolveDiscordSessionRequest { guildId: string; channelId: string }
export interface ResolveDiscordSessionResponse { sessionId: string }
