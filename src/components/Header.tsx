import React, { useState } from 'react';
import { Bot, Sparkles, Trash2, AlertCircle, Settings } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  messageCount?: number;
  onClear?: () => void;
  onOpenSettings?: () => void;
  disabled?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Chatbot Playground',
  subtitle = 'Web Mock MVP',
  messageCount = 0,
  onClear,
  onOpenSettings,
  disabled = false,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <header
      id="chat-header"
      className="w-full border-b border-zinc-200 bg-white/80 backdrop-blur-sm px-4 py-3 sm:px-6 sticky top-0 z-10 transition-colors"
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            id="chat-header-icon-container"
            className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs"
          >
            <Bot className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h1
              id="chat-header-title"
              className="text-base font-semibold text-zinc-900 tracking-tight leading-none"
            >
              {title}
            </h1>
            <p
              id="chat-header-desc"
              className="text-xs text-zinc-500 mt-1 font-medium"
            >
              角色扮演对话机器人 · 调试控制台
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span
            id="chat-header-status-badge"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <Sparkles className="w-3 h-3 text-emerald-600" aria-hidden="true" />
            <span>{subtitle}</span>
          </span>

          {/* 设置入口按钮 */}
          <button
            id="settings-button"
            type="button"
            disabled={disabled}
            onClick={onOpenSettings}
            aria-label="设置"
            title="模型与调试设置"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 border border-zinc-200 transition-all disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-zinc-700 disabled:cursor-not-allowed cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">设置</span>
          </button>

          {/* 清空对话按钮（带确认交互） */}
          {showConfirm ? (
            <div
              id="chat-clear-confirm-group"
              className="flex items-center gap-1.5 bg-red-50 border border-red-200/80 rounded-lg p-1 animate-in fade-in duration-150"
            >
              <span className="text-xs text-red-600 font-medium px-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                确认清空？
              </span>
              <button
                id="chat-confirm-clear-btn"
                type="button"
                onClick={() => {
                  setShowConfirm(false);
                  if (onClear) onClear();
                }}
                className="px-2 py-0.5 text-xs font-semibold bg-red-600 text-white rounded hover:bg-red-700 transition-colors cursor-pointer"
              >
                确定
              </button>
              <button
                id="chat-cancel-clear-btn"
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-2 py-0.5 text-xs text-zinc-600 hover:bg-zinc-200/60 rounded transition-colors cursor-pointer"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              id="chat-clear-button"
              type="button"
              aria-label="清空对话"
              disabled={disabled || messageCount === 0}
              onClick={() => setShowConfirm(true)}
              title="清空当前对话记录"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:text-red-600 hover:bg-red-50/60 border border-zinc-200 hover:border-red-200 transition-all disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-zinc-600 disabled:hover:border-zinc-200 disabled:cursor-not-allowed cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>清空对话</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
