import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { App } from '../App';

describe('Task 3: 用户输入与消息派发完整交互测试', () => {
  it('输入框为空时，发送按钮应禁用', () => {
    render(<App />);
    const input = screen.getByRole('textbox', { name: '输入消息' });
    const sendBtn = screen.getByRole('button', { name: '发送消息' });

    expect(input).toHaveValue('');
    expect(sendBtn).toBeDisabled();
  });

  it('输入纯空格时，发送按钮保持禁用', () => {
    render(<App />);
    const input = screen.getByRole('textbox', { name: '输入消息' });
    const sendBtn = screen.getByRole('button', { name: '发送消息' });

    fireEvent.change(input, { target: { value: '    ' } });
    expect(sendBtn).toBeDisabled();
  });

  it('输入有效文字后发送按钮启用，提交表单后消息显示在列表中并清空输入框', () => {
    render(<App />);
    const input = screen.getByRole('textbox', { name: '输入消息' });
    const sendBtn = screen.getByRole('button', { name: '发送消息' });

    // 初始状态显示就绪提示
    expect(screen.getByText('对话已就绪')).toBeInTheDocument();

    // 键入文本
    fireEvent.change(input, { target: { value: '你好，我的第一条消息！' } });
    expect(sendBtn).toBeEnabled();

    // 点击发送
    fireEvent.click(sendBtn);

    // 验证：消息上屏，空状态消失，输入框清空，发送按钮再次禁用
    expect(screen.getByText('你好，我的第一条消息！')).toBeInTheDocument();
    expect(screen.queryByText('对话已就绪')).not.toBeInTheDocument();
    expect(input).toHaveValue('');
    expect(sendBtn).toBeDisabled();
  });

  it('使用键盘 Enter 提交表单可派发消息', () => {
    render(<App />);
    const input = screen.getByRole('textbox', { name: '输入消息' });
    const form = screen.getByRole('form', { name: '消息发送表单' });

    fireEvent.change(input, { target: { value: '回车发送测试' } });
    fireEvent.submit(form);

    expect(screen.getByText('回车发送测试')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });
});
