import { escapeMarkdown } from 'discord.js';
import { parseSearchMetadata } from '../core/search-metadata';

const SOURCE_LIMIT = 1900;
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g;

function prose(value: string, limit: number): string {
  const text = Array.from(value.replace(CONTROL, ' ').trim()).slice(0, limit).join('').trim();
  // Prose cannot manufacture mentions, code blocks, hidden targets or extra automatic links.
  return escapeMarkdown(text, { heading: true, bulletedList: true, numberedList: true }).replace(/[\[\]()]/g, '\\$&').replace(/</g, '＜').replace(/>/g, '＞').replace(/https?:\/\//gi, match => match.replace(':', '：'));
}

/** Independent Bot URL boundary; never truncate a URL into a clickable destination. */
function sourceLink(value: string): { domain: string; url?: string } {
  let parsed: URL;
  try { parsed = new URL(value); } catch { return { domain: '域名无效' }; }
  const validHost = !!parsed.hostname && parsed.hostname.length <= 253;
  const domain = validHost ? parsed.hostname : '域名无效';
  if (!['http:', 'https:'].includes(parsed.protocol) || !validHost || parsed.username || parsed.password ||
      value.length > 2048 || /[\s\u0000-\u0020\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff<>`\\]/.test(value)) return { domain };
  return { domain, url: value };
}

/** Each element is one standalone source message, including its heading and number. */
export function formatSearchSources(value: unknown): string[] {
  const metadata = parseSearchMetadata(value);
  if (metadata?.status !== 'succeeded') return [];
  return metadata.sources.map(source => {
    const link = sourceLink(source.url);
    const domain = escapeMarkdown(link.domain);
    const fallback = `本轮检索来源\n${source.index}. ${domain}\n链接过长未展示`;
    if (!link.url) return fallback;
    const message = `本轮检索来源\n${source.index}. ${prose(source.title, 80)}\n${domain}\n${prose(source.summary, 100)}\n<${link.url}>`;
    return message.length <= SOURCE_LIMIT ? message : fallback;
  });
}
