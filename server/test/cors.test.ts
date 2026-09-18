// @vitest-environment node
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { parseAllowedOrigins } from '../cors';

describe('Task 11 Step 3: CORS 白名单与环境隔离', () => {
  it('应清理、过滤并去重 ALLOWED_ORIGINS 中的来源', () => {
    expect(
      parseAllowedOrigins(' http://localhost:3000,https://example.com,,http://localhost:3000 '),
    ).toEqual(['http://localhost:3000', 'https://example.com']);
    expect(parseAllowedOrigins(undefined)).toEqual([]);
  });

  it('无 Origin 的服务间请求应正常通过且不返回跨域许可头', async () => {
    const response = await request(createApp()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('白名单内来源应通过并返回精确的跨域许可头', async () => {
    const origin = 'http://localhost:3000';
    const response = await request(createApp({ allowedOrigins: [origin] }))
      .get('/api/health')
      .set('Origin', origin);

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(origin);
    expect(response.headers.vary).toContain('Origin');
  });

  it('白名单外来源应被拒绝并返回 403', async () => {
    const response = await request(createApp({ allowedOrigins: ['https://allowed.example'] }))
      .get('/api/health')
      .set('Origin', 'https://denied.example');

    expect(response.status).toBe(403);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(response.headers.vary).toContain('Origin');
    expect(response.body).toEqual({ error: 'Origin is not allowed' });
  });

  it('白名单内来源的 OPTIONS 预检应返回 204 与允许的方法和请求头', async () => {
    const origin = 'http://localhost:3000';
    const response = await request(createApp({ allowedOrigins: [origin] }))
      .options('/api/health')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'Content-Type');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(origin);
    expect(response.headers['access-control-allow-methods']).toBe('GET,POST,OPTIONS');
    expect(response.headers['access-control-allow-headers']).toBe('Content-Type');
  });
});
