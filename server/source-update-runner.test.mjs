import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SOURCE_SCAN_INTERVAL_MS, sourceScanDue, sourceScanDelay, runSourceScan } from './source-update-runner.mjs';

test('source scan becomes due at twelve hours',()=>{
  const dir=mkdtempSync(join(tmpdir(),'yojana-scan-'));
  try {
    const path=join(dir,'state.json'),now=Date.now();
    assert.equal(sourceScanDue(now,path),true);
    writeFileSync(path,JSON.stringify({checked_at:new Date(now).toISOString()}));
    assert.equal(sourceScanDue(now+SOURCE_SCAN_INTERVAL_MS-1,path),false);
    assert.equal(sourceScanDelay(now+11*60*60*1000,path),60*60*1000);
    assert.equal(sourceScanDue(now+SOURCE_SCAN_INTERVAL_MS,path),true);
  } finally {rmSync(dir,{recursive:true,force:true});}
});

test('runner parses only scan counts and handles missing Python',async()=>{
  const good=await runSourceScan({exec:(_exe,_args,_opts,callback)=>callback(null,'{"checked":2,"new_or_changed":1,"failures":0}'),python:'python'});
  assert.deepEqual(good,{ok:true,checked:2,new_or_changed:1,failures:0});
  const failed=await runSourceScan({exec:(_exe,_args,_opts,callback)=>callback(new Error('missing'),''),python:'python'});
  assert.deepEqual(failed,{ok:false});
});
