import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Header } from './components/Header';
import { MessageList } from './components/MessageList';
import { ChatInput, ChatInputHandle } from './components/ChatInput';
import { SettingsModal } from './components/SettingsModal';
import { ChatErrorBanner } from './components/ChatErrorBanner';
import { useChat } from './hooks/useChat';
import { loadSettings } from './settings';
import { ChatAdapter } from './types';
import { RemoteChatAdapter } from './adapters/RemoteChatAdapter';
import {
  archiveSession,
  clearRecentSessionId,
  createSession,
  getSession,
  loadRecentSessionId,
  saveRecentSessionId,
  SessionApiError,
} from './services/sessionApi';

export const App: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [isSessionReady, setIsSessionReady] = useState<boolean>(false);

  useEffect(() => {
    // 读取并清除浏览器里可能残留的旧版直连密钥配置。
    loadSettings();
  }, []);

  const activeAdapter = useMemo<ChatAdapter>(() => new RemoteChatAdapter({ sessionId }), [sessionId]);

  const {
    messages,
    inputText,
    isLoading,
    isGenerating,
    lastError,
    setInputText,
    sendMessage,
    retryFailedSend,
    stopGenerating,
    dismissError,
    replaceMessages,
    clearMessages,
  } = useChat({
    adapter: activeAdapter,
  });

  const inputRef = useRef<ChatInputHandle>(null);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      setIsSessionReady(false);
      try {
        const recentSessionId = loadRecentSessionId();
        let session;
        if (recentSessionId) {
          try {
            session = await getSession(recentSessionId);
          } catch (error) {
            if (!(error instanceof SessionApiError && error.status === 404)) throw error;
          }
        }
        if (!session || session.archivedAt !== undefined) session = await createSession();
        if (cancelled) return;

        saveRecentSessionId(session.id);
        setSessionId(session.id);
        replaceMessages(session.messages);
        setIsSessionReady(true);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to restore chat session:', error);
        setSessionId(undefined);
        replaceMessages([]);
        setIsSessionReady(false);
      }
    };

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, [replaceMessages]);

  const handleClear = async () => {
    if (sessionId) {
      setIsSessionReady(false);
      let archived = false;
      try {
        await archiveSession(sessionId);
        archived = true;
        clearRecentSessionId();
        const newSession = await createSession();
        saveRecentSessionId(newSession.id);
        setSessionId(newSession.id);
        clearMessages();
        inputRef.current?.focus();
        setIsSessionReady(true);
        return;
      } catch (error) {
        console.error('Failed to archive chat session:', error);
        if (archived) {
          setSessionId(undefined);
          setIsSessionReady(false);
        } else {
          setIsSessionReady(true);
        }
        return;
      }
    }

    clearMessages();
    inputRef.current?.focus();
  };

  const isBusy = isLoading || isGenerating || !isSessionReady;

  return (
    <div
      id="chat-app-root"
      className="flex flex-col h-screen h-[100dvh] w-full bg-zinc-50/50 text-zinc-900 antialiased select-none-off"
    >
      {/* 顶部标题栏 */}
      <Header
        subtitle="后端服务（SSE）"
        messageCount={messages.length}
        onClear={handleClear}
        onOpenSettings={() => setIsSettingsOpen(true)}
        disabled={isLoading || isGenerating}
      />

      {/* 错误提示横幅 (Task 9) */}
      <ChatErrorBanner
        error={lastError}
        onRetry={retryFailedSend}
        onDismiss={dismissError}
        isRetrying={isBusy}
      />

      {/* 中间可滚动消息区 */}
      <MessageList
        messages={messages}
        isLoading={isLoading}
        isGenerating={isGenerating}
      />

      {/* 底部输入控制栏 */}
      <ChatInput
        ref={inputRef}
        value={inputText}
        disabled={isLoading || !isSessionReady}
        isGenerating={isGenerating}
        onStop={stopGenerating}
        onChange={(e) => setInputText(e.target.value)}
        onSubmit={() => sendMessage()}
      />

      {/* 后端连接说明 */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default App;
