// @vitest-environment node
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { CORE_VERSION } from '@core/index';

describe('Task 11 Step 1: 服务端 Express 骨架与双环境测试', () => {
  it('应当在真实的 Node.js 环境下运行测试（window 为 undefined）', () => {
    expect((globalThis as any).window).toBeUndefined();
    expect(typeof process).toBe('object');
    expect(process.versions?.node).toBeDefined();
  });

  it('GET / 应返回 200 状态码并输出服务信息与 @core 版本号', async () => {
    const app = createApp();
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'gemini-chat-server',
      coreVersion: CORE_VERSION,
    });
  });

  it('访问不存在的路由应当返回 404', async () => {
    const app = createApp();
    const response = await request(app).get('/api/not-found');

    expect(response.status).toBe(404);
  });
});
