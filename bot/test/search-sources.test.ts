// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { formatSearchSources } from '../search-sources';

const source = { provider: 'tavily' as const, retrievedAt: 123, index: 1, title: '标题', domain: 'forged.example', url: 'https://real.example/path', summary: '摘要' };
const metadata = (changes = {}) => ({ status: 'succeeded', sources: [{ ...source, ...changes }] });

describe('Task 21 Step 2: Discord来源格式与边界', () => {
  it('每条独立来源含编号标题摘要、真实域名和尖括号原链接', () => {
    expect(formatSearchSources(metadata())).toEqual(['本轮检索来源\n1. 标题\nreal.example\n摘要\n<https://real.example/path>']);
  });
  it.each(['*加粗* _斜体_ ~删除~ ||剧透||', '[文字](https://fake.example)', '```code```', '@everyone @here <@123456789012345678> <#123456789012345678>', '\u202e伪装\u202c\n新行'])('转义或消除文本结构 %s', text => {
    const [message] = formatSearchSources(metadata({ title: text, summary: text }));
    expect(message).toContain('<https://real.example/path>');
    expect(message.match(/<[^>]*>/g)).toEqual(['<https://real.example/path>']);
    expect(message).not.toContain('```'); expect(message).not.toMatch(/[\u202a-\u202e]/);
    expect(message.match(/https:\/\//g)).toHaveLength(1);
    expect(message.length).toBeLessThanOrEqual(1900);
  });
  it('Markdown特殊字符实际按文本转义', () => {
    const [message] = formatSearchSources(metadata({ title: '*标题*', summary: '[摘要](假目标)' }));
    expect(message).toContain('\\*标题\\*'); expect(message).toContain('\\[摘要\\]');
  });
  it('标题先按80码点截断，emoji不拆分且转义后计整段UTF16长度', () => {
    const [message] = formatSearchSources(metadata({ title: '😀'.repeat(120), summary: '*'.repeat(100) }));
    expect(message).toContain('😀'.repeat(80)); expect(message).not.toContain('😀'.repeat(81));
    expect(message).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])/);
    expect(message.length).toBeLessThanOrEqual(1900);
  });
  it.each(['javascript:alert(1)', 'data:text/html,evil', 'vbscript:evil', '//evil.example', 'https://u:p@real.example',
    'https://real.example/a b', 'https://real.example/a\tb', 'https://real.example/a\nb', 'https://real.example/a\u0000b',
    'https://real.example/a\u007fb', 'https://real.example/a\u0085b', 'https://real.example/a\u2028b', 'https://real.example/a\u202eb',
    'https://real.example/>evil', 'https://real.example/`evil', 'https://real.example/\\evil', 'https://real.example/' + 'a'.repeat(2048)])('无效URL仅显示域名和固定说明 %s', url => {
    const [message] = formatSearchSources(metadata({ url }));
    expect(message).toContain('链接过长未展示'); expect(message).not.toContain('<');
    expect(message).not.toContain('forged.example'); expect(message).not.toContain('摘要');
    expect(message.length).toBeLessThanOrEqual(1900);
  });
  it('符合原URL上限但整段超过1900时不发送截断链接', () => {
    const url = 'https://real.example/' + 'a'.repeat(1800);
    const [message] = formatSearchSources(metadata({ title: '😀'.repeat(120), summary: '*'.repeat(100), url }));
    expect(message).toBe('本轮检索来源\n1. real.example\n链接过长未展示');
  });
  it('URL使整段恰好1900时保留，超过一个单位时回退', () => {
    const [base] = formatSearchSources(metadata());
    const url = source.url + 'a'.repeat(1900 - base.length);
    expect(formatSearchSources(metadata({ url }))[0].length).toBe(1900);
    expect(formatSearchSources(metadata({ url: url + 'a' }))[0]).toContain('链接过长未展示');
  });
  it('IDN真实域名使用URL解析后的punycode', () => {
    const [message] = formatSearchSources(metadata({ url: 'https://例子.测试/path' }));
    expect(message).toContain('xn--fsqu00a.xn--0zwm56d');
    expect(message).toContain('<https://例子.测试/path>');
  });
  it('最多三条来源且不接受非法元数据', () => {
    const sources = Array.from({ length: 3 }, (_, i) => ({ ...source, index: i + 1 }));
    expect(formatSearchSources({ status: 'succeeded', sources })).toHaveLength(3);
    expect(formatSearchSources({ status: 'succeeded', sources: [...sources, { ...source, index: 4 }] })).toEqual([]);
    expect(formatSearchSources({ status: 'degraded', sources: [], reason: 'SECRET' })).toEqual([]);
  });
  it.each([undefined, { status: 'not_requested', sources: [] }])('普通轮次不生成来源 %j', value => {
    expect(formatSearchSources(value)).toEqual([]);
  });
});

describe('Task 21 Step 2: 异常长域名边界', () => {
  it('超长hostname不会使无效URL回退消息突破1900单位', () => {
    const [message] = formatSearchSources(metadata({ url: 'https://' + 'a'.repeat(4000) + '.example/' }));
    expect(message.length).toBeLessThanOrEqual(1900);
    expect(message).toBe('本轮检索来源\n1. 域名无效\n链接过长未展示');
  });
});
