import test from 'node:test';
import assert from 'node:assert/strict';
import { createWhatsAppGuard } from './whatsapp-guard.mjs';

test('normal repeated numeric replies with distinct event IDs remain responsive',()=>{
  let at=0;
  const guard=createWhatsAppGuard({now:()=>at});
  // Content is deliberately absent from the API: "1" on two successive
  // questions is not a duplicate when WhatsApp supplied different message IDs.
  for(let index=0;index<30;index++){
    const admission=guard.acquire('citizen',String(index));
    assert.equal(admission.allowed,true);
    admission.release();
    at+=2000;
  }
  assert.equal(guard.stats().active,0);
});

test('text bursts are limited independently per chat and recover with a wait',()=>{
  let at=0;
  const guard=createWhatsAppGuard({now:()=>at});
  for(let index=0;index<8;index++)guard.acquire('fast',String(index)).release();
  const denied=guard.acquire('fast','burst');
  assert.equal(denied.allowed,false);
  assert.equal(denied.reason,'rate_limited');
  assert.equal(denied.retryAfterSeconds,2);
  assert.equal(guard.acquire('other','one').allowed,true);
  at=2000;
  const retry=guard.acquire('fast','retry');
  assert.equal(retry.allowed,true);
  retry.release();
});

test('voice has its own budget and a rejected voice note need not call a backend',()=>{
  let at=0,costlyCalls=0;
  const guard=createWhatsAppGuard({now:()=>at});
  const receive=id=>{
    const admission=guard.acquire('speaker',id,{voice:true});
    if(admission.allowed){costlyCalls++;admission.release();}
    return admission;
  };
  receive('v1');receive('v2');
  const limited=receive('v3');
  assert.equal(limited.reason,'voice_rate_limited');
  assert.equal(limited.retryAfterSeconds,10);
  assert.equal(costlyCalls,2);
  const typed=guard.acquire('speaker','typed-answer');
  assert.equal(typed.allowed,true);typed.release();
  at=10000;
  assert.equal(receive('v4').allowed,true);
  assert.equal(costlyCalls,3);
});

test('in-flight work is limited to one per chat and replay is silent',()=>{
  const guard=createWhatsAppGuard({now:()=>0});
  const first=guard.acquire('same','id1');
  assert.equal(guard.acquire('same','id2').reason,'busy');
  assert.equal(guard.acquire('same','id1').reason,'duplicate');
  assert.equal(guard.acquire('same','id1').notice,false);
  first.release();first.release();
  assert.equal(guard.stats().active,0);
  assert.equal(guard.acquire('same','id3').allowed,true);
});

test('busy and rate-limit notices share one cooldown and denied events do not consume tokens',()=>{
  let at=0;
  const guard=createWhatsAppGuard({now:()=>at,textCapacity:1,textPerMinute:1});
  const active=guard.acquire('chat','active');
  assert.equal(guard.acquire('chat','busy-1').notice,true);
  assert.equal(guard.acquire('chat','busy-2').notice,false);
  active.release();
  assert.equal(guard.acquire('chat','rate-1').notice,false);
  at=15000;
  assert.equal(guard.acquire('chat','rate-2').notice,true);
  assert.equal(guard.acquire('chat','rate-2').notice,false);
  at=60000;
  assert.equal(guard.acquire('chat','fresh').allowed,true);
});

test('global saturation does not leak slots and a different chat can retry after release',()=>{
  const guard=createWhatsAppGuard({now:()=>0,maximumActive:2});
  const first=guard.acquire('a','a1'),second=guard.acquire('b','b1');
  assert.equal(guard.acquire('c','c1').reason,'service_busy');
  assert.equal(guard.stats().active,2);
  first.release();first.release();
  const third=guard.acquire('c','c2');
  assert.equal(third.allowed,true);
  third.release();second.release();
  assert.equal(guard.stats().active,0);
});

test('chat and event-ID memory is bounded and idle chats expire',()=>{
  let at=0;
  const guard=createWhatsAppGuard({now:()=>at,maximumChats:2,maximumIds:3,textCapacity:20});
  for(let index=0;index<10;index++)guard.acquire('a',String(index)).release();
  guard.acquire('b','b').release();
  assert.deepEqual(guard.stats(),{chats:2,active:0,ids:4});
  assert.equal(guard.acquire('c','full').notice,false);
  assert.equal(guard.stats().chats,2);
  at=600000;
  assert.equal(guard.acquire('c','fresh').allowed,true);
  assert.equal(guard.stats().chats,1);
});
