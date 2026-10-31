import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './index.js';
import { loadPassages } from './corpus.mjs';
import { supportedRecords } from './verified-facts.mjs';

test('public catalogue contains no facts when no reviewed evidence is available and other APIs stay protected', async()=>{
  const app=createApp({token:'test-token',getPassages:()=>[]});
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  try {
    const root=`http://127.0.0.1:${server.address().port}`;
    const response=await fetch(root+'/api/catalog');assert.equal(response.status,200);
    assert.equal(response.headers.get('cache-control'),'no-store');
    const data=await response.json();assert.equal(data.schemes.length,5);assert.deepEqual(data.records,[]);
    assert.equal((await fetch(root+'/api/health')).status,401);
    assert.equal((await fetch(root+'/assets/does-not-exist.js')).status,404);
    const redirect=await fetch(root+'/start-whatsapp',{redirect:'manual'});
    assert.equal(redirect.status,302);assert.match(redirect.headers.get('location'),/^https:\/\/wa\.me\/\d+\?text=YOJANA%20START$/);
  } finally { await new Promise(resolve=>server.close(resolve)); }
});

test('disputed scholarship deadline passages remain withheld pending review',()=>{
  const records=supportedRecords(loadPassages());
  assert.ok(!records.some(r=>['nmms-2026-notice:1','nsp-scholarships-2026:1'].includes(r.evidence_id)));
});
