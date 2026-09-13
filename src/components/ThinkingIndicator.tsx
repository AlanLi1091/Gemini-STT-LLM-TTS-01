import React from 'react';
import { Bot } from 'lucide-react';

export const ThinkingIndicator: React.FC = () => {
  return (
    <div
      id="chat-thinking-indicator"
      role="status"
      aria-label="机器人正在思考中"
      className="flex items-start gap-3 flex-row transition-all duration-200"
    >
      <div
        id="chat-thinking-avatar"
        className="w-8 h-8 rounded-lg bg-zinc-200 text-zinc-700 flex items-center justify-center shrink-0 shadow-xs"
      >
        <Bot className="w-4 h-4" aria-hidden="true" />
      </div>
      <div
        id="chat-thinking-bubble"
        className="rounded-2xl rounded-tl-sm px-4 py-3 bg-white border border-zinc-200 text-zinc-600 shadow-xs flex items-center gap-1.5"
      >
        <span className="text-xs font-medium text-zinc-400 mr-1 select-none">思考中</span>
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" />
      </div>
    </div>
  );
};
