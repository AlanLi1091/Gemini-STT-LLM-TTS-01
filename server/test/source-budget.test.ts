// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ChatError, type ChatAdapter, type ChatStreamRequest, type ChatSseEvent } from '@core/index';
import { createChatStreamSourceFromEnv, createSessionChatStreamSource } from '../chat-adapter-stream-source';
import type { ChatStreamSource } from '../chat-stream';
import { JsonSessionStorage } from '../storage/json-session-storage';
import { SessionService } from '../session-service';
import { SourceRequestBudget } from '../request-budget';
import { ContextWindow } from '../context-window';

const sdkStream = vi.hoisted(() => vi.fn());
const sdkCount = vi.hoisted(() => vi.fn());
vi.mock('@google/genai', () => ({ GoogleGenAI: class { models = { generateContentStream: sdkStream, countTokens: sdkCount }; } }));
let directory: string;
let storage: JsonSessionStorage;
let service: SessionService;
let web: string;
let discord: string;
let otherDiscord: string;
beforeEach(async () => {
  vi.useFakeTimers(); vi.setSystemTime(0); vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  directory = await mkdtemp(join(tmpdir(), 'p17-source-budget-'));
  storage = new JsonSessionStorage(directory); service = new SessionService(storage);
  web = (await service.createSession()).id;
  discord = (await storage.resolveDiscordSession('111111111111111111', '222222222222222222')).id;
  otherDiscord = (await storage.resolveDiscordSession('111111111111111111', '333333333333333333')).id;
  sdkStream.mockImplementation(async () => (async function* () { yield { text: 'ok' }; })());
  sdkCount.mockResolvedValue({ totalTokens: 100 });
});
afterEach(async () => { vi.useRealTimers(); vi.restoreAllMocks(); await rm(directory, { recursive: true }); });
const request = (sessionId: string, content = 'hi', requestId = randomUUID()): ChatStreamRequest => ({
  sessionId, requestId, messages: [{ role: 'user', content }],
});
async function collect(source: ChatStreamSource, input: ChatStreamRequest) {
  const events: ChatSseEvent[] = [];
  for await (const event of source(input, { signal: new AbortController().signal })) events.push(event);
  return events;
}
const last = (events: ChatSseEvent[]) => events.at(-1);
function adapter(): ChatAdapter {
  return { id: 'fixture', name: 'Fixture', send: async () => ({ content: 'ok' }),
    stream: vi.fn(async function* () { yield { delta: '', accumulated: 'ok', done: true }; }),
  };
}
function generationBudget(limit = 10, reserved = 4) {
  return new SourceRequestBudget({ requestsPerMinute: limit, sourceLimits: { discord: limit - reserved } });
}

describe('P1-7: 持久化来源与生产预算装配', () => {
  it('多个 Discord 频道共享六次额度且无法挤占 Web 四次保留额度', async () => {
    const source = createChatStreamSourceFromEnv({ GEMINI_API_KEY: 'fake' }, { sessionService: service });
    for (let i = 0; i < 6; i++) expect(last(await collect(source, request(i % 2 ? discord : otherDiscord)))?.event).toBe('done');
    const before = await storage.getSession(discord);
    for (let i = 0; i < 3; i++) expect(last(await collect(source, request(discord)))).toMatchObject({ event: 'error', data: { error: { code: 'RATE_LIMIT', message: '模型请求预算已满或暂时暂停，请等待 60 秒后再试。' } } });
    expect(await storage.getSession(discord)).toEqual(before);
    for (let i = 0; i < 4; i++) expect(last(await collect(source, request(web)))?.event).toBe('done');
    expect(last(await collect(source, request(web)))).toMatchObject({ event: 'error', data: { error: { code: 'RATE_LIMIT' } } });
    expect(sdkStream).toHaveBeenCalledTimes(10);
    await vi.advanceTimersByTimeAsync(60000);
    expect(last(await collect(source, request(discord)))?.event).toBe('done');
  });
  it('Web 可以使用全部全局额度，Web 加 Discord 总量不超过上限', async () => {
    const source = createChatStreamSourceFromEnv({ GEMINI_API_KEY: 'fake' }, { sessionService: service });
    for (let i = 0; i < 8; i++) expect(last(await collect(source, request(web)))?.event).toBe('done');
    for (let i = 0; i < 2; i++) expect(last(await collect(source, request(discord)))?.event).toBe('done');
    expect(last(await collect(source, request(discord)))).toMatchObject({ event: 'error', data: { error: { code: 'RATE_LIMIT' } } });
    expect(last(await collect(source, request(web)))).toMatchObject({ event: 'error', data: { error: { code: 'RATE_LIMIT' } } });
    await vi.advanceTimersByTimeAsync(60000);
    for (let i = 0; i < 10; i++) expect(last(await collect(source, request(web)))?.event).toBe('done');
    expect(last(await collect(source, request(discord)))).toMatchObject({ event: 'error', data: { error: { code: 'RATE_LIMIT' } } });
    expect(sdkStream).toHaveBeenCalledTimes(20);
  });
  it('请求体伪造 web 来源无法绕过持久化 Discord 来源，旧会话无 origin 按 web', async () => {
    const budget = generationBudget(2, 1); const acquire = vi.spyOn(budget, 'acquire');
    const model = adapter(); const source = createSessionChatStreamSource(model, service, budget);
    const forged = { ...request(discord), origin: { type: 'web' }, source: 'web', guildId: 'forged' };
    expect(last(await collect(source, forged))?.event).toBe('done');
    expect(last(await collect(source, { ...forged, requestId: randomUUID() }))).toMatchObject({ event: 'error', data: { error: { code: 'RATE_LIMIT' } } });
    const legacy = { ...(await storage.getSession(web))! }; delete legacy.origin;
    await writeFile(join(directory, `${web}.json`), JSON.stringify(legacy));
    const forgedLegacy = { ...request(web), origin: { type: 'discord' } };
    expect(last(await collect(source, forgedLegacy))?.event).toBe('done');
    expect(acquire.mock.calls).toEqual([['discord'], ['discord'], ['web']]);
    expect(model.stream).toHaveBeenCalledTimes(2);
  });
  it('Discord 上游429全局暂停生成，另一来源暂停期间不写输入且到期恢复', async () => {
    const budget = generationBudget(); const pause = vi.spyOn(budget, 'pause');
    const source = createChatStreamSourceFromEnv({ GEMINI_API_KEY: 'fake' }, { sessionService: service, requestBudget: budget });
    sdkStream.mockRejectedValueOnce({ status: 429, message: 'AIzaFAKE_RATE_KEY' });
    expect(last(await collect(source, request(discord)))).toMatchObject({ event: 'error', data: { error: { code: 'RATE_LIMIT', message: '模型请求达到限额，请稍后重试。' } } });
    expect(pause).toHaveBeenCalledOnce();
    expect(last(await collect(source, request(web)))).toMatchObject({ event: 'error', data: { error: { code: 'RATE_LIMIT' } } });
    expect((await storage.getSession(web))!.messages).toEqual([]); expect(sdkStream).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(60000);
    expect(last(await collect(source, request(web)))?.event).toBe('done');
  });
  it('回放与两种冲突不调用预算或追加输入，重复预算拒绝不占用Web额度', async () => {
    const budget = generationBudget(2, 1); const acquire = vi.spyOn(budget, 'acquire');
    const model = adapter(); const count = vi.fn(async () => 100); model.countTokens = count;
    const source = createSessionChatStreamSource(model, service, budget);
    const original = request(discord); expect(last(await collect(source, original))?.event).toBe('done');
    const before = await storage.getSession(discord);
    acquire.mockClear();
    expect(last(await collect(source, original))?.event).toBe('done');
    expect(last(await collect(source, { ...original, messages: [{ role: 'user', content: 'changed' }] }))).toMatchObject({ event: 'error', data: { error: { code: 'REQUEST_CONFLICT' } } });
    const release = service.tryAcquireRequest(discord)!;
    expect(last(await collect(source, request(discord)))).toMatchObject({ event: 'error', data: { error: { code: 'REQUEST_CONFLICT' } } }); release();
    expect(acquire).not.toHaveBeenCalled(); expect(count).not.toHaveBeenCalled();
    for (let i = 0; i < 3; i++) expect(last(await collect(source, request(discord)))).toMatchObject({ event: 'error', data: { error: { code: 'RATE_LIMIT' } } });
    expect(await storage.getSession(discord)).toEqual(before);
    expect(last(await collect(source, request(web)))?.event).toBe('done'); expect(model.stream).toHaveBeenCalledTimes(2);
  });
  it('Discord 生成超时不暂停预算且 Web 可立即使用保留额度', async () => {
    const budget = generationBudget(2, 1); const pause = vi.spyOn(budget, 'pause');
    let notifyStarted!: () => void; const started = new Promise<void>(resolve => { notifyStarted = resolve; });
    const model = adapter(); vi.mocked(model.stream).mockImplementationOnce(async function* () { notifyStarted(); await new Promise<void>(() => undefined); });
    const source = createSessionChatStreamSource(model, service, budget, undefined, { firstChunkTimeoutMs: 5, totalTimeoutMs: 10 });
    const pending = collect(source, request(discord)); await started; await vi.advanceTimersByTimeAsync(5);
    expect(last(await pending)).toMatchObject({ event: 'error', data: { error: { code: 'MODEL_ERROR', message: '模型生成超时，请稍后重试。' } } });
    expect(pause).not.toHaveBeenCalled(); expect(last(await collect(source, request(web)))?.event).toBe('done');
  });
  it('生产计数预算保留八次给 Web，Discord 用满十二次后仅本地降级', async () => {
    const source = createChatStreamSourceFromEnv({ GEMINI_API_KEY: 'fake', CHAT_CONTEXT_INPUT_TOKENS: '1000', GEMINI_REQUESTS_PER_MINUTE: '20' }, { sessionService: service });
    // Seed enough eligible turns to exercise both permitted counts per selection.
    for (let i = 0; i < 9; i++) await service.appendTurnInputs(discord, [{ role: 'user', content: 'h'.repeat(300) }]);
    for (let i = 0; i < 6; i++) expect(last(await collect(source, request(discord, 'x'.repeat(300))))?.event).toBe('done');
    expect(sdkCount).toHaveBeenCalledTimes(12);
    expect(last(await collect(source, request(discord, 'x'.repeat(300))))?.event).toBe('done');
    expect(sdkCount).toHaveBeenCalledTimes(12);
    for (let i = 0; i < 8; i++) expect(last(await collect(source, request(web, 'x'.repeat(400))))?.event).toBe('done');
    expect(sdkCount).toHaveBeenCalledTimes(20);
    // Both sources now degrade without a further SDK count; generation remains usable.
    expect(last(await collect(source, request(web, 'x'.repeat(300))))?.event).toBe('done');
    expect(sdkCount).toHaveBeenCalledTimes(20);
  });
  it('计数429全局暂停计数但不暂停任一来源生成并继续既有窗口降级', async () => {
    const generation = generationBudget(); const countBudget = new SourceRequestBudget({ requestsPerMinute: 20, sourceLimits: { discord: 12 } });
    const generationPause = vi.spyOn(generation, 'pause'); const countPause = vi.spyOn(countBudget, 'pause');
    const model = adapter(); const counter = vi.fn().mockRejectedValueOnce(new ChatError('AIzaFAKE_COUNT_KEY', 'RATE_LIMIT', { status: 429 })); model.countTokens = counter;
    const window = new ContextWindow({ inputTokens: 1000 }, { countBudget, log: vi.fn() });
    const source = createSessionChatStreamSource(model, service, generation, window);
    expect(last(await collect(source, request(discord, 'x'.repeat(300))))?.event).toBe('done');
    // First turn below the edge; second turn invokes the counter and falls back.
    expect(last(await collect(source, request(discord, 'x'.repeat(300))))?.event).toBe('done');
    expect(countPause).toHaveBeenCalledOnce(); expect(generationPause).not.toHaveBeenCalled();
    expect(last(await collect(source, request(web, 'x'.repeat(300))))?.event).toBe('done');
    expect(last(await collect(source, request(web, 'x'.repeat(300))))?.event).toBe('done');
    expect(counter).toHaveBeenCalledOnce(); expect(model.stream).toHaveBeenCalledTimes(4);
  });
});
