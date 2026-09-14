import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../App';
import { SETTINGS_STORAGE_KEY } from '../settings';

// Mock scrollIntoView
beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});

describe('Task 8: 设置面板与模型切换组件行为测试', () => {
  it('① 无存储时点击顶栏“设置”按钮打开弹窗，显示默认 Mock 提供方与默认模型', async () => {
    render(<App />);

    const settingsBtn = screen.getByRole('button', { name: /设置/i });
    expect(settingsBtn).toBeInTheDocument();

    // 默认弹窗未显示
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // 点击打开
    fireEvent.click(settingsBtn);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('模型与调试设置')).toBeInTheDocument();

    // 校验默认选中 Mock 模式
    const mockBtn = screen.getByRole('button', { name: /Mock 模拟引擎/i });
    expect(mockBtn.className).toContain('bg-zinc-900');

    // API Key 默认为空
    const keyInput = screen.getByPlaceholderText('AIzaSy...') as HTMLInputElement;
    expect(keyInput.value).toBe('');
  });

  it('② 保存配置写入 localStorage 且往返一致，顶栏副标题同步更新', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /设置/i }));

    // 切换到 Gemini
    const geminiBtn = screen.getByRole('button', { name: /Google Gemini API/i });
    fireEvent.click(geminiBtn);

    // 输入 API Key
    const keyInput = screen.getByPlaceholderText('AIzaSy...');
    fireEvent.change(keyInput, { target: { value: 'AIzaSyTestApiKey123' } });

    // 选择深度推理模型
    const select = screen.getByLabelText(/Gemini 模型版本/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'gemini-2.5-pro' } });

    // 点击保存
    const saveBtn = screen.getByRole('button', { name: /保存配置/i });
    fireEvent.click(saveBtn);

    // 弹窗关闭
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // 校验 localStorage 写入
    const savedStr = localStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(savedStr).toBeTruthy();
    const parsed = JSON.parse(savedStr!);
    expect(parsed.provider).toBe('gemini');
    expect(parsed.geminiApiKey).toBe('AIzaSyTestApiKey123');
    expect(parsed.geminiModel).toBe('gemini-2.5-pro');

    // 校验顶栏状态副标题更新
    expect(screen.getByText('Gemini (gemini-2.5-pro)')).toBeInTheDocument();
  });

  it('③ 取消 / ESC / 点击遮罩丢弃草稿，不写入 localStorage', async () => {
    render(<App />);

    // 1. 点击取消按钮
    fireEvent.click(screen.getByRole('button', { name: /设置/i }));
    const keyInput = screen.getByPlaceholderText('AIzaSy...');
    fireEvent.change(keyInput, { target: { value: 'discarded-key' } });

    const cancelBtn = screen.getByRole('button', { name: /取消/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull();

    // 2. ESC 按键关闭
    fireEvent.click(screen.getByRole('button', { name: /设置/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // 3. 点击遮罩层关闭
    fireEvent.click(screen.getByRole('button', { name: /设置/i }));
    const overlay = document.getElementById('settings-modal-overlay');
    expect(overlay).toBeInTheDocument();
    fireEvent.click(overlay!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('④ 切到 Gemini 且 API Key 为空时，行内提示并阻止保存', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /设置/i }));

    const geminiBtn = screen.getByRole('button', { name: /Google Gemini API/i });
    fireEvent.click(geminiBtn);

    const keyInput = screen.getByPlaceholderText('AIzaSy...');
    fireEvent.change(keyInput, { target: { value: '   ' } });

    const saveBtn = screen.getByRole('button', { name: /保存配置/i });
    fireEvent.click(saveBtn);

    // 出现校验提示
    expect(screen.getByText('切换为 Gemini 模型时，请输入有效的 API Key')).toBeInTheDocument();

    // 弹窗依然保留在 DOM，未写入 localStorage
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull();
  });

  it('⑤ API Key 默认掩码 (password)，点击 eye 按钮切换为明文 (text)', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /设置/i }));

    const keyInput = screen.getByPlaceholderText('AIzaSy...') as HTMLInputElement;
    expect(keyInput.type).toBe('password');

    const toggleBtn = screen.getByRole('button', { name: /显示 API Key/i });
    fireEvent.click(toggleBtn);

    expect(keyInput.type).toBe('text');
    expect(screen.getByRole('button', { name: /隐藏 API Key/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /隐藏 API Key/i }));
    expect(keyInput.type).toBe('password');
  });

  it('⑥ 符合无障碍要求：具备 role="dialog"、aria-modal 与 aria-labelledby', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /设置/i }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'settings-modal-title');
    expect(document.getElementById('settings-modal-title')).toHaveTextContent('模型与调试设置');
  });
});
