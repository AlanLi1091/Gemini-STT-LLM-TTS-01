// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readSearchProviderConfig } from '../search-config';

describe('Task 21: explicit offline search configuration', () => {
  it.each([undefined, 'none'])('provider %s disables environment search and ignores scenario', provider => {
    expect(readSearchProviderConfig({ SEARCH_PROVIDER: provider, SEARCH_MOCK_SCENARIO: 'invalid-secret' })).toEqual({ provider: 'none' });
  });
  it('mock defaults to default', () => {
    expect(readSearchProviderConfig({ SEARCH_PROVIDER: 'mock' })).toEqual({ provider: 'mock', scenario: 'default' });
  });
  it.each(['default', 'hostile', 'empty', 'fail', 'slow'])('accepts mock scenario %s', scenario => {
    expect(readSearchProviderConfig({ SEARCH_PROVIDER: 'mock', SEARCH_MOCK_SCENARIO: scenario })).toEqual({ provider: 'mock', scenario });
  });
  it.each(['', 'tavily', 'MOCK', ' mock ', 'secret-provider'])('rejects provider %s without echoing it', provider => {
    expect(() => readSearchProviderConfig({ SEARCH_PROVIDER: provider })).toThrow(/^Invalid search provider configuration\.$/);
  });
  it.each(['', 'DEFAULT', ' slow ', 'secret-scenario'])('rejects mock scenario %s with fixed error', scenario => {
    expect(() => readSearchProviderConfig({ SEARCH_PROVIDER: 'mock', SEARCH_MOCK_SCENARIO: scenario })).toThrow(/^Invalid mock search scenario configuration\.$/);
  });
});
