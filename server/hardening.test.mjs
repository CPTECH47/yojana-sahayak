import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createAnswerService} from './answer-service.mjs';
import {loadPassages} from './corpus.mjs';
import {createWhatsAppConversation} from './whatsapp-flow.mjs';
import {memoryStore,openLocalStore} from './local-store.mjs';
import {createDelivery} from './delivery.mjs';
import {scanReviewedUpdates,deliverReviewedAlerts} from './alerts.mjs';
import {createApp} from './index.js';
const passages=loadPassages(new Date('2026-10-31T07:00:00Z'));
const farmer={scheme_id:'pm-kisan',owns_cultivable_land:true,income_tax_payer_last_year:false,practising_registered_professional:false,other_official_exclusion:false};

test('model prose, Hindi digits, false payment period and invented URLs never become final text',async()=>{
 for(const prose of ['Rs 6,000 every month','₹५०,००० हर महीने','Guaranteed approval','Send OTP to https://example.invalid/claim']){
  const service=createAnswerService({passages,model:async()=>({fact_ids:['pmkisan-home-2026:1'],answer_text:prose})});
  const result=await service.chat({question:'What is the PM-KISAN benefit?',language:'en'});
  assert.equal(result.status,'answered');assert.match(result.answer_text,/per year/u);
  assert.ok(!result.answer_text.includes(prose));assert.ok(result.citations.every(c=>c.url.startsWith('https://pmkisan.gov.in/')));
 }
});
test('wrong, invented and unrelated fact IDs are refused',async()=>{
 for(const fact_ids of [['invented'],['pmuy-faq:1'],['pmkisan-home-2026:1','invented']]){
  const result=await createAnswerService({passages,model:async()=>({fact_ids})}).chat({question:'PM-KISAN payment amount?'});
  assert.equal(result.status,'insufficient_evidence');assert.deepEqual(result.citations,[]);
 }
});
test('unknown schemes cannot borrow farmer evidence; Hindi bare names do not need a model',async()=>{
 let calls=0;const service=createAnswerService({passages,model:async()=>{calls++;throw Error('offline')}});
 const unknown=await service.chat({question:'Fictional Moon Farmer Scheme benefit?'});
 assert.notEqual(unknown.status,'answered');assert.equal(calls,0);
 assert.equal((await service.chat({question:'पीएम किसान',language:'hi'})).status,'clarify');assert.equal(calls,0);
});
test('model outage returns explicitly labelled retrieved-record fallback',async()=>{
 const result=await createAnswerService({passages,model:async()=>{throw Error('offline')}}).chat({question:'PM-KISAN benefit amount?',language:'hi'});
 assert.equal(result.status,'answered');assert.equal(result.mode,'extractive');assert.match(result.answer_text,/सालाना/u);
});
test('missing or changed rule evidence prevents recommendations',()=>{
 for(const evidence of [[],passages.filter(p=>p.id!=='pmkisan-guidelines:3'),passages.map(p=>p.id==='pmkisan-guidelines:3'?{...p,text:'changed rule'}:p)]){
  const result=createAnswerService({passages:evidence}).recommend({profile:farmer});
  assert.equal(result.status,'insufficient_evidence');assert.deepEqual(result.results,[]);
 }
 assert.equal(createAnswerService({passages}).recommend({profile:{scheme_id:'__proto__'}}).status,'invalid_request');
});
test('questions can interrupt a questionnaire; exclusions stop further unnecessary questions',async()=>{
 const service=createAnswerService({passages,model:async()=>({fact_ids:['pmkisan-home-2026:1']})});
 const flow=createWhatsAppConversation({answers:service,passages});
 await flow.handle('qa','START');await flow.handle('qa','2');
 assert.match(await flow.handle('qa','What is the PM-KISAN benefit?'),/per year/u);
 await flow.handle('qa','1');
 assert.match(await flow.handle('qa','What is the PM-KISAN benefit?'),/per year/u);
 const failed=await flow.handle('qa','no');
 assert.match(failed,/Does not match/u);assert.match(failed,/Answers still needed/u);
 assert.match(await flow.handle('qa','EDIT 1'),/cultivable land/u);
});
test('SAVE, RESUME, separate alert consent and DELETE survive conversation restarts',async()=>{
 const store=memoryStore(),service=createAnswerService({passages});
 let flow=createWhatsAppConversation({answers:service,passages,store});
 await flow.handle('qa','START');await flow.handle('qa','2');await flow.handle('qa','1');
 for(const value of ['yes','no','no','skip'])await flow.handle('qa',value);
 assert.equal(store.get('profiles','qa'),undefined);
 await flow.handle('qa','ALERTS ON');assert.equal(store.get('profiles','qa'),undefined);
 await flow.handle('qa','SAVE');assert.equal(store.get('profiles','qa').alert_opt_in,false);
 await flow.handle('qa','ALERTS ON');assert.equal(store.get('profiles','qa').alert_opt_in,true);
 flow=createWhatsAppConversation({answers:service,passages,store});
 assert.match(await flow.handle('qa','RESUME'),/Answers still needed[\s\S]*exclusion/iu);
 assert.match(await flow.handle('qa','EDIT 4'),/exclusion/u);
 await flow.handle('qa','no');
 assert.equal(store.get('profiles','qa').profile.other_official_exclusion,false);
 await flow.handle('qa','STOP');assert.equal(store.get('profiles','qa').alert_opt_in,false);
 await flow.handle('qa','DELETE');assert.equal(store.get('profiles','qa'),undefined);
});
test('local state is encrypted, exclusive and readable after restart',()=>{
 const dir=mkdtempSync(join(tmpdir(),'yojana-store-'));
 try {
  let store=openLocalStore(dir);const id=store.id('fictional-chat');
  store.put('profiles',id,{storage_consent:true,profile:farmer});
  assert.throws(()=>openLocalStore(dir),/Another bot/u);
  assert.ok(!readFileSync(join(dir,'state.enc')).includes(Buffer.from('owns_cultivable_land')));
  store.close();store=openLocalStore(dir);assert.equal(store.get('profiles',id).storage_consent,true);store.close();
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('delivery preserves order and deduplication across more than 200 events and restarts',async()=>{
 const store=memoryStore(),seen=[];
 let deliver=createDelivery({store,handle:async(_chat,text)=>{await Promise.resolve();return text;},send:async(_chat,text)=>seen.push(text)});
 await Promise.all(Array.from({length:220},(_,i)=>deliver('qa',String(i),'message '+i)));
 // Admission is bounded. Feed remaining messages individually after the first batch.
 for(let i=0;i<220;i++)await deliver('qa',String(i),'message '+i);
 assert.equal(seen.length,220);assert.deepEqual(seen,Array.from({length:220},(_,i)=>'message '+i));
 deliver=createDelivery({store,handle:async()=>{throw Error('duplicate executed')},send:async()=>{}});
 assert.equal(await deliver('qa','0','replay'),'duplicate');
});
test('reviewed updates queue once, default to no send, and recheck opt-out before delivery',async()=>{
 const store=memoryStore();
 store.put('profiles','qa',{storage_consent:true,alert_opt_in:true,recipient:'fictional-chat',language:'en',expires_at:9999999999999,profile:farmer});
 const answers=createAnswerService({passages});
 assert.equal(scanReviewedUpdates({store,answers,passages}),0);
 const changed=passages.map(p=>p.id==='pmkisan-home-2026:1'?{...p,text:p.text+' Reviewed update.'}:p);
 assert.equal(scanReviewedUpdates({store,answers,passages:changed}),1);
 assert.equal(scanReviewedUpdates({store,answers,passages:changed}),0);
 let sends=0;
 assert.equal(await deliverReviewedAlerts({store,answers,send:async()=>sends++}),0);
 store.put('profiles','qa',{...store.get('profiles','qa'),alert_opt_in:false});
 await deliverReviewedAlerts({store,answers,send:async()=>sends++,enabled:true});
 assert.equal(sends,0);assert.equal(store.entries('alerts')[0][1].status,'cancelled');
});
test('HTTP auth, bad JSON, null requests, rate limits and model readiness are explicit',async()=>{
 const app=createApp({token:'fictional-test-token',answers:createAnswerService({passages}),getPassages:()=>passages,fetchImpl:async()=>{throw Error('offline')},limit:5});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const url='http://127.0.0.1:'+server.address().port,headers={authorization:'Bearer fictional-test-token','content-type':'application/json'};
 try{
  assert.equal((await fetch(url+'/api/chat',{method:'POST',body:'{}',headers:{'content-type':'application/json'}})).status,401);
  assert.equal((await fetch(url+'/api/chat',{method:'POST',headers,body:'{'})).status,400);
  assert.equal((await fetch(url+'/api/chat',{method:'POST',headers,body:'null'})).status,400);
  const ready=await fetch(url+'/api/ready',{headers});assert.equal(ready.status,503);assert.equal((await ready.json()).model_available,false);
  await fetch(url+'/api/health',{headers});await fetch(url+'/api/health',{headers});
  assert.equal((await fetch(url+'/api/health',{headers})).status,429);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('HTTP concurrent work admission is bounded',async()=>{
 let release,entered;const started=new Promise(resolve=>entered=resolve);
 const app=createApp({maximum:1,answers:{chat:async()=>{entered();await new Promise(resolve=>release=resolve);return {status:'answered',answer_text:'fictional'};}}});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/api/chat';
 const options={method:'POST',headers:{'content-type':'application/json'},body:'{"question":"fictional test"}'};
 try{
  const first=fetch(url,options);await started;
  const second=await fetch(url,options);assert.equal(second.status,503);assert.equal((await second.json()).reason_code,'busy');
  release();assert.equal((await first).status,200);
 }finally{release?.();await new Promise(resolve=>server.close(resolve));}
});
test('uncertain sends are never blindly replayed after delivery processor restart',async()=>{
 const store=memoryStore();
 let attempts=0;
 let deliver=createDelivery({store,handle:async()=> 'fictional',send:async()=>{attempts++;throw Error('unknown send result')}});
 assert.equal(await deliver('qa','id','question'),'uncertain');
 deliver=createDelivery({store,handle:async()=> 'fictional',send:async()=>attempts++});
 assert.equal(await deliver('qa','id','question'),'duplicate');assert.equal(attempts,1);
});
