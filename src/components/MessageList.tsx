import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MessageSquare, Bot, User, ArrowDown } from 'lucide-react';
import { Message } from '../types';
import { ThinkingIndicator } from './ThinkingIndicator';

interface MessageListProps {
  messages?: Message[];
  isLoading?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages = [],
  isLoading = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState<boolean>(false);
  const prevMessagesLengthRef = useRef<number>(messages.length);

  // 判断滚动条是否在底部（距底部 <= 24px）
  const checkIsAtBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceFromBottom <= 24;
  }, []);

  // 平滑滚动到底部
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (bottomAnchorRef.current?.scrollIntoView) {
      bottomAnchorRef.current.scrollIntoView({ behavior, block: 'end' });
    } else if (typeof containerRef.current?.scrollTo === 'function') {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior,
      });
    } else if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  // 监听用户滚动事件，检测当前是否在底部
  const handleScroll = useCallback(() => {
    const atBottom = checkIsAtBottom();
    setIsAtBottom(atBottom);
    setShowScrollBottomBtn(!atBottom && messages.length > 2);
  }, [checkIsAtBottom, messages.length]);

  // 智能滚动调度（方案 A）
  useEffect(() => {
    const prevLen = prevMessagesLengthRef.current;
    const currLen = messages.length;
    prevMessagesLengthRef.current = currLen;

    // 用户新增发送消息（最后一条为 user）：无条件平滑触底
    if (currLen > prevLen) {
      const lastMsg = messages[currLen - 1];
      if (lastMsg && lastMsg.role === 'user') {
        scrollToBottom('smooth');
        setIsAtBottom(true);
        setShowScrollBottomBtn(false);
        return;
      }
    }

    // 思考态或助手回复到达：仅在"在底部"时跟随滚动，不打断翻阅
    if (isAtBottom) {
      scrollToBottom('smooth');
    }
  }, [messages, isLoading, isAtBottom, scrollToBottom]);

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
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
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
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                  </div>
                );
              })}
              {isLoading && <ThinkingIndicator />}
              {/* 触底锚点 */}
              <div ref={bottomAnchorRef} className="h-0 w-0" aria-hidden="true" />
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
