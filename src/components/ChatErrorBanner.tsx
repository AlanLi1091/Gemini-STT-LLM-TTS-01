import React from 'react';
import { AlertCircle, RotateCcw, Settings, X } from 'lucide-react';
import { ChatError, ChatErrorCode, ConnectionMode } from '../types';

export interface ChatErrorBannerProps {
  error: ChatError | null;
  onRetry?: () => void;
  onOpenSettings?: () => void;
  onDismiss?: () => void;
  isRetrying?: boolean;
  connectionMode?: ConnectionMode;
}

interface ErrorDisplayInfo {
  title: string;
  description: string;
  showSettingsBtn: boolean;
}

function resolveErrorInfo(
  code: ChatErrorCode,
  originalMessage: string,
  connectionMode: ConnectionMode,
): ErrorDisplayInfo {
  switch (code) {
    case 'AUTH_ERROR':
      if (connectionMode === 'server') {
        return {
          title: '服务端鉴权或地区受限 (403/401)',
          description:
            '请检查服务端 .env 中的 GEMINI_API_KEY、重启后端服务，并确认当前网络出口位于 Gemini API 支持地区。',
          showSettingsBtn: false,
        };
      }
      return {
        title: '鉴权或地区受限 (403/401)',
        description:
          'API Key 无效、缺失，或当前网络 IP 处于 Google API 未支持的服务区域 (PERMISSION_DENIED)。请检查网络节点代理或在设置中配置有效 Key。',
        showSettingsBtn: true,
      };
    case 'RATE_LIMIT':
      return {
        title: '请求频率超限 (429)',
        description: '已超出模型调用速率限制或配额上限，请稍等片刻后点击重试。',
        showSettingsBtn: false,
      };
    case 'NETWORK_ERROR':
      return {
        title: '网络连接失败',
        description: '无法连接到模型服务网关，请检查当前网络连接或代理配置后重试。',
        showSettingsBtn: false,
      };
    case 'MODEL_ERROR':
      return {
        title: '模型服务响应异常',
        description: originalMessage || '模型返回了不可解析的响应或内容被安全策略过滤。',
        showSettingsBtn: false,
      };
    case 'ABORTED':
      return {
        title: '请求已中断',
        description: '回复生成已被用户或系统取消。',
        showSettingsBtn: false,
      };
    case 'UNKNOWN':
      return {
        title: '发生意外错误',
        description: originalMessage || '遇到未知异常，请稍后重试。',
        showSettingsBtn: false,
      };
    default:
      return {
        title: '生成回复失败',
        description: originalMessage || '服务暂时不可用，请稍后重试。',
        showSettingsBtn: false,
      };
  }
}

export const ChatErrorBanner: React.FC<ChatErrorBannerProps> = ({
  error,
  onRetry,
  onOpenSettings,
  onDismiss,
  isRetrying = false,
  connectionMode = 'direct' as ConnectionMode,
}) => {
  if (!error) {
    return null;
  }

  const { title, description, showSettingsBtn } = resolveErrorInfo(
    error.code,
    error.message,
    connectionMode,
  );

  return (
    <div
      id="chat-error-banner"
      role="alert"
      aria-live="polite"
      className="mx-4 my-2 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-rose-900 dark:text-rose-100 tracking-wide uppercase">
              {title}
            </h4>
            {onDismiss && (
              <button
                id="chat-error-dismiss-btn"
                type="button"
                onClick={onDismiss}
                aria-label="关闭错误提示"
                className="text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-200 p-0.5 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-rose-700 dark:text-rose-300 break-words">
            {description}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {onRetry && (
              <button
                id="chat-error-retry-btn"
                type="button"
                onClick={onRetry}
                disabled={isRetrying}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 transition-colors shadow-xs"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>{isRetrying ? '重试中...' : '重试'}</span>
              </button>
            )}

            {showSettingsBtn && onOpenSettings && (
              <button
                id="chat-error-settings-btn"
                type="button"
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 hover:bg-rose-100/80 dark:hover:bg-rose-900/40 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>检查设置</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
