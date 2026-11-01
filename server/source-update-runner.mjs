import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const state=fileURLToPath(new URL('../.runtime/source-discovery/state.json',import.meta.url));
export const SOURCE_SCAN_INTERVAL_MS=12*60*60*1000;

export function sourceScanDelay(now=Date.now(),statePath=state){
  try {const at=Date.parse(JSON.parse(readFileSync(statePath,'utf8')).checked_at);return Number.isFinite(at)?Math.max(0,Math.min(SOURCE_SCAN_INTERVAL_MS,at+SOURCE_SCAN_INTERVAL_MS-now)):0;}
  catch {return 0;}
}
export const sourceScanDue=(now=Date.now(),statePath=state)=>sourceScanDelay(now,statePath)===0;
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
  let running=false,stopped=false,timer;
  const schedule=delay=>{if(!stopped){timer=setTimeout(tick,delay);timer.unref();}};
  const tick=async()=>{
    if(stopped||running)return;
    const delay=sourceScanDelay(now());
    if(delay>0){schedule(delay);return;}
    running=true;
    try {const result=await scan();log(result.ok?`Source scan: checked ${result.checked}, new or changed ${result.new_or_changed}, failures ${result.failures}.`:'Source scan unavailable; install requirements-ingest.txt.');}
    finally {running=false;schedule(sourceScanDelay(now())||60*60*1000);}
  };
  void tick();
  return ()=>{stopped=true;clearTimeout(timer);};
}
