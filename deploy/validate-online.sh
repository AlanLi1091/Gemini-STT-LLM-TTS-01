#!/bin/sh
# Read-only production probes. Only sanitized metadata is retained; no model calls.
set -eu
mode=${1:---sample}
[ "$mode" = --sample ] || [ "$mode" = --report ] || { echo 'Use --sample or --report' >&2; exit 2; }
exec /usr/bin/python3 - "$mode" "${VALIDATION_DIR:-/var/lib/gemini-validation}" <<'PY'
import datetime, json, os, pathlib, re, subprocess, sys, time, urllib.request

mode, directory = sys.argv[1:]
root = pathlib.Path(directory)
now = time.monotonic()
stamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

def command(args):
    return subprocess.check_output(args, text=True, timeout=5)

def unit(name):
    props = ['ActiveState','SubState','MainPID','NRestarts','InvocationID','MemoryCurrent']
    output = command(['systemctl','show',name] + ['--property='+p for p in props])
    values = dict(line.split('=',1) for line in output.splitlines() if '=' in line)
    return {'active': values['ActiveState'] == 'active' and values['SubState'] == 'running',
            'pid': int(values['MainPID']), 'restarts': int(values['NRestarts']),
            'invocation': values['InvocationID'],
            'memory_bytes': int(values['MemoryCurrent']) if values.get('MemoryCurrent','').isdigit() else None}

MAX_RECOVERY_SECONDS = 5

def connection_evidence(logs):
    events, recoveries, pending = [], [], {}
    for line in logs.splitlines():
        row = json.loads(line)
        message = row.get('MESSAGE','')
        match = re.fullmatch(r'\[bot\] (shard ready|resumed|reconnecting|disconnected) shard=(\d+)(?: replayed=\d+| code=\d+)?', message)
        hard = message.startswith(('[bot] session invalidated','[bot] fatal gateway','[bot] stopped','[bot] shard error','[bot] client error'))
        if not match and not hard: continue
        invocation = row.get('_SYSTEMD_INVOCATION_ID')
        timestamp = int(row['__MONOTONIC_TIMESTAMP']) / 1000000
        event = {'invocation':invocation,'time':timestamp,'kind':match[1] if match else 'error','shard':match[2] if match else None}
        events.append(event)
        if not match: continue
        key = (invocation,match[2])
        if match[1] in ['reconnecting','disconnected']:
            pending.setdefault(key,event)
        elif key in pending:
            start = pending.pop(key)
            duration = timestamp-start['time']
            recoveries.append({'invocation':invocation,'shard':match[2],'start':start['time'],'end':timestamp,'duration_seconds':round(duration,6)})
    return events, recoveries

def qualifies(record, previous, events, recoveries):
    if not record.get('gateway_interrupted'):
        return bool(record.get('healthy'))
    if not (record.get('http_ok') and record.get('memory_fresh') and all(record.get(unit,{}).get('active') and record[unit].get('pid',0)>0 for unit in ['server','bot'])):
        return False
    invocation = record['bot']['invocation']
    lower = previous['monotonic_s'] if previous and previous.get('boot')==record.get('boot') else 0
    upper = record['monotonic_s']
    relevant = [e for e in events if e['invocation']==invocation and lower<e['time']<=upper]
    transitions = [e for e in relevant if e['kind'] in ['reconnecting','disconnected','resumed','shard ready']]
    if not transitions or any(e['kind']=='error' for e in relevant): return False
    for event in transitions:
        if not any(r['invocation']==invocation and r['shard']==event['shard'] and r['start']<=event['time']<=r['end'] and 0<=r['duration_seconds']<=MAX_RECOVERY_SECONDS for r in recoveries): return False
    return True

if mode == '--report':
    records = []
    malformed = False
    if (root/'samples.jsonl').exists():
        for line in (root/'samples.jsonl').read_text().splitlines():
            try: records.append(json.loads(line))
            except (ValueError, TypeError): malformed = True
    events, recoveries = [], []
    if any(r.get('gateway_interrupted') for r in records):
        events, recoveries = connection_evidence(command(['journalctl','-b','-u','gemini-bot','-o','json','--no-pager']))
    segment = []
    maximum_gap = 0
    previous = None
    effective_failed = 0
    for record in records:
        accepted = qualifies(record, previous, events, recoveries)
        previous = record
        if not accepted:
            effective_failed += 1
            segment = []; maximum_gap = 0; continue
        identity = (record['boot'], record['server']['invocation'], record['bot']['invocation'])
        gap = record['monotonic_s'] - segment[-1]['monotonic_s'] if segment else 0
        if segment and (identity != (segment[-1]['boot'],segment[-1]['server']['invocation'],segment[-1]['bot']['invocation']) or gap <= 0 or gap > 150):
            segment = []; maximum_gap = 0; gap = 0
        segment.append(record); maximum_gap = max(maximum_gap, gap)
    duration = segment[-1]['monotonic_s']-segment[0]['monotonic_s'] if len(segment)>1 else 0
    fresh = bool(segment) and pathlib.Path(os.environ.get('VALIDATION_BOOT_FILE','/proc/sys/kernel/random/boot_id')).read_text().strip()==segment[-1]['boot'] and 0 <= now-segment[-1]['monotonic_s'] <= 150
    result = {'eligible_24h': duration >= 86400 and fresh and not malformed,
              'healthy_seconds': round(duration), 'healthy_samples':len(segment),
              'total_samples':len(records), 'failed_samples':sum(not r.get('healthy',False) for r in records),
              'effective_failed_samples':effective_failed,
              'policy':'automatic_recovery_up_to_5_seconds',
              'latest_utc':records[-1]['utc'] if records else None,
              'max_gap_seconds':round(maximum_gap,2), 'fresh':fresh, 'malformed':malformed}
    observed = [r for r in recoveries if segment and r['invocation']==segment[-1]['bot']['invocation'] and r['start']>=segment[0]['monotonic_s'] and r['end']<=segment[-1]['monotonic_s']]
    result['recoveries'] = observed
    result['recovery_count'] = len(observed)
    result['recovery_total_seconds'] = round(sum(r['duration_seconds'] for r in observed),6)
    result['recovery_max_seconds'] = max((r['duration_seconds'] for r in observed),default=0)
    result['memory'] = {}
    for key in ['rss_mib','heap_used_mib']:
        values = [r[key] for r in segment if isinstance(r.get(key),(int,float))]
        result['memory'][key] = {'first':values[0],'last':values[-1],'peak':max(values)} if values else None
    print(json.dumps(result)); sys.exit(0)

os.umask(0o077)
root.mkdir(mode=0o700, parents=True, exist_ok=True)
record = {'utc':stamp,'monotonic_s':now,'healthy':False,'reason':'probe_failed'}
try:
    import fcntl
    lock = (root/'sample.lock').open('a')
    fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    boot = pathlib.Path(os.environ.get('VALIDATION_BOOT_FILE','/proc/sys/kernel/random/boot_id')).read_text().strip()
    server, bot = unit('gemini-server'), unit('gemini-bot')
    record.update(boot=boot,server=server,bot=bot)
    previous = {}
    if (root/'state.json').exists(): previous = json.loads((root/'state.json').read_text())
    same = previous.get('boot')==boot and previous.get('invocation')==bot['invocation']
    gateway = previous.get('gateway',{}) if same else {}
    memory_at = previous.get('memory_at',0) if same else 0
    memory_values = previous.get('memory_values',{}) if same else {}
    args = ['journalctl','-b','-u','gemini-bot','-o','json','--no-pager']
    if same and previous.get('cursor'): args += ['--after-cursor='+previous['cursor']]
    logs = command(args)
    cursor = previous.get('cursor') if same else None
    interrupted = False
    events, recoveries = connection_evidence(logs)
    for line in logs.splitlines():
        event = json.loads(line); cursor = event.get('__CURSOR',cursor)
        if event.get('_SYSTEMD_INVOCATION_ID') != bot['invocation']: continue
        message = event.get('MESSAGE','')
        match = re.fullmatch(r'\[bot\] (shard ready|resumed|reconnecting|disconnected) shard=(\d+)(?: replayed=\d+| code=\d+)?', message)
        if match:
            gateway[match[2]] = match[1] in ['shard ready','resumed']
            if not gateway[match[2]]: interrupted=True
        memory_match = re.fullmatch(r'\[bot\] memory rssMiB=([0-9.]+) heapUsedMiB=([0-9.]+)',message)
        if memory_match:
            memory_at=int(event['__MONOTONIC_TIMESTAMP'])/1000000
            memory_values={'rss_mib':float(memory_match[1]),'heap_used_mib':float(memory_match[2])}
        if message.startswith(('[bot] session invalidated','[bot] fatal gateway','[bot] stopped','[bot] shard error','[bot] client error')):
            interrupted = True
    opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
    with opener.open(os.environ.get('VALIDATION_HEALTH_URL','http://127.0.0.1:3001/api/health'),timeout=3) as response:
        health = json.load(response)
        http_ok = response.status == 200 and health.get('status')=='ok' and health.get('service')=='gemini-chat-server'
    ready = bool(gateway) and all(gateway.values())
    now = time.monotonic()
    record['monotonic_s'] = now
    memory_fresh = 0 <= now-memory_at <= 90
    record.update(healthy=bool(server['active'] and bot['active'] and server['pid']>0 and bot['pid']>0 and http_ok and ready and memory_fresh and not interrupted),
                  reason='ok' if http_ok and ready and memory_fresh and not interrupted else 'health_or_gateway',
                  http_ok=http_ok,gateway_ready=ready,memory_fresh=memory_fresh,gateway_interrupted=interrupted)
    record['policy'] = 'automatic_recovery_up_to_5_seconds'
    record['recoveries'] = recoveries
    if interrupted:
        record['healthy'] = qualifies(record, {'boot':boot,'monotonic_s':previous.get('sample_time',0)}, events, recoveries)
        if record['healthy']: record['reason']='automatic_recovery'
    record.update(memory_values)
    state={'sample_time':now,'memory_values':memory_values,'boot':boot,'invocation':bot['invocation'],'gateway':gateway,'memory_at':memory_at,'cursor':cursor}
    temporary=root/'state.json.tmp'; temporary.write_text(json.dumps(state)); temporary.replace(root/'state.json')
except BlockingIOError:
    print('{"skipped":"probe_already_running"}'); sys.exit(0)
except Exception:
    # Do not include raw exceptions / logs / environment values in stored samples.
    pass
with (root/'samples.jsonl').open('a') as output: output.write(json.dumps(record)+'\n')
print(json.dumps(record))
PY
