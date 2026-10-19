/** Search links are display metadata, never instructions or model URL inputs. */
export interface SearchSource {
  provider: 'tavily';
  retrievedAt: number;
  index: number;
  title: string;
  domain: string;
  url: string;
  summary: string;
}
export const SEARCH_DEGRADED_NOTICE = '本轮未完成联网检索，以下回复未使用实时搜索。' as const;
export const SEARCH_DEGRADATION_REASONS = ['unavailable', 'missing_identity', 'admission_denied', 'no_results', 'provider_failure', 'context_limit'] as const;
export type SearchDegradationReason = (typeof SEARCH_DEGRADATION_REASONS)[number];
export type SearchMetadata =
  | { status: 'not_requested'; sources: [] }
  | { status: 'succeeded'; sources: SearchSource[] }
  | { status: 'degraded'; reason: SearchDegradationReason; sources: []; notice: typeof SEARCH_DEGRADED_NOTICE };
