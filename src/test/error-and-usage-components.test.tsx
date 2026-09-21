import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TokenUsageBadge } from '../components/TokenUsageBadge';
import { ChatErrorBanner } from '../components/ChatErrorBanner';
import { ChatError, ChatErrorCode } from '../types';

describe('TokenUsageBadge 纯展示组件测试', () => {
  it('当 usage 为 undefined 时不应渲染任何 DOM', () => {
    const { container } = render(<TokenUsageBadge usage={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('当所有 token 计数均为 0 或未定义时不应渲染', () => {
    const { container } = render(
      <TokenUsageBadge usage={{ promptTokens: 0, completionTokens: 0, totalTokens: 0 }} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('正确渲染 token 总量与 ARIA 辅助文本', () => {
    render(
      <TokenUsageBadge
        usage={{ promptTokens: 42, completionTokens: 128, totalTokens: 170 }}
      />
    );

    const badge = screen.getByRole('status');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('170');
    expect(badge).toHaveAttribute(
      'aria-label',
      'Token 消耗统计：共 170 tokens（提示词输入 42，回复生成 128）'
    );
  });

  it('当未传 totalTokens 时应自动求和 prompt + completion', () => {
    render(
      <TokenUsageBadge usage={{ promptTokens: 15, completionTokens: 25 }} />
    );

    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('40');
  });
});

describe('ChatErrorBanner 错误提示横幅组件测试', () => {
  it('当 error 为 null 时不应渲染', () => {
    const { container } = render(<ChatErrorBanner error={null} />);
    expect(container.firstChild).toBeNull();
  });

  const testCases: { code: ChatErrorCode; titleSubstr: string }[] = [
    { code: 'AUTH_ERROR', titleSubstr: '鉴权或地区受限' },
    { code: 'RATE_LIMIT', titleSubstr: '请求频率超限' },
    { code: 'NETWORK_ERROR', titleSubstr: '网络连接失败' },
    { code: 'MODEL_ERROR', titleSubstr: '模型服务响应异常' },
    { code: 'ABORTED', titleSubstr: '请求已中断' },
    { code: 'UNKNOWN', titleSubstr: '发生意外错误' },
  ];

  testCases.forEach(({ code, titleSubstr }) => {
    it(`应正确匹配错误码 [${code}] 对应的标题文案`, () => {
      const err = new ChatError('custom error detail', code);
      render(<ChatErrorBanner error={err} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(new RegExp(titleSubstr, 'i'))).toBeInTheDocument();
    });
  });

  it('AUTH_ERROR 时应提供“检查设置”按钮并能触发回调', () => {
    const onOpenSettings = vi.fn();
    const err = new ChatError('PERMISSION_DENIED', 'AUTH_ERROR');

    render(
      <ChatErrorBanner error={err} onOpenSettings={onOpenSettings} />
    );

    const settingsBtn = screen.getByRole('button', { name: /检查设置/i });
    expect(settingsBtn).toBeInTheDocument();
    fireEvent.click(settingsBtn);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('后端模式的 AUTH_ERROR 应引导检查服务端配置，而不展示“检查设置”按钮', () => {
    const err = new ChatError('PERMISSION_DENIED', 'AUTH_ERROR');
    render(<ChatErrorBanner error={err} connectionMode="server" onOpenSettings={vi.fn()} />);

    expect(screen.getByText(/服务端鉴权或地区受限/)).toBeInTheDocument();
    expect(screen.getByText(/GEMINI_API_KEY/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /检查设置/i })).not.toBeInTheDocument();
  });

  it('点击重试按钮应触发 onRetry 回调', () => {
    const onRetry = vi.fn();
    const err = new ChatError('Network issue', 'NETWORK_ERROR');

    render(<ChatErrorBanner error={err} onRetry={onRetry} />);

    const retryBtn = screen.getByRole('button', { name: /重试/i });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('点击关闭按钮应触发 onDismiss 回调', () => {
    const onDismiss = vi.fn();
    const err = new ChatError('Something wrong', 'UNKNOWN');

    render(<ChatErrorBanner error={err} onDismiss={onDismiss} />);

    const closeBtn = screen.getByRole('button', { name: /关闭错误提示/i });
    fireEvent.click(closeBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('default 兜底分支测试', () => {
    // 强制传入未在枚举内定义的异常码以检验 default 兜底分支
    const weirdErr = new ChatError('Fallback message', 'UNRECOGNIZED_CODE' as any);
    render(<ChatErrorBanner error={weirdErr} />);

    expect(screen.getByText(/生成回复失败/i)).toBeInTheDocument();
    expect(screen.getByText(/Fallback message/i)).toBeInTheDocument();
  });
});
