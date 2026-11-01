import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnswerService } from './answer-service.mjs';
import { loadPassages } from './corpus.mjs';

const date=new Date('2026-10-31T12:00:00Z');
const firstRecord=messages=>({fact_ids:[JSON.parse(messages[1].content).records[0].id]});
const query={question:'What is the benefit amount?',scheme_id:'pm-kisan',language:'en'};

test('repeated factual questions reuse selected IDs and still render current cited records',async()=>{
  let calls=0;
  const service=createAnswerService({now:()=>date,model:async messages=>{calls++;return firstRecord(messages);}});
  const first=await service.chat(query);
  const repeated=await service.chat({...query,question:'  WHAT is the benefit amount?  '});
  assert.equal(calls,1);
  assert.equal(first.status,'answered');
  assert.deepEqual(repeated.fact_ids,first.fact_ids);
  assert.deepEqual(repeated.citations,first.citations);
  assert.equal(repeated.answer_text,first.answer_text);
});

test('concurrent identical questions share one model request',async()=>{
  let calls=0,release;
  const gate=new Promise(resolve=>{release=resolve;});
  const service=createAnswerService({now:()=>date,model:async messages=>{calls++;await gate;return firstRecord(messages);}});
  const pending=Array.from({length:3},()=>service.chat(query));
  await Promise.resolve();
  assert.equal(calls,1);
  release();
  const results=await Promise.all(pending);
  assert.equal(results.every(result=>result.status==='answered'),true);
  assert.equal(calls,1);
});

test('cache separates language and scheme context',async()=>{
  let calls=0;
  const service=createAnswerService({now:()=>date,model:async messages=>{calls++;return firstRecord(messages);}});
  for(const language of ['en','hi'])assert.equal((await service.chat({...query,language})).status,'answered');
  const other=await service.chat({...query,scheme_id:'pmuy'});
  assert.equal(other.status,'answered');
  assert.equal(other.citations.every(source=>source.url.includes('pmuy.gov.in')),true);
  await service.chat(query);
  assert.equal(calls,3);
});

test('expired evidence revokes a cached source selection',async()=>{
  let clock=new Date('2026-11-30T08:00:00Z'),calls=0;
  const service=createAnswerService({now:()=>clock,model:async messages=>{calls++;return firstRecord(messages);}});
  const pension={question:'PM-KMY pension benefit amount?',scheme_id:'pm-kmy',language:'en'};
  assert.equal((await service.chat(pension)).status,'answered');
  clock=new Date('2026-12-01T08:00:00Z');
  const after=await service.chat(pension);
  assert.equal(after.status,'insufficient_evidence');
  assert.deepEqual(after.citations,[]);
  assert.equal(calls,1);
});

test('modified evidence cannot reuse cached IDs',async()=>{
  const passages=loadPassages(date);
  let calls=0;
  const service=createAnswerService({passages,now:()=>date,model:async messages=>{calls++;return firstRecord(messages);}});
  const pension={question:'PM-KMY pension benefit amount?',scheme_id:'pm-kmy',language:'en'};
  assert.equal((await service.chat(pension)).status,'answered');
  const source=passages.find(p=>p.id==='pmkmy-policy-2026:3');
  source.text='Changed, unreviewed pension claim.';
  const after=await service.chat(pension);
  assert.equal(after.status,'insufficient_evidence');
  assert.deepEqual(after.citations,[]);
  assert.equal(calls,1);
});

test('cache TTL and capacity bound retention',async()=>{
  let clock=date.getTime(),calls=0;
  const service=createAnswerService({now:()=>new Date(clock),selectionCacheMaximum:2,selectionCacheTtlMs:1000,model:async messages=>{calls++;return firstRecord(messages);}});
  const request=suffix=>service.chat({...query,question:query.question+' '+suffix});
  await request('first');await request('second');await request('third');
  assert.equal(calls,3);
  await request('second');assert.equal(calls,3);
  await request('first');assert.equal(calls,4);
  clock+=1001;
  await request('first');assert.equal(calls,5);
});

test('failures, empty and invalid selections are not cached',async()=>{
  for(const choice of [null,{fact_ids:[]},{fact_ids:['invented']}]){
    let calls=0;
    const service=createAnswerService({now:()=>date,model:async()=>{calls++;if(choice===null)throw Error('offline');return choice;}});
    const first=await service.chat(query),second=await service.chat(query);
    assert.equal(calls,2);
    assert.equal(first.status,second.status);
    if(choice===null)assert.equal(first.mode,'extractive');
    else assert.equal(first.status,'insufficient_evidence');
  }
});
