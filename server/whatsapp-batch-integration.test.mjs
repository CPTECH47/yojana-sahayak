import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnswerService } from './answer-service.mjs';
import { loadPassages } from './corpus.mjs';
import { memoryStore } from './local-store.mjs';
import { createWhatsAppConversation } from './whatsapp-flow.mjs';
import { createVoiceFlow } from './voice-flow.mjs';
import { createDelivery } from './delivery.mjs';
import { createWhatsAppIngress } from './whatsapp-ingress.mjs';
import { createWhatsAppGuard } from './whatsapp-guard.mjs';
import { createWhatsAppBatchGate } from './whatsapp-batches.mjs';

const chat='fictional-farmer@s.whatsapp.net';

function setup(){
  let at=Date.parse('2026-11-01T06:00:00Z');
  const now=()=>at,store=memoryStore(),replies=[];
  const calls={model:0,chat:0,speech:0,profile:0,interpret:0,download:0};
  const service=createAnswerService({passages:loadPassages(new Date(at)),model:async()=>{
    calls.model++;throw Error('Numeric answers must not require model selection');
  }});
  const answers={...service,chat:async(...args)=>{calls.chat++;return service.chat(...args);}};
  const conversation=createWhatsAppConversation({answers,store,now,multiScheme:true,
    discoverSchemes:async()=>({leads:[],pending:[]}),
    extractProfile:async()=>{calls.profile++;throw Error('Unexpected profile extraction');},
    interpretAnswer:async()=>{calls.interpret++;throw Error('Unexpected answer interpretation');}});
  const voice=createVoiceFlow({answers,now,transcribe:async()=>{calls.speech++;throw Error('Unexpected speech recognition');},
    fallback:conversation.handle,answerQuestion:conversation.answerQuestion,
    profileStatement:conversation.handleProfileStatement,isProfileStatement:conversation.isProfileStatement,
    isQuestionnaireReply:conversation.acceptsBareQuestionnaireReply,
    selectedLanguage:conversation.selectedLanguage,choosingLanguage:conversation.choosingLanguage});
  const gate=createWhatsAppBatchGate({now,expectsReply:id=>conversation.hasPendingPrompt(id)||voice.hasPendingPrompt(id)});
  const send=async(id,text)=>{
    replies.push({chat:id,text});
    gate.markReplySent(id);
  };
  const deliver=createDelivery({store,now,handle:(id,text)=>voice.handle(id,text),send});
  const receive=createWhatsAppIngress({conversation,voice,store,deliver,send,
    guard:createWhatsAppGuard({now}),downloadAudio:async()=>{calls.download++;throw Error('Unexpected audio download');}});
  function message(id,text,{fromMe=false,remoteJid=chat,timestamp=at}={}){
    return {key:{id,remoteJid,fromMe},messageTimestamp:Math.floor(timestamp/1000),message:{conversation:text}};
  }
  async function batch(type,messages){
    const selected=gate.select(type,messages);
    return {selected,statuses:await Promise.all(selected.map(receive))};
  }
  async function next(id,text){
    at+=2000;
    return batch('notify',[message(id,text)]);
  }
  return {batch,message,next,replies,calls,conversation,advance:ms=>{at+=ms;},time:()=>at};
}

async function startHindiFarmer(f){
  for(const [id,text] of [['start','YOJANA START'],['hindi','1'],['farmer','1']]){
    assert.deepEqual((await f.next(id,text)).statuses,['sent']);
  }
  assert.match(f.replies.at(-1).text,/PM-KISAN[\s\S]*खेती योग्य जमीन/u);
  assert.equal(f.conversation.selectedLanguage(chat),'hi');
}

test('Hindi NO in a mixed append batch reaches the next scheme once through the real delivery pipeline',async()=>{
  const f=setup();
  await startHindiFarmer(f);
  const before=f.replies.length;
  f.advance(2000);
  const own=f.message('own-prompt','PM-KISAN prompt',{fromMe:true});
  const no=f.message('land-no','2');
  const result=await f.batch('append',[own,no]);
  assert.deepEqual(result.selected,[no]);
  assert.deepEqual(result.statuses,['sent']);
  assert.equal(f.replies.length,before+1);
  assert.match(f.replies.at(-1).text,/PM-KMY[\s\S]*5\. क्या आप अधिकतम 2 हेक्टेयर/u);
  assert.equal(f.conversation.selectedLanguage(chat),'hi');

  const replay=await f.batch('append',[own,no]);
  assert.ok(replay.statuses.every(status=>status==='duplicate'));
  assert.equal(f.replies.length,before+1,'The same transport event must not answer another scheme');
  assert.deepEqual((await f.next('kmy-land-yes','1')).statuses,['sent']);
  assert.match(f.replies.at(-1).text,/PM-KMY[\s\S]*6\. क्या योजना में प्रवेश के समय आपकी आयु/u);
  assert.deepEqual(f.calls,{model:0,chat:0,speech:0,profile:0,interpret:0,download:0});
});

test('stale and unrelated append messages cannot advance a pending Hindi questionnaire',async()=>{
  const f=setup();
  await startHindiFarmer(f);
  const before=f.replies.length,old=f.message('old-no','2');
  f.advance(61000);
  const stranger=f.message('unrelated-start','YOJANA START',{remoteJid:'fictional-stranger@s.whatsapp.net'});
  const own=f.message('old-own-prompt','Copied prompt',{fromMe:true});
  const ignored=await f.batch('append',[own,old,stranger]);
  assert.deepEqual(ignored.selected,[]);
  assert.deepEqual(ignored.statuses,[]);
  assert.equal(f.replies.length,before);
  assert.deepEqual((await f.next('current-land-yes','1')).statuses,['sent']);
  assert.match(f.replies.at(-1).text,/PM-KISAN[\s\S]*2\. क्या पिछले आकलन वर्ष/u);
  assert.deepEqual(f.calls,{model:0,chat:0,speech:0,profile:0,interpret:0,download:0});
});
