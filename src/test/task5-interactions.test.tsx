import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { App } from '../App';
import { useChat } from '../hooks/useChat';
import { renderHook } from '@testing-library/react';

describe('Task 5 交互细节与体验优化全面测试', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 模拟 DOM scrollIntoView 在 jsdom 中
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.scrollTo = vi.fn();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('ADR-005 消息模型不可变与稳定 ID 断言', () => {
    it('每条生成的消息持有非空的稳定唯一字符串 ID，且追加不篡改先前消息', async () => {
      const { result } = renderHook(() => useChat({ mockDelayMs: 0 }));

      // 发送第一条
      await act(async () => {
        const p = result.current.sendMessage('消息 A');
        vi.runAllTimers();
        await p;
      });

      const initialMsgs = [...result.current.messages];
      expect(initialMsgs.length).toBeGreaterThanOrEqual(2); // user + assistant
      const firstId = initialMsgs[0].id;
      expect(typeof firstId).toBe('string');
      expect(firstId.length).toBeGreaterThan(5);

      // 发送第二条
      await act(async () => {
        const p = result.current.sendMessage('消息 B');
        vi.runAllTimers();
        await p;
      });

      // 验证第一条消息的 ID 与内容严格保持不可变
      expect(result.current.messages[0].id).toBe(firstId);
      expect(result.current.messages[0].content).toBe('消息 A');
      // 所有消息 ID 互不相同
      const allIds = result.current.messages.map((m) => m.id);
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    });
  });

  describe('IME 组合态防误发测试', () => {
    it('中文输入法敲 Enter 选词（isComposing 为 true）时不得触发消息发送', async () => {
      render(<App />);
      const textarea = screen.getByRole('textbox', { name: '输入消息' });

      // 模拟用户在输入法组合输入过程中
      fireEvent.change(textarea, { target: { value: 'nihao' } });

      // 触发 isComposing 为 true 的 Enter 键盘事件
      fireEvent.keyDown(textarea, {
        key: 'Enter',
        keyCode: 229,
        which: 229,
        isComposing: true,
      });

      // 验证：文本框内容保留，没有派发消息
      expect(textarea).toHaveValue('nihao');
      expect(document.querySelector('#chat-messages-stream')).toBeNull();

      // 退出 IME 后正常 Enter 发送
      await act(async () => {
        fireEvent.keyDown(textarea, {
          key: 'Enter',
          keyCode: 13,
          which: 13,
        });
        vi.advanceTimersByTime(800);
      });
      expect(screen.getByText('nihao')).toBeInTheDocument();
      expect(textarea).toHaveValue('');
    });

    it('Shift + Enter 应换行而不是发送消息', () => {
      render(<App />);
      const textarea = screen.getByRole('textbox', { name: '输入消息' });

      fireEvent.change(textarea, { target: { value: '第一行' } });
      fireEvent.keyDown(textarea, {
        key: 'Enter',
        shiftKey: true,
        nativeEvent: { isComposing: false },
      });

      // 未发送
      expect(textarea).toHaveValue('第一行');
      expect(document.querySelector('#chat-messages-stream')).toBeNull();
    });
  });

  describe('清空会话功能与状态干净测试', () => {
    it('点击清空对话按钮出现确认步骤，确认后重置会话并保持输入框干净聚焦', async () => {
      render(<App />);
      const textarea = screen.getByRole('textbox', { name: '输入消息' });

      // 发送一条消息并等待响应完成
      await act(async () => {
        fireEvent.change(textarea, { target: { value: '测试清空' } });
        fireEvent.click(screen.getByRole('button', { name: '发送消息' }));
        vi.advanceTimersByTime(800);
      });

      expect(screen.getByText('测试清空')).toBeInTheDocument();

      // 顶部出现清空对话按钮并点击
      const clearBtn = screen.getByRole('button', { name: '清空对话' });
      fireEvent.click(clearBtn);

      // 出现二次确认提示
      expect(screen.getByText('确认清空？')).toBeInTheDocument();
      const confirmBtn = screen.getByRole('button', { name: '确定' });

      // 点击确认清空
      fireEvent.click(confirmBtn);

      // 验证：消息列表完全重置，显示就绪空状态
      expect(screen.queryByText('测试清空')).not.toBeInTheDocument();
      expect(screen.getByText('对话已就绪')).toBeInTheDocument();
      expect(textarea).toHaveValue('');
    });

    it('取消清空对话后，原有消息不丢失', async () => {
      render(<App />);
      const textarea = screen.getByRole('textbox', { name: '输入消息' });

      await act(async () => {
        fireEvent.change(textarea, { target: { value: '不被删除的消息' } });
        fireEvent.click(screen.getByRole('button', { name: '发送消息' }));
        vi.advanceTimersByTime(800);
      });

      const clearBtn = screen.getByRole('button', { name: '清空对话' });
      fireEvent.click(clearBtn);

      // 点击取消
      const cancelBtn = screen.getByRole('button', { name: '取消' });
      fireEvent.click(cancelBtn);

      expect(screen.getByText('不被删除的消息')).toBeInTheDocument();
    });
  });

  describe('无障碍与触底调度测试', () => {
    it('消息列表容器应具备 role="log" 和 aria-live="polite"', () => {
      render(<App />);
      const logContainer = screen.getByRole('log', { name: '消息列表' });
      expect(logContainer).toBeInTheDocument();
      expect(logContainer).toHaveAttribute('aria-live', 'polite');
    });

    it('发送消息后调用滚动触底 scrollIntoView', async () => {
      render(<App />);
      const textarea = screen.getByRole('textbox', { name: '输入消息' });

      await act(async () => {
        fireEvent.change(textarea, { target: { value: '滚动测试' } });
        fireEvent.click(screen.getByRole('button', { name: '发送消息' }));
        vi.advanceTimersByTime(800);
      });

      // 验证 scrollIntoView 已被调度
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });
  });
});
