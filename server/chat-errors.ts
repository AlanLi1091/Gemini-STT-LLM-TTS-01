import { ChatError, type ChatErrorCode } from '@core/index';
import { GenerationTimeoutError } from './generation-timeout';
import { SessionArchivedError } from './session-service';
import { SessionNotFoundError, SessionRequestConflictError } from './storage/session-storage';

export type ErrorStage = 'storage' | 'count' | 'model';
export const SAFE_ERROR_MESSAGES: Readonly<Record<ChatErrorCode, string>> = Object.freeze({
  AUTH_ERROR: '模型服务鉴权失败，请检查服务端配置。',
  RATE_LIMIT: '模型请求达到限额，请稍后重试。',
  NETWORK_ERROR: '网络连接失败，请稍后重试。',
  MODEL_ERROR: '模型生成失败，请稍后重试。',
  UNKNOWN: '服务暂时不可用，请稍后重试。',
  ABORTED: '本次请求已取消。',
  REQUEST_CONFLICT: '会话请求正在处理或已发生变化，请稍后重试或刷新会话。',
  CONTEXT_LIMIT: '本轮输入超过上下文预算，请缩短内容后重新发送。',
});
export const STORAGE_ERROR_MESSAGE = '会话读取或保存失败，请稍后重试。';

/** Never use an adapter's message as public text, even for an existing ChatError. */
export function safeStreamError(error: unknown, stage: ErrorStage, code: ChatErrorCode): { code: ChatErrorCode; message: string } {
  if (stage === 'storage') {
    if (error instanceof SessionRequestConflictError) return { code: 'REQUEST_CONFLICT', message: SAFE_ERROR_MESSAGES.REQUEST_CONFLICT };
    if (error instanceof SessionNotFoundError) return { code: 'UNKNOWN', message: 'Chat session was not found.' };
    if (error instanceof SessionArchivedError) return { code: 'UNKNOWN', message: 'Chat session is archived.' };
    return { code: 'UNKNOWN', message: STORAGE_ERROR_MESSAGE };
  }
  if (error instanceof GenerationTimeoutError) return { code: 'MODEL_ERROR', message: '模型生成超时，请稍后重试。' };
  // Preserve only exact local literals, never arbitrary ChatError text.
  if (error instanceof ChatError) {
    const fixedHints: Partial<Record<ChatErrorCode, readonly string[]>> = {
      AUTH_ERROR: ['API Key 中包含不可见的非法字符，请重新复制粘贴。',
        'Gemini API key is required. Please configure your API key.'],
      MODEL_ERROR: ['模型达到生成长度上限但未返回正文，请稍后重新提问。', '模型计数结果无效。'],
    };
    const hint = fixedHints[code]?.find(message => message === error.message);
    if (hint) return { code, message: hint };
  }
  return { code, message: SAFE_ERROR_MESSAGES[code] };
}

const SAFE_NAMES = new Set(['Error', 'TypeError', 'SyntaxError', 'RangeError', 'ReferenceError',
  'URIError', 'EvalError', 'AggregateError', 'AbortError', 'TimeoutError', 'ChatError',
  'ApiError', 'APIError', 'GenerationTimeoutError', 'SessionNotFoundError',
  'SessionArchivedError', 'SessionRequestConflictError', 'DuplicateMessageIdError']);
const SAFE_ERRNOS = new Set(['ENOSPC', 'EDQUOT', 'EACCES', 'EPERM', 'ENOENT', 'EIO', 'EROFS',
  'EMFILE', 'ENFILE', 'EEXIST', 'EINVAL', 'ENOTDIR', 'EISDIR', 'ENOTEMPTY', 'EXDEV',
  'ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'EHOSTUNREACH',
  'ENETUNREACH', 'EPIPE']);
function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}
function httpStatus(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599 ? value : undefined;
}

/** Allowlisted keys AND values; never serialize an Error, message, stack, or URL. */
export function logChatFailure(error: unknown, stage: ErrorStage, code: ChatErrorCode,
  log: (record: string) => void = console.warn): void {
  const record: { stage: ErrorStage; code: ChatErrorCode; name: string; errno?: string; status?: number } = { stage, code, name: 'Error' };
  try {
    const outer = object(error);
    const original = error instanceof ChatError && error.originalError !== undefined ? object(error.originalError) : outer;
    const cause = object(original.cause);
    if (typeof original.name === 'string' && SAFE_NAMES.has(original.name)) record.name = original.name;
    const errno = [original.code, cause.code].find(value => typeof value === 'string' && SAFE_ERRNOS.has(value));
    if (typeof errno === 'string') record.errno = errno;
    const status = [original.status, original.statusCode, outer.status].map(httpStatus).find(value => value !== undefined);
    if (status !== undefined) record.status = status;
  } catch { /* Malformed metadata cannot prevent a safe error response. */ }
  try { log(JSON.stringify(record)); } catch { /* Logging must not alter request/lock semantics. */ }
}
