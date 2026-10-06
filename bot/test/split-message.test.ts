// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { splitMessage } from '../split-message';

describe('Task 16 Step 3: Discord 长回复分段', () => {
  it('空文本没有分段', () => { expect(splitMessage('')).toEqual([]); });
  it('短文本及恰好 2000 字符保持原文', () => {
    for (const text of ['  简短回复\n', '中'.repeat(2000)]) expect(splitMessage(text)).toEqual([text]);
  });
  it('2001 字符拆成两段且不丢字', () => {
    expect(splitMessage('中'.repeat(2001))).toEqual(['中'.repeat(2000), '中']);
  });
  it('优先段落边界而不是更晚的单换行', () => {
    const paragraph = '甲'.repeat(1000) + '\n\n';
    const rest = '乙'.repeat(500) + '\n' + '丙'.repeat(800);
    expect(splitMessage(paragraph + rest)).toEqual([paragraph, rest]);
  });
  it('没有段落边界时按最后一个换行切分', () => {
    const line = '甲'.repeat(1500) + '\n';
    expect(splitMessage(line + '乙'.repeat(800))).toEqual([line, '乙'.repeat(800)]);
  });
  it('识别 CRLF 段落且不拆开 CRLF', () => {
    const paragraph = '甲'.repeat(1000) + '\r\n\r\n';
    expect(splitMessage(paragraph + '乙'.repeat(1500))[0]).toBe(paragraph);
    expect(splitMessage('甲'.repeat(1999) + '\r\n乙')).toEqual(['甲'.repeat(1999), '\r\n乙']);
  });
  it('硬切分不截断 emoji 的 UTF-16 代理对', () => {
    const text = '甲'.repeat(1999) + '😀' + '乙';
    expect(splitMessage(text)).toEqual(['甲'.repeat(1999), '😀乙']);
  });
  it('无换行超长文本每段不超过上限且完整重组', () => {
    const text = '😀中文'.repeat(2500);
    const parts = splitMessage(text);
    expect(parts.join('')).toBe(text);
    expect(parts.every(part => part.length > 0 && part.length <= 2000)).toBe(true);
  });
  it('保留段落分隔符、空格和首尾换行', () => {
    const text = '\n  ' + ('段落内容 '.repeat(250) + '\n\n').repeat(4) + '\n';
    const parts = splitMessage(text);
    expect(parts.join('')).toBe(text);
    expect(parts.every(part => part.length <= 2000)).toBe(true);
  });
  it('开头只有换行时仍能前进而不产生空段', () => {
    const text = '\n\n' + '甲'.repeat(4001);
    const parts = splitMessage(text);
    expect(parts.join('')).toBe(text);
    expect(parts.every(part => part.trim().length > 0 && part.length <= 2000)).toBe(true);
  });
});
