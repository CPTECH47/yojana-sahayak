import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import assert from 'node:assert/strict';
import { openStore } from '../src/store.mjs';
import { createSmsService } from '../src/service.mjs';
import { createDemoServer } from '../src/server.mjs';

const directory = mkdtempSync(join(tmpdir(), 'yojana-sms-rehearsal-'));
const store = openStore(directory);
const service = createSmsService({config:{mode:'simulator'},store});
const server = createDemoServer(service).listen(0,'127.0.0.1');
await new Promise(resolve=>server.once('listening',resolve));
const base = `http://127.0.0.1:${server.address().port}`;
async function post(path, data) {
  const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','X-Demo-Request':'1'},body:JSON.stringify(data)});
  return {status:response.status,data:await response.json()};
}
try {
  console.log('YOJANA SMS REHEARSAL — SIMULATOR ONLY; NO REAL PHONE CONTACTED');
  const blocked=await post('/api/prepare',{template:'pmuy-apply',language:'en',consent:false});
  assert.equal(blocked.status,400); console.log('PASS: no consent -> no message prepared');
  for(const [language,scenario] of [['en','success'],['hi','success'],['en','failure'],['hi','uncertain']]) {
    const preview=await post('/api/prepare',{template:'pmuy-apply',language,scenario,consent:true});
    assert.equal(preview.status,201);
    const result=await post('/api/send',{id:preview.data.id});
    assert.equal(result.status,200);
    const duplicate=await post('/api/send',{id:preview.data.id});
    assert.equal(duplicate.data.status,result.data.status);
    console.log(`${language} / ${scenario}: ${result.data.status}; ${preview.data.estimate.segments} estimated segment(s); duplicate request reused the result`);
    console.log('Preview: '+preview.data.text);
  }
  console.log('COMPLETE: consent, Hindi/English, failure, uncertain outcome and duplicate requests exercised over localhost HTTP.');
} finally {
  await new Promise(resolve=>server.close(resolve)); store.close();
  if (!resolve(directory).startsWith(resolve(tmpdir()) + sep + 'yojana-sms-rehearsal-')) throw Error('Unexpected temporary cleanup path.');
  rmSync(directory,{recursive:true,force:true});
}
