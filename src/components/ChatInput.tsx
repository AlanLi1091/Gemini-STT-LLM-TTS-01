import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Send, Square } from 'lucide-react';

interface ChatInputProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit?: (e: React.FormEvent) => void;
  disabled?: boolean;
  isGenerating?: boolean;
  onStop?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export interface ChatInputHandle {
  focus: () => void;
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(({
  value = '',
  onChange,
  onSubmit,
  disabled = false,
  isGenerating = false,
  onStop,
  placeholder = '输入消息，与机器人对话...',
  autoFocus = true,
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isTrimmedEmpty = value.trim().length === 0;
  const isSendDisabled = disabled || isTrimmedEmpty;

  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
    },
  }));

  // 自动根据内容伸缩高度（1~6 行，超出内部滚动）
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    // 1 行约 24px (line-height) + padding 16px = 40px；6 行约 24*6 + 16 = 160px
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 40), 160);
    textarea.style.height = `${newHeight}px`;
  }, [value]);

  // 初始与启用时自动聚焦
  useEffect(() => {
    if (autoFocus && !disabled) {
      textareaRef.current?.focus();
    }
  }, [autoFocus, disabled]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTrimmedEmpty || disabled) {
      return;
    }
    if (onSubmit) {
      onSubmit(e);
    }
    // 提交后保持聚焦
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 硬性约束：跳过 IME 组合输入态（如中文拼音输入法敲回车选词不发送）
    const isComposing =
      e.nativeEvent?.isComposing ||
      (e as unknown as { isComposing: boolean }).isComposing ||
      e.keyCode === 229 ||
      e.which === 229;

    if (isComposing) {
      return;
    }

    // Enter 发送；Shift + Enter 换行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isSendDisabled) {
        handleSubmit(e);
      }
    }
  };

  return (
    <footer
      id="chat-input-footer"
      className="w-full border-t border-zinc-200 bg-white/90 backdrop-blur-sm px-4 py-3 sm:px-6 sticky bottom-0 z-10"
    >
      <div className="max-w-4xl mx-auto">
        <form
          id="chat-input-form"
          onSubmit={handleSubmit}
          className="relative flex items-end gap-2 bg-zinc-50 border border-zinc-300 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-zinc-900/10 focus-within:border-zinc-400 focus-within:bg-white transition-all shadow-2xs"
          aria-label="消息发送表单"
        >
          <div className="relative flex-1">
            <textarea
              id="chat-message-input"
              ref={textareaRef}
              rows={1}
              value={value}
              onChange={onChange ?? (() => {})}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              autoComplete="off"
              aria-label="输入消息"
              className="w-full max-h-40 min-h-[40px] bg-transparent px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none disabled:cursor-not-allowed disabled:text-zinc-400 resize-none overflow-y-auto leading-relaxed"
            />
          </div>

          {isGenerating ? (
            <button
              id="chat-stop-button"
              type="button"
              onClick={onStop}
              aria-label="停止生成"
              title="停止生成当前回复"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-red-700 active:scale-[0.98] transition-all shrink-0 cursor-pointer h-10 mb-0.5"
            >
              <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              <span className="hidden sm:inline">停止</span>
            </button>
          ) : (
            <button
              id="chat-send-button"
              type="submit"
              disabled={isSendDisabled}
              aria-label="发送消息"
              title={disabled ? '机器人正在思考，请稍候...' : '按 Enter 发送，Shift + Enter 换行'}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-zinc-800 active:scale-[0.98] transition-all disabled:opacity-40 disabled:hover:bg-zinc-900 disabled:cursor-not-allowed shrink-0 cursor-pointer h-10 mb-0.5"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">发送</span>
            </button>
          )}
        </form>

        <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1 mt-2 select-none">
          <span>Shift + Enter 换行 · Enter 发送</span>
          <span>Chatbot Playground</span>
        </div>
      </div>
    </footer>
  );
});

ChatInput.displayName = 'ChatInput';
