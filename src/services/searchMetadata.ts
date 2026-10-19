import {
  SEARCH_DEGRADED_NOTICE,
  SEARCH_DEGRADATION_REASONS,
  type SearchMetadata,
  type SearchSource,
  type SearchDegradationReason,
} from '@core/index';

function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}

/** Read only the display contract. URL safety is independently checked at rendering. */
export function parseSearchMetadata(value: unknown): SearchMetadata | undefined {
  const raw = object(value);
  if (!raw || !Array.isArray(raw.sources) ||
    Object.keys(raw).some(key => !['status', 'sources', 'reason', 'notice'].includes(key))) return;
  if (raw.status === 'not_requested') {
    if (!raw.sources.length && raw.reason === undefined && raw.notice === undefined) {
      return { status: 'not_requested', sources: [] };
    }
    return;
  }
  if (raw.status === 'degraded') {
    if (!raw.sources.length && SEARCH_DEGRADATION_REASONS.includes(raw.reason as SearchDegradationReason) && raw.notice === SEARCH_DEGRADED_NOTICE) {
      return { status: 'degraded', sources: [], reason: raw.reason as SearchDegradationReason, notice: SEARCH_DEGRADED_NOTICE };
    }
    return;
  }
  if (raw.status !== 'succeeded' || raw.reason !== undefined || raw.notice !== undefined ||
    raw.sources.length < 1 || raw.sources.length > 3) return;
  const sources: SearchSource[] = [];
  for (const [i, item] of raw.sources.entries()) {
    const source = object(item);
    if (!source || Object.keys(source).some(key => !['provider', 'retrievedAt', 'index', 'title', 'domain', 'url', 'summary'].includes(key)) ||
      source.provider !== 'tavily' || typeof source.retrievedAt !== 'number' ||
      !Number.isSafeInteger(source.retrievedAt) || source.retrievedAt < 0 || source.index !== i + 1 ||
      typeof source.title !== 'string' || !source.title.trim() || Array.from(source.title).length > 120 ||
      typeof source.summary !== 'string' || !source.summary.trim() || Array.from(source.summary).length > 100 ||
      typeof source.domain !== 'string' || typeof source.url !== 'string') return;
    sources.push({ provider: 'tavily', retrievedAt: source.retrievedAt, index: i + 1,
      title: source.title, summary: source.summary, domain: source.domain, url: source.url });
  }
  return { status: 'succeeded', sources };
}

/** Never trust the stored domain, nor allow URL's parser to silently remove controls. */
export function searchSourceLink(value: string): { domain: string; href?: string } {
  let url: URL;
  try { url = new URL(value); } catch { return { domain: '域名无效' }; }
  const domain = url.hostname || '域名无效';
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password ||
    value.length > 2048 || /[\s\u0000-\u0020\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/.test(value)) return { domain };
  return { domain, href: url.href };
}
