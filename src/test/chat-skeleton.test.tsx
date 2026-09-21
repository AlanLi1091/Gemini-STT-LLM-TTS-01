import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Header } from '../components/Header';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { App } from '../App';
import { Message } from '../types';

describe('Task 2: 聊天界面骨架单元测试', () => {
  describe('Header 组件', () => {
    it('应渲染标题与状态标签', () => {
      render(<Header title="Chatbot Playground" subtitle="Web Mock MVP" />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Chatbot Playground');
      expect(screen.getByText('Web Mock MVP')).toBeInTheDocument();
      expect(screen.getByText(/角色扮演对话机器人/)).toBeInTheDocument();
    });
  });

  describe('MessageList 组件', () => {
    it('空列表时应展示空状态提示与 log 角色', () => {
      render(<MessageList messages={[]} />);
      const container = screen.getByRole('log', { name: '消息列表' });
      expect(container).toBeInTheDocument();
      expect(screen.getByText('对话已就绪')).toBeInTheDocument();
      expect(screen.getByText('输入任意消息，即可开始对话。')).toBeInTheDocument();
    });

    it('有消息时应正确渲染用户与机器人消息气泡', () => {
      const mockMessages: Message[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: '你好，机器人！',
          createdAt: Date.now(),
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: '你好！我是模拟助手。',
          createdAt: Date.now() + 1000,
        },
      ];

      render(<MessageList messages={mockMessages} />);
      expect(screen.getByText('你好，机器人！')).toBeInTheDocument();
      expect(screen.getByText('你好！我是模拟助手。')).toBeInTheDocument();
      expect(screen.queryByText('对话已就绪')).not.toBeInTheDocument();
    });
  });

  describe('ChatInput 组件', () => {
    it('应渲染文本输入框、发送按钮及表单', () => {
      render(<ChatInput placeholder="输入消息..." />);
      expect(screen.getByRole('form', { name: '消息发送表单' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: '输入消息' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '发送消息' })).toBeInTheDocument();
    });

    it('disabled 状态下输入框与发送按钮应处于禁用态', () => {
      render(<ChatInput disabled />);
      expect(screen.getByRole('textbox', { name: '输入消息' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '发送消息' })).toBeDisabled();
    });
  });

  describe('App 完整骨架挂载', () => {
    it('App 应同时装配 Header、MessageList 与 ChatInput 三大骨架区域', () => {
      render(<App />);
      // 头部
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Chatbot Playground');
      // 中间消息流
      expect(screen.getByRole('log', { name: '消息列表' })).toBeInTheDocument();
      expect(screen.getByText('对话已就绪')).toBeInTheDocument();
      // 底部输入区
      expect(screen.getByRole('form', { name: '消息发送表单' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: '输入消息' })).toBeInTheDocument();
    });
  });
});
