import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { App } from '../App';
import { generateMockReply } from '../services/mockChatService';

describe('Task 4: Mock 机器人响应引擎与思考态测试', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('mockChatService 领域内核测试', () => {
    it('应在指定延时后生成问候类 Mock 回复', async () => {
      const promise = generateMockReply('你好', { delayMs: 800 });
      vi.advanceTimersByTime(800);
      const reply = await promise;
      expect(reply).toContain('你好！我是你的角色扮演与对话助手');
    });

    it('应在指定延时后生成兜底通用 Mock 回复', async () => {
      const promise = generateMockReply('测试一条特定问题', { delayMs: 500 });
      vi.advanceTimersByTime(500);
      const reply = await promise;
      expect(reply).toContain('已收到你的消息："测试一条特定问题"');
    });
  });

  describe('App 思考态交互与自动化流转测试', () => {
    it('用户发送消息后，立即进入思考态，输入框被禁用，并渲染思考动效指示器', async () => {
      render(<App />);
      const input = screen.getByRole('textbox', { name: '输入消息' });
      const sendBtn = screen.getByRole('button', { name: '发送消息' });

      fireEvent.change(input, { target: { value: '你好' } });
      fireEvent.click(sendBtn);

      // 用户消息立即上屏
      expect(screen.getByText('你好')).toBeInTheDocument();

      // 处于思考状态，输入框被禁用
      expect(input).toBeDisabled();
      expect(screen.getByRole('status', { name: '机器人正在思考中' })).toBeInTheDocument();
      expect(screen.getByText('思考中')).toBeInTheDocument();

      // 推进时间完成 Mock 流式响应
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // 思考态消失，机器人消息追加上屏
      expect(screen.queryByRole('status', { name: '机器人正在思考中' })).not.toBeInTheDocument();
      expect(screen.getByText(/你好！我是你的角色扮演与对话助手/)).toBeInTheDocument();

      // 输入框恢复可用
      expect(input).not.toBeDisabled();
    });
  });
});
