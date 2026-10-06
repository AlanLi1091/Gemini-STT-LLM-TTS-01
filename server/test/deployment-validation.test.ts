// @vitest-environment node
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
const exec = promisify(execFile);
const folders: string[] = [];
const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve()))));
  await Promise.all(folders.splice(0).map(folder => rm(folder, { recursive: true, force: true })));
});
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'gemini-validation-')); folders.push(dir);
  const bin = join(dir, 'bin'); await mkdir(bin);
  await writeFile(join(dir,'boot'), 'boot-a');
  await writeFile(join(bin,'systemctl'), '#!/bin/sh\ncat "$FIXTURE_DIR/unit"\n', { mode:0o755 });
  await writeFile(join(bin,'journalctl'), '#!/bin/sh\ncat "$FIXTURE_DIR/journal"\n', { mode:0o755 });
  await writeFile(join(dir,'unit'), 'ActiveState=active\nSubState=running\nMainPID=123\nNRestarts=0\nInvocationID=instance-a\nMemoryCurrent=1024\n');
  const monotonic = Number((await exec('/usr/bin/python3',['-c','import time; print(time.monotonic())'])).stdout);
  const journal = [
    { MESSAGE:'[bot] shard ready shard=0', __MONOTONIC_TIMESTAMP:'0', _SYSTEMD_INVOCATION_ID:'instance-a', __CURSOR:'cursor-a' },
    { MESSAGE:'[bot] memory rssMiB=1.0 heapUsedMiB=1.0', _SYSTEMD_INVOCATION_ID:'instance-a', __MONOTONIC_TIMESTAMP:String(Math.floor(monotonic*1000000)), __CURSOR:'cursor-b' },
  ];
  await writeFile(join(dir,'journal'), journal.map(e => JSON.stringify(e)).join('\n'));
  const server=createServer((_req,res) => {res.setHeader('Content-Type','application/json');res.end(JSON.stringify({status:'ok',service:'gemini-chat-server'}));});
  servers.push(server); await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve));
  const port=(server.address() as {port:number}).port;
  const env={...process.env,PATH:bin+':'+process.env.PATH,FIXTURE_DIR:dir,VALIDATION_DIR:join(dir,'records'),VALIDATION_BOOT_FILE:join(dir,'boot'),VALIDATION_HEALTH_URL:`http://127.0.0.1:${port}/api/health`};
  const run=async (mode='--sample') => JSON.parse((await exec('sh',[resolve('deploy/validate-online.sh'),mode],{env})).stdout);
  const record=(time:number,healthy=true,boot='boot-a',invocation='instance-a') => ({utc:'fixture',monotonic_s:time,healthy,boot,server:{invocation,active:true,pid:123},bot:{invocation,active:true,pid:123}});
  const setRecords=async (rows: unknown[]) => {await mkdir(env.VALIDATION_DIR,{recursive:true});await writeFile(join(env.VALIDATION_DIR,'samples.jsonl'),rows.map(r => JSON.stringify(r)).join('\n')+'\n');};
  return {dir,env,run,monotonic,journal,record,setRecords};
}
describe('Task 18 Step 2: online validation', () => {
  it('records real health and gateway metadata without raw logs or secrets', async () => {
    const f=await fixture(); await writeFile(join(f.dir,'journal'), (await readFile(join(f.dir,'journal'),'utf8'))+'\n'+JSON.stringify({MESSAGE:'fake-secret',_SYSTEMD_INVOCATION_ID:'instance-a'}));
    const sample=await f.run(); expect(sample.healthy).toBe(true); expect(sample.rss_mib).toBe(1); expect(sample.heap_used_mib).toBe(1);
    expect(await readFile(join(f.env.VALIDATION_DIR,'samples.jsonl'),'utf8')).not.toContain('fake-secret');
  });
  it('does not pass when HTTP health is unavailable', async () => {
    const f=await fixture(); f.env.VALIDATION_HEALTH_URL='http://127.0.0.1:1/api/health';
    expect((await f.run()).healthy).toBe(false);
  });
  it('does not pass when the process is inactive or metadata collection fails', async () => {
    const f=await fixture(); await writeFile(join(f.dir,'unit'),'ActiveState=inactive\n');
    expect((await f.run()).healthy).toBe(false); expect((await f.run('--report')).eligible_24h).toBe(false);
  });
  it('accepts brief automatic recovery and records its measured duration', async () => {
    const f=await fixture(); f.journal.push({...f.journal[0],MESSAGE:'[bot] reconnecting shard=0',__MONOTONIC_TIMESTAMP:'1000'},{...f.journal[0],MESSAGE:'[bot] resumed shard=0 replayed=0',__MONOTONIC_TIMESTAMP:'2000'});
    await writeFile(join(f.dir,'journal'),f.journal.map(e => JSON.stringify(e)).join('\n'));
    const sample=await f.run(); expect(sample.gateway_ready).toBe(true); expect(sample.healthy).toBe(true); expect(sample.recoveries[0].duration_seconds).toBe(0.001);
  });
  it('does not reuse gateway readiness from an old process', async () => {
    const f=await fixture(); await f.run(); await writeFile(join(f.dir,'unit'),(await readFile(join(f.dir,'unit'),'utf8')).replace('instance-a','instance-b'));
    expect((await f.run()).healthy).toBe(false);
  });
  it('requires a complete real 24-hour span with fresh records', async () => {
    const f=await fixture(); const rows=Array.from({length:1441},(_,i)=>f.record(f.monotonic-86400+i*60));
    await f.setRecords(rows); expect((await f.run('--report')).eligible_24h).toBe(true);
    await f.setRecords(rows.slice(1)); expect((await f.run('--report')).eligible_24h).toBe(false);
  });
  it('resets the window after a failed sample, missing interval or process restart', async () => {
    const f=await fixture(); const rows=Array.from({length:1441},(_,i)=>f.record(f.monotonic-86400+i*60));
    for (const changed of [rows.map((r,i)=>i===100?{...r,healthy:false}:r),rows.filter((_r,i)=>i<100||i>103),rows.map((r,i)=>i>100?{...r,bot:{invocation:'instance-b'}}:r)]) {
      await f.setRecords(changed); expect((await f.run('--report')).eligible_24h).toBe(false);
    }
  });
  it('rejects stale records, changed host boot and malformed evidence', async () => {
    const f=await fixture(); const rows=Array.from({length:1441},(_,i)=>f.record(f.monotonic-86600+i*60));
    await f.setRecords(rows); expect((await f.run('--report')).eligible_24h).toBe(false);
    await f.setRecords(rows.map(r=>({...r,monotonic_s:r.monotonic_s+200,boot:'old-boot'}))); expect((await f.run('--report')).eligible_24h).toBe(false);
    await f.setRecords(rows.map(r=>({...r,monotonic_s:r.monotonic_s+200}))); await writeFile(join(f.env.VALIDATION_DIR,'samples.jsonl'), (await readFile(join(f.env.VALIDATION_DIR,'samples.jsonl'),'utf8'))+'broken\n');
    expect((await f.run('--report')).eligible_24h).toBe(false);
  });
  it('rejects slow recovery and errors even if the gateway subsequently resumes', async () => {
    const f=await fixture();
    for (const mode of ['slow','error']) {
      const start={...f.journal[0],MESSAGE:'[bot] reconnecting shard=0',__MONOTONIC_TIMESTAMP:'1000'};
      const end={...f.journal[0],MESSAGE:'[bot] resumed shard=0 replayed=0',__MONOTONIC_TIMESTAMP:mode==='slow'?'6001000':'2000'};
      const extra=mode==='error'?[{...f.journal[0],MESSAGE:'[bot] client error',__MONOTONIC_TIMESTAMP:'1500'}]:[];
      await writeFile(join(f.dir,'journal'),[...f.journal,start,...extra,end].map(e=>JSON.stringify(e)).join('\n'));
      expect((await f.run()).healthy).toBe(false);
    }
  });
  it('reevaluates old samples only with matching measured journal evidence without rewriting them', async () => {
    const f=await fixture(); const rows=Array.from({length:1441},(_,i)=>f.record(f.monotonic-86400+i*60));
    const old={...rows[1440],healthy:false,http_ok:true,memory_fresh:true,gateway_ready:true,gateway_interrupted:true}; rows[1440]=old;
    await f.setRecords(rows); const original=await readFile(join(f.env.VALIDATION_DIR,'samples.jsonl'),'utf8');
    const start={...f.journal[0],MESSAGE:'[bot] reconnecting shard=0',__MONOTONIC_TIMESTAMP:String(Math.floor((f.monotonic-2)*1000000))};
    const end={...f.journal[0],MESSAGE:'[bot] resumed shard=0 replayed=0',__MONOTONIC_TIMESTAMP:String(Math.floor((f.monotonic-1)*1000000))};
    await writeFile(join(f.dir,'journal'),[start,end].map(e=>JSON.stringify(e)).join('\n'));
    const report=await f.run('--report'); expect(report.eligible_24h).toBe(true); expect(report.failed_samples).toBe(1); expect(report.effective_failed_samples).toBe(0); expect(report.recovery_count).toBe(1);
    expect(await readFile(join(f.env.VALIDATION_DIR,'samples.jsonl'),'utf8')).toBe(original);
  });
  it('keeps old interruption samples failed when journal evidence is missing', async () => {
    const f=await fixture(); const rows=Array.from({length:1441},(_,i)=>f.record(f.monotonic-86400+i*60));
    rows[1440]={...rows[1440],healthy:false,http_ok:true,memory_fresh:true,gateway_ready:true,gateway_interrupted:true} as typeof rows[number];
    await f.setRecords(rows); expect((await f.run('--report')).eligible_24h).toBe(false);
  });

});
