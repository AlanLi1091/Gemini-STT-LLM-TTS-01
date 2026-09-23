import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from '../App';
import { SETTINGS_STORAGE_KEY } from '../settings';

describe('Phase 3 收尾：后端连接信息面板', () => {
  beforeEach(() => localStorage.clear());

  it('展示后端连接说明，且没有直连、模型或浏览器密钥控件', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '设置' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('后端连接信息')).toBeInTheDocument();
    expect(screen.getByText(/浏览器不读取、输入或保存密钥/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /API Key/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /前端直连/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('打开应用时迁移旧直连设置并从存储中清除密钥', async () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
      connectionMode: 'direct', provider: 'gemini', geminiApiKey: 'legacy-key',
    }));
    render(<App />);

    await waitFor(() => expect(localStorage.getItem(SETTINGS_STORAGE_KEY))
      .toBe(JSON.stringify({ connectionMode: 'server' })));
    expect(screen.getByText('后端服务（SSE）')).toBeInTheDocument();
  });

  it('关闭按钮、Esc 与遮罩均可关闭面板', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '设置' }));
    fireEvent.click(screen.getByRole('button', { name: '关闭设置面板' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '设置' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '设置' }));
    fireEvent.click(document.getElementById('settings-modal-overlay')!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('面板保留对话框语义和标题关联', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '设置' }));
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'settings-modal-title');
  });
});
