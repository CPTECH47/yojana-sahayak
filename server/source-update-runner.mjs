import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const state=fileURLToPath(new URL('../.runtime/source-discovery/state.json',import.meta.url));
export const SOURCE_SCAN_INTERVAL_MS=12*60*60*1000;

export function sourceScanDue(now=Date.now(),statePath=state){
  try {const at=Date.parse(JSON.parse(readFileSync(statePath,'utf8')).checked_at);return !Number.isFinite(at)||now-at>=SOURCE_SCAN_INTERVAL_MS;}
  catch {return true;}
}
export function runSourceScan({exec=execFile,python=process.env.YOJANA_PYTHON||'python'}={}){
  return new Promise(resolve=>{
    exec(python,['scripts/source_updater.py'],{cwd:root,windowsHide:true,timeout:5*60*1000,maxBuffer:4096},(error,stdout)=>{
      if(error)return resolve({ok:false});
      try {const summary=JSON.parse(stdout.trim());return resolve({ok:true,...summary});}
      catch {return resolve({ok:false});}
    });
  });
}
export function startSourceUpdates({now=Date.now,scan=runSourceScan,log=()=>{}}={}){
  if(process.env.YOJANA_SOURCE_UPDATES==='0')return ()=>{};
  let running=false;
  const tick=async()=>{
    if(running||!sourceScanDue(now()))return;
    running=true;
    try {const result=await scan();log(result.ok?`Source scan: checked ${result.checked}, new or changed ${result.new_or_changed}, failures ${result.failures}.`:'Source scan unavailable; install requirements-ingest.txt.');}
    finally {running=false;}
  };
  void tick();
  const timer=setInterval(tick,SOURCE_SCAN_INTERVAL_MS);
  timer.unref();
  return ()=>clearInterval(timer);
}
