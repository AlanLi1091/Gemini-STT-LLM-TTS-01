import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useChat } from './useChat';

describe('useChat Hook 领域逻辑测试', () => {
  it('应正确初始化空消息列表与空输入框', () => {
    const { result } = renderHook(() => useChat());
    expect(result.current.messages).toEqual([]);
    expect(result.current.inputText).toBe('');
  });

  it('更新输入框文本应同步状态', () => {
    const { result } = renderHook(() => useChat());
    act(() => {
      result.current.setInputText('你好');
    });
    expect(result.current.inputText).toBe('你好');
  });

  it('空白或全空格输入不应发送，且返回 false', async () => {
    const { result } = renderHook(() => useChat());

    // 空字符串
    let success = false;
    await act(async () => {
      success = await result.current.sendMessage();
    });
    expect(success).toBe(false);
    expect(result.current.messages).toHaveLength(0);

    // 全空格字符串
    await act(async () => {
      result.current.setInputText('    ');
    });
    await act(async () => {
      success = await result.current.sendMessage();
    });
    expect(success).toBe(false);
    expect(result.current.messages).toHaveLength(0);
  });

  it('发送有效文本应追加消息并清空输入框', async () => {
    const { result } = renderHook(() => useChat({ mockDelayMs: 0 }));

    await act(async () => {
      result.current.setInputText('  你好，测试消息！  ');
    });

    let success = false;
    await act(async () => {
      success = await result.current.sendMessage();
    });

    expect(success).toBe(true);
    // 包含用户消息与助手回复
    expect(result.current.messages.length).toBeGreaterThanOrEqual(1);
    expect(result.current.messages[0].content).toBe('你好，测试消息！');
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.inputText).toBe('');
  });

  it('clearMessages 应正确清空消息列表', () => {
    const { result } = renderHook(() => useChat());
    act(() => {
      result.current.setInputText('消息 1');
    });
    act(() => {
      result.current.sendMessage();
    });
    expect(result.current.messages).toHaveLength(1);

    act(() => {
      result.current.clearMessages();
    });
    expect(result.current.messages).toHaveLength(0);
  });
});
