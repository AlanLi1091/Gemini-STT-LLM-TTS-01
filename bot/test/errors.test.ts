// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { BackendError, describeFailure, startupFailureMessage } from '../errors';
describe('Task 17 Step 2: 安全错误反馈', () => {
  it('后端错误不透传任意原文', () => { expect(describeFailure(new BackendError('fake-secret', 'AUTH_ERROR'))).toEqual({ kind: 'AUTH_ERROR', message: expect.stringContaining('鉴权') }); });
  it('识别 Discord 权限错误', () => { expect(describeFailure({ code: 50013, message: 'fake-secret' }).message).toContain('权限'); });
  it('识别已删除消息或不可用频道', () => { expect(describeFailure({ code: 10008 }).message).toContain('原消息'); expect(describeFailure({ code: 10003 }).message).toContain('频道'); });
  it('未知错误和启动失败不泄露原文', () => { expect(describeFailure(new Error('fake-secret')).message).not.toContain('fake-secret'); expect(startupFailureMessage(new Error('fake-secret'))).not.toContain('fake-secret'); });
});

describe('P0-1: Bot 超限固定文案', () => {
  it('CONTEXT_LIMIT 不透传服务端原文且明确要求缩短输入', () => {
    const failure = describeFailure(new BackendError('raw-secret', 'CONTEXT_LIMIT'));
    expect(failure.kind).toBe('CONTEXT_LIMIT'); expect(failure.message).toBe('本轮输入过长，请缩短内容后重新提问。');
  });
});
