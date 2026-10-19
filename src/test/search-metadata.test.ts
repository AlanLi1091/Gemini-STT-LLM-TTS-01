import { describe, expect, it } from 'vitest';
import { SEARCH_DEGRADED_NOTICE, SEARCH_DEGRADATION_REASONS } from '@core/index';
import { parseSearchMetadata, searchSourceLink } from '../services/searchMetadata';

const source = { provider: 'tavily', retrievedAt: 123, index: 1, title: '标题', domain: 'forged.example', url: 'https://real.example/path', summary: '摘要' };
const succeeded = { status: 'succeeded', sources: [source] };

describe('Task 21: 客户端搜索元数据边界', () => {
  it('接受成功来源并复制已知字段，不修改输入', () => {
    const result = parseSearchMetadata(succeeded);
    expect(result).toEqual(succeeded);
    expect(result).not.toBe(succeeded);
  });
  it.each(SEARCH_DEGRADATION_REASONS)('接受共享降级原因 %s 并固定文案', reason => {
    expect(parseSearchMetadata({ status: 'degraded', reason, sources: [], notice: SEARCH_DEGRADED_NOTICE })).toEqual({ status: 'degraded', reason, sources: [], notice: SEARCH_DEGRADED_NOTICE });
  });
  it.each([
    undefined, null, [], {}, { status: 'unknown', sources: [] },
    { status: 'succeeded', sources: [] }, { ...succeeded, sources: [source, source, source, source] },
    { ...succeeded, sources: [{ ...source, index: 2 }] },
    { ...succeeded, sources: [{ ...source, retrievedAt: -1 }] },
    { ...succeeded, sources: [{ ...source, provider: 'evil' }] },
    { ...succeeded, sources: [{ ...source, title: 'a'.repeat(121) }] },
    { ...succeeded, sources: [{ ...source, summary: 'a'.repeat(101) }] },
    { ...succeeded, sources: [{ ...source, url: null }] },
    { ...succeeded, raw: 'private detail' },
    { status: 'degraded', sources: [], reason: 'private detail', notice: SEARCH_DEGRADED_NOTICE },
    { status: 'degraded', sources: [], reason: 'unavailable', notice: 'private detail' },
    { status: 'not_requested', sources: [source] },
  ])('无效结构按无来源处理：%j', value => {
    expect(parseSearchMetadata(value)).toBeUndefined();
  });
  it('未请求保持兼容', () => {
    expect(parseSearchMetadata({ status: 'not_requested', sources: [] })).toEqual({ status: 'not_requested', sources: [] });
  });
  it.each([
    'javascript:alert(1)', 'data:text/html,evil', 'vbscript:evil', '//example.com/path',
    'https://user:secret@example.com/', 'https://example.com/a\nb', 'https://example.com/a\tb',
    'https://example.com/a\u0000b', 'https://example.com/a\u007fb', 'https://example.com/a\u0085b',
    'https://example.com/a\u2028b', 'https://example.com/a\u2029b', 'https://example.com/a\u202eb',
    'https://example.com/a b', 'https://example.com/a\u00a0b', 'https://example.com/' + 'a'.repeat(2048),
  ])('危险URL保留文本来源但不能点击：%s', url => {
    expect(parseSearchMetadata({ ...succeeded, sources: [{ ...source, url }] })).toBeDefined();
    expect(searchSourceLink(url).href).toBeUndefined();
  });
  it.each(['https://例子.测试:8443/path', 'http://real.example/path'])('域名来自URL解析 %s', url => {
    expect(searchSourceLink(url)).toEqual({ href: new URL(url).href, domain: new URL(url).hostname });
  });
  it('无效地址不信任持久化域名', () => {
    expect(searchSourceLink('bad url')).toEqual({ domain: '域名无效' });
    expect(searchSourceLink('https://user:pass@real.example')).toEqual({ domain: 'real.example' });
  });
});
