export { parseSearchMetadata } from '@core/index';

/** Never trust the stored domain, nor allow URL's parser to silently remove controls. */
export function searchSourceLink(value: string): { domain: string; href?: string } {
  let url: URL;
  try { url = new URL(value); } catch { return { domain: '域名无效' }; }
  const domain = url.hostname || '域名无效';
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password ||
    value.length > 2048 || /[\s\u0000-\u0020\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/.test(value)) return { domain };
  return { domain, href: url.href };
}
