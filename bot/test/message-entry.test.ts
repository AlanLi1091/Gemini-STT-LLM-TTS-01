// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { normalizeMessage, type EntryMessage } from '../message-entry';

const botId = '1555096017412694066';
const channelId = '123456789012345678';
function message(overrides: Partial<EntryMessage> = {}): EntryMessage {
  return { id: 'm1', guildId: 'g1', channelId, author: { id: 'u1', bot: false },
    webhookId: null, content: `<@${botId}> 你好`,
    mentions: { users: { has: id => id === botId } }, ...overrides };
}
const normalize = (value: EntryMessage) => normalizeMessage(value, { botId, channelId });

describe('Task 16 Step 1: 指定频道直接 @Bot 入口', () => {
  it('识别直接提及并保留消息、服务器、频道和用户标识', () => {
    expect(normalize(message())).toEqual({ id: 'm1', guildId: 'g1', channelId, userId: 'u1', content: '你好' });
  });
  it('移除普通与昵称提及的全部出现并保留文本格式和其他用户提及', () => {
    expect(normalize(message({ content: `<@!${botId}>  第一行\n第二行 <@888888888888888888> <@${botId}>` }))?.content)
      .toBe('第一行\n第二行 <@888888888888888888>');
  });
  it.each([
    ['普通文字', '你好'], ['其他用户提及', '<@888888888888888888> 你好'],
    ['角色提及', `<@&${botId}> 你好`], ['全体提及', '@everyone 你好'],
    ['仅 Bot 提及', `<@${botId}> \n <@!${botId}>`],
  ])('忽略%s', (_name, content) => { expect(normalize(message({ content }))).toBeUndefined(); });
  it('回复产生的隐式提及不能替代正文中的直接 @', () => {
    expect(normalize(message({ content: '这是回复消息，正文没有提及' }))).toBeUndefined();
  });
  it('提及文本未经 Discord 确认时不触发', () => {
    expect(normalize(message({ mentions: { users: { has: () => false } } }))).toBeUndefined();
  });
  it.each([
    ['其他频道', { channelId: 'other' }], ['私信', { guildId: null }],
    ['机器人', { author: { id: 'u1', bot: true } }], ['Webhook', { webhookId: 'w1' }],
  ])('忽略%s消息', (_name, overrides) => { expect(normalize(message(overrides))).toBeUndefined(); });
  it('Bot 身份尚未就绪时不处理消息', () => {
    expect(normalizeMessage(message(), { botId: '', channelId })).toBeUndefined();
  });
});
