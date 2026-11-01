import test from 'node:test';
import assert from 'node:assert/strict';
import { proto } from '@whiskeysockets/baileys';
import { createWhatsAppBatchGate } from './whatsapp-batches.mjs';

const chat='fictional@s.whatsapp.net';
const initial=Date.UTC(2026,10,1,9);
function message(id='answer',overrides={}){
  return {key:{id,remoteJid:chat},messageTimestamp:initial/1000,message:{conversation:'2'},...overrides};
}
function setup(options={}){
  let at=initial;
  const gate=createWhatsAppBatchGate({now:()=>at,expectsReply:()=>true,...options});
  return {gate,setTime:value=>{at=value;}};
}

test('notify batches retain their original messages and order; other types fail closed',()=>{
  const {gate}=setup(),batch=[message('one'),message('two')];
  assert.equal(gate.select('notify',batch),batch);
  assert.deepEqual(gate.select('unknown',batch),[]);
  assert.deepEqual(gate.select('append',null),[]);
});

test('mixed own append and fresh incoming answer recovers only the incoming answer',()=>{
  const {gate}=setup();gate.markReplySent(chat);
  const own=message('outgoing',{key:{id:'outgoing',remoteJid:chat,fromMe:true}});
  const answer=message();
  assert.deepEqual(gate.select('append',[own,answer]),[answer]);
});

test('startup history cannot create a recoverable conversation, even when recent',()=>{
  const {gate}=setup();
  assert.deepEqual(gate.select('append',[message('startup',{message:{conversation:'YOJANA START'}})]),[]);
});

test('append must follow the successful prompt and remain within the freshness window',()=>{
  const {gate,setTime}=setup();gate.markReplySent(chat);
  assert.deepEqual(gate.select('append',[message('previous',{messageTimestamp:initial/1000-1})]),[]);
  setTime(initial+60000);
  assert.equal(gate.select('append',[message()]).length,1);
  setTime(initial+60001);
  assert.deepEqual(gate.select('append',[message()]),[]);
});

test('timestamps allow only two seconds of future clock skew and second precision prompts',()=>{
  const {gate,setTime}=setup();setTime(initial+999);gate.markReplySent(chat);
  assert.equal(gate.select('append',[message('same-second')]).length,1);
  assert.equal(gate.select('append',[message('skew',{messageTimestamp:initial/1000+2})]).length,1);
  assert.deepEqual(gate.select('append',[message('future',{messageTimestamp:initial/1000+3})]),[]);
});

test('numeric and protobuf Long timestamps work; unknown representations fail closed',()=>{
  const {gate}=setup();gate.markReplySent(chat);
  const long=proto.WebMessageInfo.fromObject({messageTimestamp:initial/1000}).messageTimestamp;
  assert.equal(gate.select('append',[message('long',{messageTimestamp:long})]).length,1);
  for(const value of [undefined,null,Symbol('invalid'),1793523600n,'1793523600',NaN,Infinity,-1,0,1.5,Number.MAX_SAFE_INTEGER,
    {},{toNumber:()=>String(initial/1000)},{toNumber:()=>{throw Error('invalid');}}]){
    assert.deepEqual(gate.select('append',[message('invalid',{messageTimestamp:value})]),[]);
  }
});

test('append requires a current explicit pending reply; callback failures cannot admit it',()=>{
  for(const expectsReply of [()=>false,()=>undefined,()=>'true',()=>{throw Error('unavailable');}]){
    const {gate}=setup({expectsReply});gate.markReplySent(chat);
    assert.deepEqual(gate.select('append',[message()]),[]);
  }
});

test('own, group, ciphertext, invalid keys and empty content are excluded',()=>{
  const {gate}=setup();gate.markReplySent(chat);gate.markReplySent('fictional@g.us');
  const rows=[
    message('own',{key:{id:'own',remoteJid:chat,fromMe:true}}),
    message('group',{key:{id:'group',remoteJid:'fictional@g.us'}}),
    message('cipher',{messageStubType:proto.WebMessageInfo.StubType.CIPHERTEXT}),
    message('missing',{key:{remoteJid:chat}}),
    message('invalid',{key:{id:'invalid',remoteJid:'@s.whatsapp.net'}}),
    message('invalid-multiple',{key:{id:'invalid-multiple',remoteJid:'a@b@s.whatsapp.net'}}),
    message('empty',{message:{conversation:'   '}}),
    message('unreadable',{message:{}}),
    null,
  ];
  assert.deepEqual(gate.select('append',rows),[]);
  const wrapped=message('wrapped',{message:{ephemeralMessage:{message:{conversation:'1'}}}});
  const audio=message('audio',{message:{audioMessage:{seconds:2,fileLength:100}}});
  const lid=message('lid',{key:{id:'lid',remoteJid:'fictional@lid'}});gate.markReplySent('fictional@lid');
  assert.deepEqual(gate.select('append',[wrapped,audio,lid]),[wrapped,audio,lid]);
});

test('prompt tracking evicts the least recently marked chat at capacity',()=>{
  const {gate}=setup({maximumChats:2});
  const second='second@lid',third='third@lid';
  gate.markReplySent(chat);gate.markReplySent(second);gate.markReplySent(chat);gate.markReplySent(third);
  const secondReply=message('second',{key:{id:'second',remoteJid:second}});
  assert.deepEqual(gate.select('append',[secondReply]),[]);
  assert.equal(gate.select('append',[message()]).length,1);
});

test('prompt tracking expires after 24 hours independently of configured message age',()=>{
  const {gate,setTime}=setup({maximumAgeMs:48*60*60*1000});gate.markReplySent(chat);
  setTime(initial+24*60*60*1000);
  const fresh=message('later',{messageTimestamp:(initial+24*60*60*1000)/1000});
  assert.deepEqual(gate.select('append',[fresh]),[]);
});

test('event IDs are preserved; ingress remains responsible for duplicate suppression',()=>{
  const {gate}=setup();gate.markReplySent(chat);
  const first=message('same'),second=message('same');
  assert.deepEqual(gate.select('append',[first,second]),[first,second]);
  assert.equal(gate.select('append',[first])[0],first);
});
