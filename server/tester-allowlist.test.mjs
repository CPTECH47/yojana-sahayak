import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTestAllowlist,isAllowlistedTestUser} from './tester-allowlist.mjs';
import {createWhatsAppGuard} from './whatsapp-guard.mjs';
const phone='15555550101'; // Fictional test number; real testers stay in .env.

test('private configuration accepts international numbers and fails on invalid input',()=>{
  assert.equal(parseTestAllowlist().size,0);
  assert.deepEqual([...parseTestAllowlist(' +'+phone+', '+phone)], [phone]);
  assert.throws(()=>parseTestAllowlist('not-a-number'),/international phone numbers/u);
});

test('direct JIDs and trusted LID phone metadata match; arbitrary LIDs and groups do not',()=>{
  const numbers=parseTestAllowlist(phone);
  for(const jid of [phone+'@s.whatsapp.net',phone+':2@s.whatsapp.net',phone+'_1:2@c.us'])assert.equal(isAllowlistedTestUser(numbers,jid),true);
  assert.equal(isAllowlistedTestUser(numbers,'123456789@lid',phone+'@s.whatsapp.net'),true);
  assert.equal(isAllowlistedTestUser(numbers,phone+'@lid'),false);
  assert.equal(isAllowlistedTestUser(numbers,'15555550102@s.whatsapp.net',phone+'@s.whatsapp.net'),false);
  assert.equal(isAllowlistedTestUser(numbers,'test@g.us',phone+'@s.whatsapp.net'),false);
});

test('allowlisted users bypass both quotas while ordinary users stay limited',()=>{
  const guard=createWhatsAppGuard({now:()=>0,testNumbers:parseTestAllowlist(phone)});
  for(let i=0;i<30;i++){
    const request=guard.acquire(phone+'@s.whatsapp.net','test-'+i,{voice:true});
    assert.equal(request.allowed,true);request.release();
  }
  const other='15555550102@s.whatsapp.net';
  guard.acquire(other,'v1',{voice:true}).release();guard.acquire(other,'v2',{voice:true}).release();
  assert.equal(guard.acquire(other,'v3',{voice:true}).reason,'voice_rate_limited');
});

test('test users still obey duplicates, one active request and total concurrency',()=>{
  const guard=createWhatsAppGuard({now:()=>0,maximumActive:1,testNumbers:parseTestAllowlist(phone)});
  const chat=phone+'@s.whatsapp.net';
  const first=guard.acquire(chat,'one');
  assert.equal(guard.acquire(chat,'one').reason,'duplicate');
  assert.equal(guard.acquire(chat,'two').reason,'busy');
  assert.equal(guard.acquire('15555550102@s.whatsapp.net','other').reason,'service_busy');
  first.release();
  assert.equal(guard.acquire(chat,'three').allowed,true);
});
