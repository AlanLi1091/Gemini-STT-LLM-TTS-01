// @vitest-environment node
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp, readServerConfig } from '../app';

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map(dir => rm(dir, { recursive: true, force: true }))); });
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'gemini-deploy-')); directories.push(dir);
  await mkdir(join(dir, 'web', 'assets'), { recursive: true });
  await writeFile(join(dir, 'web', 'index.html'), '<!doctype html><h1>Playground</h1>');
  await writeFile(join(dir, 'web', 'assets', 'app.js'), 'console.log("web");');
  await writeFile(join(dir, 'web', '.env'), 'private');
  await writeFile(join(dir, 'server.cjs'), 'private-server');
  return { dir, web: join(dir, 'web') };
}
describe('Task 18 Step 1: 私有生产部署', () => {
  it('默认绑定 loopback 并保留本地 data 目录', () => {
    expect(readServerConfig({})).toEqual({ host: '127.0.0.1', port: 3001, dataDirectory: resolve('data'), staticDirectory: undefined });
  });
  it('接受显式端口、IPv6 loopback 与持久目录', () => {
    expect(readServerConfig({ HOST: '::1', PORT: '3101', SESSION_DATA_DIR: '/var/lib/gemini-chat' })).toMatchObject({ host: '::1', port: 3101, dataDirectory: '/var/lib/gemini-chat' });
  });
  it('拒绝公网监听与非法端口', () => {
    for (const HOST of ['0.0.0.0', '::', 'example.com']) expect(() => readServerConfig({ HOST })).toThrow('loopback');
    for (const PORT of ['0', '', '65536', '3.5', 'oops']) expect(() => readServerConfig({ PORT })).toThrow('PORT');
  });
  it('静态产物缺失时拒绝启动', () => {
    expect(() => readServerConfig({ STATIC_DIRECTORY: '/missing-playground' })).toThrow('Build');
  });
  it('同源首页、静态资源与页面回退正常提供', async () => {
    const { web } = await fixture(); const app = createApp({ staticDirectory: readServerConfig({ STATIC_DIRECTORY: web }).staticDirectory });
    expect((await request(app).get('/').expect(200)).text).toContain('Playground');
    expect((await request(app).get('/assets/app.js').expect(200)).text).toContain('web');
    expect((await request(app).get('/chat').set('Accept', 'text/html').expect(200)).text).toContain('Playground');
    await request(app).get('/chat').set('Accept', 'application/json').expect(404);
    await request(app).get('/missing.js').expect(404);
  });
  it('API 与 SSE 不被静态回退覆盖且隧道 Origin 可访问', async () => {
    const { web } = await fixture(); const app = createApp({ staticDirectory: web, allowedOrigins: ['http://127.0.0.1:18080'], chatStreamSource: async function* () { yield { event: 'done', data: { content: 'done' } }; } });
    await request(app).get('/api/health').expect(200);
    const missing = await request(app).get('/api/missing').expect(404); expect(missing.headers['content-type']).toContain('json');
    const stream = await request(app).post('/api/chat/stream').set('Origin', 'http://127.0.0.1:18080').send({ messages: [{ role: 'user', content: 'hello' }] }).expect(200);
    expect(stream.headers['content-type']).toContain('text/event-stream'); expect(stream.text).toContain('event: done');
    expect(stream.headers['cache-control']).toContain('no-transform');
    await request(app).post('/api/chat/stream').set('Origin', 'https://foreign.example').send({}).expect(403);
  });
  it('不提供点文件、目录穿越或 Web 目录外的服务端产物', async () => {
    const { web } = await fixture(); const app = createApp({ staticDirectory: web });
    for (const path of ['/.env', '/server.cjs', '/%2e%2e/server.cjs']) {
      const response = await request(app).get(path); expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.text).not.toContain('private');
    }
  });
});
