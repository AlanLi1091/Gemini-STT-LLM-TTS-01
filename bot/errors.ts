import { RESTJSONErrorCodes } from 'discord.js';
export type FailureKind = 'AUTH_ERROR' | 'RATE_LIMIT' | 'NETWORK_ERROR' | 'MODEL_ERROR' | 'CONTEXT_LIMIT' | 'REQUEST_CONFLICT' | 'ABORTED' | 'TIMEOUT' | 'PROTOCOL' | 'BACKEND' | 'DISCORD_PERMISSION' | 'DISCORD_MESSAGE' | 'DISCORD_CHANNEL' | 'DISCORD_SEND' | 'UNEXPECTED';
export class BackendError extends Error {
  constructor(message: string, readonly kind: FailureKind = 'BACKEND', readonly operation?: 'reset') { super(message); this.name = 'BackendError'; }
}
const messages: Record<FailureKind, string> = {
  REQUEST_CONFLICT: '频道会话仍在处理中，请稍后重试。',
  CONTEXT_LIMIT: '本轮输入过长，请缩短内容后重新提问。',
  AUTH_ERROR: '模型服务鉴权失败，请检查服务端配置。',
  RATE_LIMIT: '模型请求达到限额，请稍后再试。',
  NETWORK_ERROR: '后端连接失败，请检查服务和网络后再试。',
  MODEL_ERROR: '模型生成失败，请稍后重新提问。',
  ABORTED: '本次请求已取消。',
  TIMEOUT: '对话请求超时，请检查后端服务。',
  PROTOCOL: '后端回复格式异常或不完整，本次请求未自动重发。',
  BACKEND: '后端对话失败，请检查服务状态后再试。',
  DISCORD_PERMISSION: 'Discord 发送权限不足，请检查 Bot 的频道权限。',
  DISCORD_MESSAGE: '原消息已不可用，回复发送失败；请重新提问。',
  DISCORD_CHANNEL: '频道已不可用，回复发送失败。',
  DISCORD_SEND: 'Discord 回复发送失败，请稍后重新提问。',
  UNEXPECTED: '本次消息处理失败，请稍后重新提问。',
};
export function describeFailure(error: unknown, sending = false): { kind: FailureKind; message: string } {
  let kind: FailureKind = sending ? 'DISCORD_SEND' : 'UNEXPECTED';
  if (error instanceof BackendError) kind = error.kind;
  else if (error && typeof error === 'object') {
    const code = (error as { code?: unknown }).code;
    if (code === RESTJSONErrorCodes.MissingAccess || code === RESTJSONErrorCodes.MissingPermissions) kind = 'DISCORD_PERMISSION';
    else if (code === RESTJSONErrorCodes.UnknownMessage) kind = 'DISCORD_MESSAGE';
    else if (code === RESTJSONErrorCodes.UnknownChannel) kind = 'DISCORD_CHANNEL';
  }
  const message = error instanceof BackendError && error.operation === 'reset' && kind !== 'REQUEST_CONFLICT'
    ? `未确认频道会话重置完成。${messages[kind]}请检查频道状态后再决定是否重试。`
    : messages[kind];
  return { kind, message };
}
export function startupFailureMessage(_error: unknown): string {
  return 'Bot 启动失败；请检查本地 Token、频道 ID、管理员名单、后端地址、调度配置及网络。';
}
