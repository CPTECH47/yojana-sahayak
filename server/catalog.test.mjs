import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './index.js';

test('public catalogue contains no facts when no reviewed evidence is available and other APIs stay protected', async()=>{
  const app=createApp({token:'test-token',getPassages:()=>[]});
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  try {
    const root=`http://127.0.0.1:${server.address().port}`;
    const response=await fetch(root+'/api/catalog');assert.equal(response.status,200);
    const data=await response.json();assert.equal(data.schemes.length,5);assert.deepEqual(data.records,[]);
    assert.equal((await fetch(root+'/api/health')).status,401);
  } finally { await new Promise(resolve=>server.close(resolve)); }
});
