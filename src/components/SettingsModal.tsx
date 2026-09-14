import React, { useState, useEffect, useRef } from 'react';
import { Settings, Eye, EyeOff, X, KeyRound, Cpu, Sparkles, Check, AlertCircle } from 'lucide-react';
import { AppSettings, AVAILABLE_GEMINI_MODELS, ProviderType } from '../types';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  // 草稿态状态管理 (Draft-Confirm 模式)
  const [draftProvider, setDraftProvider] = useState<ProviderType>(settings.provider);
  const [draftApiKey, setDraftApiKey] = useState<string>(settings.geminiApiKey);
  const [draftModel, setDraftModel] = useState<string>(settings.geminiModel);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const initialFocusRef = useRef<HTMLButtonElement | null>(null);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);

  // 当弹窗打开时，重置草稿态与错误，并捕获焦点
  useEffect(() => {
    if (isOpen) {
      setDraftProvider(settings.provider);
      setDraftApiKey(settings.geminiApiKey);
      setDraftModel(settings.geminiModel);
      setShowPassword(false);
      setValidationError(null);

      // 异步让焦点落入弹窗内首个交互元素或关闭按钮
      setTimeout(() => {
        initialFocusRef.current?.focus();
      }, 50);
    }
  }, [isOpen, settings]);

  // 监听 ESC 按键关闭弹窗
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 点击保存时执行校验
  const handleSave = () => {
    // 校验规则：provider 切到 gemini 且 key 为空 → 行内提示 + 阻止保存
    if (draftProvider === 'gemini' && !draftApiKey.trim()) {
      setValidationError('切换为 Gemini 模型时，请输入有效的 API Key');
      return;
    }

    setValidationError(null);
    onSave({
      provider: draftProvider,
      geminiApiKey: draftApiKey.trim(),
      geminiModel: draftModel,
    });
    onClose();
  };

  return (
    <div
      id="settings-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        // 点击遮罩区域丢弃草稿并关闭
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        id="settings-modal-container"
        ref={modalContainerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="w-full max-w-md rounded-2xl bg-white border border-zinc-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-2 text-zinc-900">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="text-base font-semibold text-zinc-900 leading-tight">
                模型与调试设置
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">配置对话驱动内核与 API 密钥</p>
            </div>
          </div>
          <button
            ref={initialFocusRef}
            id="settings-modal-close-btn"
            type="button"
            onClick={onClose}
            aria-label="关闭设置面板"
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 表单主体 */}
        <div className="p-5 space-y-4 text-sm">
          {/* Provider 切换 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
              模型提供方 (Provider)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="provider-mock-btn"
                onClick={() => {
                  setDraftProvider('mock');
                  setValidationError(null);
                }}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  draftProvider === 'mock'
                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mock 模拟引擎</span>
              </button>

              <button
                type="button"
                id="provider-gemini-btn"
                onClick={() => {
                  setDraftProvider('gemini');
                }}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  draftProvider === 'gemini'
                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Google Gemini API</span>
              </button>
            </div>
          </div>

          {/* Gemini 设置区（仅在选择 Gemini 或需要填写 key 时活跃，但均可预填） */}
          <div className={`space-y-3 pt-1 transition-opacity ${draftProvider === 'gemini' ? 'opacity-100' : 'opacity-60'}`}>
            {/* Gemini API Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="gemini-api-key-input"
                  className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider"
                >
                  Gemini API Key
                </label>
                <span className="text-[11px] text-zinc-400">仅保存在本地浏览器</span>
              </div>
              <div className="relative flex items-center">
                <div className="absolute left-3 text-zinc-400 pointer-events-none">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="gemini-api-key-input"
                  type={showPassword ? 'text' : 'password'}
                  value={draftApiKey}
                  onChange={(e) => {
                    setDraftApiKey(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="AIzaSy..."
                  autoComplete="off"
                  className="w-full pl-9 pr-10 py-2 text-xs font-mono rounded-xl border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all"
                />
                <button
                  type="button"
                  id="toggle-api-key-visibility-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? '隐藏 API Key' : '显示 API Key'}
                  className="absolute right-2.5 p-1 text-zinc-400 hover:text-zinc-700 rounded-md transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 模型选择 */}
            <div className="space-y-1.5">
              <label
                htmlFor="gemini-model-select"
                className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider"
              >
                Gemini 模型版本
              </label>
              <select
                id="gemini-model-select"
                value={draftModel}
                onChange={(e) => setDraftModel(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all cursor-pointer"
              >
                {AVAILABLE_GEMINI_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 校验错误提示 */}
          {validationError && (
            <div
              id="settings-validation-error"
              className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium animate-in fade-in duration-150"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{validationError}</span>
            </div>
          )}

          {/* 边界提示 (ADR-006) */}
          <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 text-[11px] text-zinc-500 leading-relaxed">
            注意：当前仅支持在 Web Playground 本地调试直连，API Key 将明文存储于浏览器 localStorage，不入 Git 仓库与远端部署。
          </div>
        </div>

        {/* 底部按钮栏 */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-zinc-100 bg-zinc-50/50">
          <button
            id="settings-cancel-btn"
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            id="settings-save-btn"
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>保存配置</span>
          </button>
        </div>
      </div>
    </div>
  );
};
