import React from 'react';
import { Zap } from 'lucide-react';
import { ChatUsage } from '../types';

export interface TokenUsageBadgeProps {
  usage?: ChatUsage;
}

export const TokenUsageBadge: React.FC<TokenUsageBadgeProps> = ({ usage }) => {
  if (!usage) {
    return null;
  }

  const prompt = usage.promptTokens ?? 0;
  const completion = usage.completionTokens ?? 0;
  const total = usage.totalTokens ?? (prompt + completion);

  // 若没有任何有效的 token 计数则不渲染
  if (total <= 0 && prompt <= 0 && completion <= 0) {
    return null;
  }

  const labelText = `Token 消耗统计：共 ${total} tokens（提示词输入 ${prompt}，回复生成 ${completion}）`;

  return (
    <div
      id="token-usage-badge"
      role="status"
      aria-label={labelText}
      title={labelText}
      className="inline-flex items-center gap-1 px-2 py-0.5 mt-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 rounded border border-slate-200/80 dark:border-slate-700/60 select-none"
    >
      <Zap className="w-3 h-3 text-amber-500 shrink-0" aria-hidden="true" />
      <span className="tabular-nums font-mono">{total}</span>
      <span className="text-[10px] text-slate-400 dark:text-slate-500">tok</span>
    </div>
  );
};
