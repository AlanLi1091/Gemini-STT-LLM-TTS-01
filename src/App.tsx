import React, { useRef, useState, useMemo } from 'react';
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

export const App: React.FC = () => {
  // 设置状态管理与弹窗显隐控制 (ADR-006, Task 8)
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // 根据当前 settings 动态创建对应的 ChatAdapter（UI 绑定层负责实例化，内核不感知 AppSettings）
  const activeAdapter = useMemo<ChatAdapter>(() => {
    if (settings.connectionMode === 'server') {
      return new RemoteChatAdapter();
    }

    if (settings.provider === 'gemini' && settings.geminiApiKey.trim()) {
      return new GeminiChatAdapter({
        apiKey: settings.geminiApiKey.trim(),
        model: settings.geminiModel,
      });
    }
    return new MockChatAdapter();
  }, [settings.connectionMode, settings.provider, settings.geminiApiKey, settings.geminiModel]);

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
    clearMessages,
  } = useChat({
    adapter: activeAdapter,
  });

  const inputRef = useRef<ChatInputHandle>(null);

  const handleClear = () => {
    clearMessages();
    inputRef.current?.focus();
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const isBusy = isLoading || isGenerating;
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
        disabled={isBusy}
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
        disabled={isLoading}
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
