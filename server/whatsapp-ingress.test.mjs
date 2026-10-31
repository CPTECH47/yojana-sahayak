import test from 'node:test';
import assert from 'node:assert/strict';
import { createWhatsAppIngress } from './whatsapp-ingress.mjs';
import { createWhatsAppGuard } from './whatsapp-guard.mjs';
import { memoryStore } from './local-store.mjs';

function message(id,{audio=false,text='1',chat='fictional@s.whatsapp.net'}={}){
  return {key:{id,remoteJid:chat},message:audio?{audioMessage:{fileLength:10,seconds:5}}:{conversation:text}};
}
function setup(extra={}){
  let calls=0,downloads=0;const sent=[],pendingVoice=new Map(),store=memoryStore();
  const conversation={hasActiveConversation:()=>true,acceptsBareQuestionnaireReply:()=>true,selectedLanguage:()=> 'en'};
  const voice={acceptsAudio:()=>false,acceptsPendingChoice:()=>false};
  const receive=createWhatsAppIngress({conversation,voice,store,pendingVoice,guard:createWhatsAppGuard({now:()=>0}),
    deliver:async()=>{calls++;return 'sent';},downloadAudio:async()=>{downloads++;return Buffer.from('sample');},
    send:async(_chat,text)=>{sent.push(text);},...extra});
  return {receive,store,sent,pendingVoice,calls:()=>calls,downloads:()=>downloads};
}

test('normal repeated numeric replies remain valid but replayed IDs are skipped',async()=>{
  const f=setup();
  assert.equal(await f.receive(message('a')),'sent');
  assert.equal(await f.receive(message('b')),'sent');
  assert.equal(await f.receive(message('a')),'duplicate');
  assert.equal(f.calls(),2);assert.equal(f.sent.length,0);
});

test('durable duplicates are rejected before audio download after restart',async()=>{
  const f=setup();
  f.store.put('messages',f.store.id('fictional@s.whatsapp.net:a'),{status:'sent'});
  assert.equal(await f.receive(message('a',{audio:true})),'duplicate');
  assert.equal(f.downloads(),0);assert.equal(f.calls(),0);
});

test('one in-flight audio blocks another before download and throttles notices',async()=>{
  let finish,downloads=0;
  const f=setup({downloadAudio:async()=>{downloads++;return new Promise(resolve=>{finish=resolve;});}});
  const first=f.receive(message('a',{audio:true}));
  assert.equal(await f.receive(message('b',{audio:true})),'busy');
  assert.equal(await f.receive(message('c',{audio:true})),'busy');
  assert.equal(await f.receive(message('a',{audio:true})),'duplicate');
  assert.equal(downloads,1);assert.equal(f.calls(),0);assert.equal(f.sent.length,1);
  finish(Buffer.from('sample'));assert.equal(await first,'sent');
  assert.equal(f.pendingVoice.size,0);
  assert.equal(await f.receive(message('d')),'sent');
});

test('voice and burst limits prevent backend calls while typing remains available',async()=>{
  const f=setup();
  await f.receive(message('v1',{audio:true}));await f.receive(message('v2',{audio:true}));
  assert.equal(await f.receive(message('v3',{audio:true})),'voice_rate_limited');
  assert.equal(f.downloads(),2);assert.equal(f.calls(),2);
  assert.equal(await f.receive(message('text')),'sent');
  for(let i=0;i<5;i++)await f.receive(message('t'+i));
  assert.equal(await f.receive(message('limit')),'rate_limited');
  assert.equal(f.calls(),8);
});

test('failed media download releases admission and leaves no buffered recording',async()=>{
  const f=setup({downloadAudio:async()=>{throw Error('offline');}});
  assert.equal(await f.receive(message('audio',{audio:true})),'download_failed');
  assert.equal(await f.receive(message('next')),'sent');
  assert.equal(f.calls(),1);assert.equal(f.pendingVoice.size,0);
});

test('unrelated personal chats never consume guard slots or call services',async()=>{
  const guard=createWhatsAppGuard();
  const f=setup({guard,conversation:{hasActiveConversation:()=>false,acceptsBareQuestionnaireReply:()=>false,selectedLanguage:()=>null}});
  assert.equal(await f.receive(message('random',{text:'hello friend'})),'ignored');
  assert.equal(f.calls(),0);assert.equal(guard.stats().active,0);
});

test('empty downloaded audio offers recovery and never calls transcription',async()=>{
  const f=setup({downloadAudio:async()=>Buffer.alloc(0)});
  assert.equal(await f.receive(message('empty',{audio:true})),'invalid_audio');
  assert.match(f.sent[0],/record again or type/u);
  assert.equal(f.calls(),0);
  assert.equal(await f.receive(message('recover')),'sent');
});
