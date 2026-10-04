/** Channel-neutral input consumed by the Bot handler; persistence belongs to Express. */
export interface BotInput {
  id: string;
  guildId: string;
  channelId: string;
  userId: string;
  content: string;
}

/** Minimal Discord view, independent of gateway/network operations. */
export interface EntryMessage {
  id: string;
  guildId: string | null;
  channelId: string;
  author: { id: string; bot: boolean };
  webhookId: string | null;
  content: string;
  mentions: { users: { has: (id: string) => boolean } };
}

export function normalizeMessage(
  message: EntryMessage,
  options: { botId: string; channelId: string },
): BotInput | undefined {
  const { botId, channelId } = options;
  if (!/^\d{17,20}$/.test(botId) || !message.guildId || message.channelId !== channelId ||
      message.author.bot || message.webhookId || !message.mentions.users.has(botId)) return;
  // Reply metadata / role mentions are insufficient: require a direct user mention in content.
  const mention = new RegExp(`<@!?${botId}>`, 'g');
  if (!mention.test(message.content)) return;
  const content = message.content.replace(mention, '').trim();
  if (!content) return;
  return { id: message.id, guildId: message.guildId, channelId, userId: message.author.id, content };
}
