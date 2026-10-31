import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { openStore } from '../src/store.mjs';
import { createSmsService, gatewaySettings } from '../src/service.mjs';
import { estimateSegments } from '../src/templates.mjs';
import { createDemoServer } from '../src/server.mjs';
const clock=()=>new Date('2026-10-31T12:00:00+05:30').getTime();
const recipient='+12025550123'; // Fictional NANPA number. Only fake fetches use Android-mode tests.
const android={mode:'android',gatewayUrl:'http://127.0.0.1:9000',username:'test-user',password:'secret-test-only',allowedNumbers:[recipient],dailySegmentLimit:6};
function fixture(t, config={mode:'simulator'}, fetchImpl=()=>{throw Error('No real network allowed');}, now=clock) {
  const dir=mkdtempSync(join(tmpdir(),'yojana-sms-test-'));
  const store=openStore(dir);
  t.after(()=>{store.close();if(!resolve(dir).startsWith(resolve(tmpdir())+sep+'yojana-sms-test-'))throw Error('Unexpected cleanup path.');rmSync(dir,{recursive:true,force:true});});
  return {dir,store,service:createSmsService({config,store,fetchImpl,now})};
}
const input=(overrides={})=>({template:'pmuy-apply',language:'en',recipient,consent:true,...overrides});

test('segment estimates account for GSM extensions and Unicode multipart boundaries',()=>{
  assert.equal(estimateSegments('a'.repeat(160)).segments,1);
  assert.equal(estimateSegments('a'.repeat(161)).segments,2);
  assert.equal(estimateSegments('^'.repeat(81)).segments,2);
  assert.equal(estimateSegments('ह'.repeat(71)).segments,2);
});
test('consent, supported language, recipient allowlist and source-review deadline block before sends',t=>{
  const {service}=fixture(t,android);
  assert.throws(()=>service.prepare(input({consent:false})),/agreed/);
  assert.throws(()=>service.prepare(input({language:'pa'})),/supported/);
  assert.throws(()=>service.prepare(input({recipient:'+12025550124'})),/allowlist/);
  const expired=fixture(t,{mode:'simulator'},undefined,()=>new Date('2026-11-08T12:00:00+05:30').getTime());
  assert.throws(()=>expired.service.prepare(input()),/review/);
});
test('simulator supports both languages and never contacts a gateway',async t=>{
  const {service}=fixture(t);
  for(const language of ['en','hi'])for(const scenario of ['success','failure','uncertain']){
    const row=service.prepare(input({language,scenario}));const result=await service.send(row.id);
    assert.match(result.status,/^simulated/);assert.match(result.note,/no phone/);
    assert.deepEqual(await service.send(row.id),result);
  }
});
test('Android payload, at-most-once concurrent submission, redaction and explicit delivery lookup',async t=>{
  const calls=[];
  const {service,dir}=fixture(t,android,async(url,options)=>{
    calls.push({url,options});
    if(options.method==='POST') {
      const body=JSON.parse(options.body);assert.equal(body.phoneNumbers.length,1);assert.equal(body.phoneNumbers[0],recipient);
      assert.equal(body.withDeliveryReport,true);assert.equal(body.ttl,300);assert.equal(options.redirect,'error');
      assert.equal(options.headers.Authorization,'Basic '+Buffer.from('test-user:secret-test-only').toString('base64'));
      return Response.json({id:body.id,state:'Pending'},{status:202});
    }
    return Response.json({id:url.split('/').at(-1),state:'Delivered'});
  });
  const row=service.prepare(input());
  const results=await Promise.all([service.send(row.id),service.send(row.id)]);
  assert.equal(calls.length,1);assert.ok(results.some(r=>r.status==='gateway_accepted'));
  assert.equal((await service.status(row.id)).status,'gateway_reported_delivered');
  assert.equal(calls.length,2);
  const disk=readFileSync(join(dir,'ledger.json'),'utf8');
  assert.ok(!disk.includes(recipient));assert.ok(!disk.includes('secret-test-only'));
  assert.ok(!JSON.stringify(service.state()).includes(recipient));
});
test('timeouts reserve budget, survive restart and are never silently resent',async t=>{
  let calls=0;
  const {service,store}=fixture(t,android,async()=>{calls++;throw Error('Connection lost after submission');});
  const row=service.prepare(input());assert.equal((await service.send(row.id)).status,'uncertain');
  const restarted=createSmsService({config:android,store,fetchImpl:async()=>{calls++;},now:clock});
  assert.equal((await restarted.send(row.id)).status,'uncertain');assert.equal(calls,1);
  assert.equal(restarted.state().reservedSegmentsToday,1);
});
test('segment budget blocks new submissions and restart expires unfinished previews',async t=>{
  const {service,store}=fixture(t,{...android,dailySegmentLimit:1},async()=>Response.json({id:'gateway-id',state:'Pending'},{status:202}));
  const first=service.prepare(input());await service.send(first.id);
  const second=service.prepare(input());await assert.rejects(service.send(second.id),/budget/);
  const restarted=createSmsService({config:android,store,now:clock});
  assert.equal((await restarted.send(second.id)).status,'expired');
});
test('private LAN restriction, credential validation and exclusive store prevent accidental exposure',t=>{
  assert.throws(()=>gatewaySettings({...android,gatewayUrl:'https://example.com'}),/private/);
  assert.throws(()=>gatewaySettings({...android,gatewayUrl:'http://192.168.1.2:8080@evil.test'}),/private/);
  assert.throws(()=>gatewaySettings({...android,messagesPath:'/something-else'}),/Choose/);
  const {dir}=fixture(t);assert.throws(()=>openStore(dir),/Another demo process/);
});
test('HTTP operator API rejects cross-origin and simple POST requests and validates JSON',async t=>{
  const {service}=fixture(t);const server=createDemoServer(service).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;
  const post=(headers,body='{}')=>fetch(base+'/api/prepare',{method:'POST',headers,body});
  assert.equal((await post({'Content-Type':'application/json'})).status,403);
  assert.equal((await post({'Content-Type':'application/json','X-Demo-Request':'1',Origin:'https://other.test'})).status,403);
  assert.equal((await post({'Content-Type':'application/json','X-Demo-Request':'1'},'null')).status,400);
  const res=await fetch(base+'/');assert.equal(res.status,200);assert.equal(res.headers.get('cache-control'),'no-store');
  assert.equal((await fetch(base+'/missing.js')).status,404);
});
