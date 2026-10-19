import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SEARCH_DEGRADED_NOTICE } from '@core/index';
import { SearchSources } from '../components/SearchSources';

const source = { provider: 'tavily' as const, retrievedAt: 123, index: 1, title: '标题', domain: 'forged.example', url: 'https://real.example/path', summary: '摘要' };

describe('Task 21: 来源纯文本与安全链接', () => {
  it('按编号展示标题摘要和解析域名，安全新窗口属性齐全', () => {
    render(<SearchSources search={{ status: 'succeeded', sources: [source] }} />);
    expect(screen.getByText('本轮检索来源')).toBeInTheDocument();
    expect(screen.getByText('标题')).toBeInTheDocument(); expect(screen.getByText('摘要')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'real.example' });
    expect(link).toHaveAttribute('href', source.url); expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByText('forged.example')).not.toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent('1.');
  });
  it.each(['javascript:alert(1)', 'data:text/html,evil', 'vbscript:evil', '//evil.example', 'https://u:p@real.example', 'https://real.example/a\nb', 'https://real.example/' + 'a'.repeat(2048)])('不渲染危险链接 %s', url => {
    render(<SearchSources search={{ status: 'succeeded', sources: [{ ...source, url }] }} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('标题')).toBeInTheDocument();
    expect(screen.queryByText('摘要')).not.toBeInTheDocument();
  });
  it.each(['<script>alert(1)</script>', '<img src=x onerror="alert(1)">', '[点击](javascript:evil)', '@everyone', '\u202e反向\u202c'])('标题摘要作为原样文本节点 %s', text => {
    const { container } = render(<SearchSources search={{ status: 'succeeded', sources: [{ ...source, title: text, summary: text }] }} />);
    expect(screen.getAllByText(text)).toHaveLength(2);
    expect(container.querySelector('script, img')).toBeNull();
    expect(container.querySelectorAll('a')).toHaveLength(1);
  });
  it('降级固定提示独立展示，不显示枚举或原文', () => {
    render(<SearchSources search={{ status: 'degraded', reason: 'unavailable', sources: [], notice: SEARCH_DEGRADED_NOTICE }} />);
    expect(screen.getByText(SEARCH_DEGRADED_NOTICE)).toBeInTheDocument();
    expect(screen.queryByText('unavailable')).not.toBeInTheDocument();
    expect(screen.queryByText('本轮检索来源')).not.toBeInTheDocument();
  });
  it.each([undefined, { status: 'not_requested', sources: [] }])('旧消息和未请求不展示搜索内容 %j', search => {
    const { container } = render(<SearchSources search={search} />);
    expect(container).toBeEmptyDOMElement();
  });
});
