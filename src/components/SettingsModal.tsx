import React, { useEffect, useRef } from 'react';
import { Server, Settings, X } from 'lucide-react';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const focusTimer = setTimeout(() => closeButtonRef.current?.focus(), 50);
    return () => clearTimeout(focusTimer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="settings-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        id="settings-modal-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="w-full max-w-md rounded-2xl bg-white border border-zinc-200 shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-2 text-zinc-900">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <h2 id="settings-modal-title" className="text-base font-semibold">后端连接信息</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="关闭设置面板"
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm text-zinc-700">
          <p className="flex items-center gap-2 font-medium"><Server className="w-4 h-4" />Playground 通过后端服务连接。</p>
          <p className="text-xs leading-relaxed">模型与 API Key 由服务端配置。浏览器不读取、输入或保存密钥。</p>
          <p className="text-xs leading-relaxed">如遇鉴权错误，请检查服务端环境变量与网络地区。</p>
        </div>
      </div>
    </div>
  );
};
