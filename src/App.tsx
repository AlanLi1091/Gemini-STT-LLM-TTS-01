import React, { useRef } from 'react';
import { Header } from './components/Header';
import { MessageList } from './components/MessageList';
import { ChatInput, ChatInputHandle } from './components/ChatInput';
import { useChat } from './hooks/useChat';

export const App: React.FC = () => {
  const { messages, inputText, isLoading, setInputText, sendMessage, clearMessages } = useChat();
  const inputRef = useRef<ChatInputHandle>(null);

  const handleClear = () => {
    clearMessages();
    inputRef.current?.focus();
  };

  return (
    <div
      id="chat-app-root"
      className="flex flex-col h-screen h-[100dvh] w-full bg-zinc-50/50 text-zinc-900 antialiased select-none-off"
    >
      {/* 顶部标题栏 */}
      <Header
        messageCount={messages.length}
        onClear={handleClear}
        disabled={isLoading}
      />

      {/* 中间可滚动消息区 */}
      <MessageList messages={messages} isLoading={isLoading} />

      {/* 底部输入控制栏 */}
      <ChatInput
        ref={inputRef}
        value={inputText}
        disabled={isLoading}
        onChange={(e) => setInputText(e.target.value)}
        onSubmit={() => sendMessage()}
      />
    </div>
  );
};

export default App;
