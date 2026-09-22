import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Header } from './components/Header';
import { MessageList } from './components/MessageList';
import { ChatInput, ChatInputHandle } from './components/ChatInput';
import { SettingsModal } from './components/SettingsModal';
import { ChatErrorBanner } from './components/ChatErrorBanner';
import { useChat } from './hooks/useChat';
import { loadSettings, saveSettings } from './settings';
import { AppSettings, ChatAdapter } from './types';
import { MockChatAdapter } from '@core/adapters/MockChatAdapter';
import { GeminiChatAdapter } from '@core/adapters/GeminiChatAdapter';
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
  // 设置状态管理与弹窗显隐控制 (ADR-006, Task 8)
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [isSessionReady, setIsSessionReady] = useState<boolean>(
    () => loadSettings().connectionMode !== 'server',
  );

  // 根据当前 settings 动态创建对应的 ChatAdapter（UI 绑定层负责实例化，内核不感知 AppSettings）
  const activeAdapter = useMemo<ChatAdapter>(() => {
    if (settings.connectionMode === 'server') {
      return new RemoteChatAdapter({ sessionId });
    }

    if (settings.provider === 'gemini' && settings.geminiApiKey.trim()) {
      return new GeminiChatAdapter({
        apiKey: settings.geminiApiKey.trim(),
        model: settings.geminiModel,
      });
    }
    return new MockChatAdapter();
  }, [sessionId, settings.connectionMode, settings.provider, settings.geminiApiKey, settings.geminiModel]);

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
      if (settings.connectionMode !== 'server') {
        setSessionId(undefined);
        setIsSessionReady(true);
        return;
      }

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
  }, [replaceMessages, settings.connectionMode]);

  const handleClear = async () => {
    if (settings.connectionMode === 'server' && sessionId) {
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

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const isBusy = isLoading || isGenerating || !isSessionReady;
  const subtitle = settings.connectionMode === 'server'
    ? '后端服务（SSE）'
    : settings.provider === 'gemini'
      ? `Gemini (${settings.geminiModel})`
      : 'Web Mock MVP';

  return (
    <div
      id="chat-app-root"
      className="flex flex-col h-screen h-[100dvh] w-full bg-zinc-50/50 text-zinc-900 antialiased select-none-off"
    >
      {/* 顶部标题栏 */}
      <Header
        subtitle={subtitle}
        messageCount={messages.length}
        onClear={handleClear}
        onOpenSettings={() => setIsSettingsOpen(true)}
        disabled={isLoading || isGenerating}
      />

      {/* 错误提示横幅 (Task 9) */}
      <ChatErrorBanner
        error={lastError}
        onRetry={retryFailedSend}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onDismiss={dismissError}
        isRetrying={isBusy}
        connectionMode={settings.connectionMode}
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

      {/* 设置弹窗 (草稿-确认模式，仅在点击保存时落地) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
};

export default App;
