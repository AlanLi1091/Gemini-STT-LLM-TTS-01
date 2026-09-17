import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MessageSquare, Bot, User, ArrowDown } from 'lucide-react';
import { Message } from '../types';
import { ThinkingIndicator } from './ThinkingIndicator';
import { TokenUsageBadge } from './TokenUsageBadge';

interface MessageListProps {
  messages?: Message[];
  isLoading?: boolean;
  isGenerating?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages = [],
  isLoading = false,
  isGenerating = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState<boolean>(false);
  const prevMessagesLengthRef = useRef<number>(messages.length);
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const rafIdRef = useRef<number | null>(null);

  // 判断滚动条是否在底部区域（距底部 <= 100px 为 Smart Sticky Bottom 吸底阈值）
  const checkIsNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceFromBottom <= 100;
  }, []);

  // 纯容器 API 滚动到底部（全量迁移至 scrollTo / scrollTop，废弃 scrollIntoView）
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = containerRef.current;
    if (!el) return;

    isProgrammaticScrollRef.current = true;
    if (typeof el.scrollTo === 'function') {
      el.scrollTo({
        top: el.scrollHeight,
        behavior,
      });
    } else {
      el.scrollTop = el.scrollHeight;
    }

    // 针对 smooth 或 auto 滚动后释放程序锁，避免误判为用户上滑
    if (behavior === 'smooth') {
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 300);
    } else {
      isProgrammaticScrollRef.current = false;
    }
  }, []);

  // 监听用户滚动事件：仅在非程序滚动时响应用户滚动意图
  const handleScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return;
    const nearBottom = checkIsNearBottom();
    setIsAtBottom(nearBottom);
    setShowScrollBottomBtn(!nearBottom && messages.length > 2);
  }, [checkIsNearBottom, messages.length]);

  // 滚动调度核心：分级滚动与用户守卫
  const lastMessage = messages[messages.length - 1];
  const lastMessageContent = lastMessage?.content;

  useEffect(() => {
    const prevLen = prevMessagesLengthRef.current;
    const currLen = messages.length;
    prevMessagesLengthRef.current = currLen;

    // 场景 A：新消息到达（含用户上滑期间发送新消息 或 初始/清空）
    // 无条件强制 smooth 吸底并重置守卫状态
    if (currLen > prevLen) {
      scrollToBottom('smooth');
      setIsAtBottom(true);
      setShowScrollBottomBtn(false);
      return;
    }

    // 场景 B：仅末条消息 content 变化（流式生成 chunk 高频到达）
    // 仅当用户保持在底部守卫范围内时，使用 requestAnimationFrame 节流 + auto 瞬间跟随吸底
    if (isGenerating && isAtBottom) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(() => {
        scrollToBottom('auto');
        rafIdRef.current = null;
      });
      return;
    }

    // 场景 C：思考态开启（isLoading 变更）且当前在底部守卫内
    if (isLoading && isAtBottom) {
      scrollToBottom('smooth');
    }

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [messages.length, lastMessageContent, isGenerating, isLoading, isAtBottom, scrollToBottom]);

  return (
    <div className="relative flex-1 w-full flex flex-col overflow-hidden">
      <main
        id="chat-message-container"
        ref={containerRef}
        role="log"
        aria-live="polite"
        aria-label="消息列表"
        onScroll={handleScroll}
        className="flex-1 w-full overflow-y-auto px-4 py-6 sm:px-6 scroll-smooth motion-reduce:scroll-auto"
      >
        <div className="max-w-4xl mx-auto min-h-full flex flex-col">
          {messages.length === 0 && !isLoading ? (
            <div
              id="chat-empty-state"
              className="flex-1 flex flex-col items-center justify-center text-center p-8 my-auto select-none"
            >
              <div
                id="chat-empty-icon"
                className="w-14 h-14 rounded-2xl bg-zinc-100 border border-zinc-200/80 flex items-center justify-center text-zinc-400 mb-4 shadow-xs"
              >
                <MessageSquare className="w-7 h-7" aria-hidden="true" />
              </div>
              <h2
                id="chat-empty-title"
                className="text-lg font-semibold text-zinc-800 tracking-tight"
              >
                对话已就绪
              </h2>
              <p
                id="chat-empty-desc"
                className="text-sm text-zinc-500 max-w-sm mt-1.5 leading-relaxed"
              >
                当前处于 Phase 1 本地 Mock 模式。在下方输入框发送任意消息，即可体验对话骨架交互。
              </p>
            </div>
          ) : (
            <div id="chat-messages-stream" className="space-y-4">
              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                const isLast = idx === messages.length - 1;
                const showCursor = isGenerating && !isUser && isLast;
                return (
                  <div
                    key={msg.id}
                    id={`chat-message-${msg.id}`}
                    className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isUser ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-700'
                      }`}
                    >
                      {isUser ? (
                        <User className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Bot className="w-4 h-4" aria-hidden="true" />
                      )}
                    </div>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-xs ${
                        isUser
                          ? 'bg-zinc-900 text-white rounded-tr-sm'
                          : 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {msg.content}
                        {showCursor && (
                          <span
                            id="chat-typing-cursor"
                            data-testid="chat-typing-cursor"
                            aria-hidden="true"
                            className="inline-block w-1.5 h-3.5 ml-1 bg-zinc-600 animate-pulse align-middle rounded-xs"
                          />
                        )}
                      </p>
                      {!isUser && msg.usage && (
                        <div>
                          <TokenUsageBadge usage={msg.usage} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {isLoading && <ThinkingIndicator />}
            </div>
          )}
        </div>
      </main>

      {/* 悬浮「回到底部」按钮 */}
      {showScrollBottomBtn && (
        <button
          id="chat-scroll-bottom-button"
          type="button"
          onClick={() => scrollToBottom('smooth')}
          aria-label="回到底部"
          className="absolute bottom-4 right-6 sm:right-10 z-10 inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/95 text-zinc-700 text-xs font-medium shadow-md border border-zinc-200/80 hover:bg-zinc-50 hover:text-zinc-900 transition-all duration-150 backdrop-blur-sm active:scale-95 cursor-pointer"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>回到底部</span>
        </button>
      )}
    </div>
  );
};
