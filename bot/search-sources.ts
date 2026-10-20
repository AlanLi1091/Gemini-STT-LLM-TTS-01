import { escapeMarkdown } from 'discord.js';
import { parseSearchMetadata } from '../core/search-metadata';
import type { SearchSource } from '../core/contracts/search';

const SOURCE_LIMIT = 1900;
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g;

function textPoints(value: string, limit: number): string[] {
  return Array.from(value.replace(CONTROL, ' ').trim()).slice(0, limit);
}

function prose(value: string, limit: number): string {
  const text = textPoints(value, limit).join('').trim();
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

type FallbackNotice = '链接无效未展示' | '链接过长未展示';

/** A smaller budget permits direct boundary tests; callers cannot raise the hard cap. */
export function fitSearchFallback(
  source: Pick<SearchSource, 'index' | 'title' | 'summary'>,
  domain: string,
  notice: FallbackNotice,
  limit = SOURCE_LIMIT,
): string {
  if (!Number.isSafeInteger(limit) || limit < 0) throw new RangeError('Invalid fallback message budget.');
  const budget = Math.min(limit, SOURCE_LIMIT);
  const title = textPoints(source.title, 80);
  const summary = textPoints(source.summary, 100);
  const escapedDomain = escapeMarkdown(domain);
  const render = () => `本轮检索来源\n${source.index}. ${prose(title.join(''), 80)}\n${escapedDomain}\n${prose(summary.join(''), 100)}\n${notice}`;
  let message = render();
  while (message.length > budget) {
    // Remove complete original code points, then escape again; never slice escaped text.
    if (summary.length) summary.pop();
    else if (title.length) title.pop();
    else throw new RangeError('Fallback message budget cannot fit fixed fields.');
    message = render();
  }
  return message;
}

/** Each element is one standalone source message, including its heading and number. */
export function formatSearchSources(value: unknown): string[] {
  const metadata = parseSearchMetadata(value);
  if (metadata?.status !== 'succeeded') return [];
  return metadata.sources.map(source => {
    const link = sourceLink(source.url);
    const domain = escapeMarkdown(link.domain);
    if (!link.url) return fitSearchFallback(source, link.domain, '链接无效未展示');
    const message = `本轮检索来源\n${source.index}. ${prose(source.title, 80)}\n${domain}\n${prose(source.summary, 100)}\n<${link.url}>`;
    return message.length <= SOURCE_LIMIT ? message : fitSearchFallback(source, link.domain, '链接过长未展示');
  });
}
