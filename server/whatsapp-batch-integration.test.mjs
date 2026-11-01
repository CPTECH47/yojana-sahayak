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

test('standalone comparison role prompt also accepts a fresh mixed-batch choice',async()=>{
  const f=setup();
  assert.deepEqual((await f.next('compare-start','YOJANA SCHEMES')).statuses,['sent']);
  assert.equal(f.conversation.hasPendingPrompt(chat),true);
  f.advance(2000);
  const role=f.message('compare-role','1');
  const result=await f.batch('append',[f.message('own-role-menu','Choose role',{fromMe:true}),role]);
  assert.deepEqual(result.selected,[role]);
  assert.deepEqual(result.statuses,['sent']);
  assert.match(f.replies.at(-1).text,/PM-KISAN[\s\S]*cultivable land/u);
  assert.deepEqual(f.calls,{model:0,chat:0,speech:0,profile:0,interpret:0,download:0});
});

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

test('worker replies after a two-minute pause advance through either batch type to a cited highlighted result',async()=>{
  for(const type of ['notify','append']){
    const f=setup();
    for(const [id,text] of [['start','YOJANA START'],['english','2'],['worker','3'],['age-yes','1'],['income-yes','1']]){
      assert.deepEqual((await f.next(id,text)).statuses,['sent']);
    }
    assert.match(f.replies.at(-1).text,/3\. Do you work in the unorganised sector\?/u);
    f.advance(120000);
    const reply=f.message('unorganised-yes','1');
    const rows=type==='append'
      ? [f.message('own-worker-prompt','Worker prompt',{fromMe:true}),reply]
      : [reply];
    const advanced=await f.batch(type,rows);
    assert.deepEqual(advanced.selected,[reply]);
    assert.deepEqual(advanced.statuses,['sent']);
    assert.match(f.replies.at(-1).text,/4\. Are you covered by EPF, ESIC, or NPS\?/u);
    for(const id of ['pension-coverage-no','income-tax-no','other-pension-no']){
      assert.deepEqual((await f.next(id,'2')).statuses,['sent']);
    }
    // Other schemes can still have unanswered conditions; RESULTS selects the
    // completed worker match without inventing answers for those schemes.
    assert.deepEqual((await f.next('worker-results','YOJANA RESULTS')).statuses,['sent']);
    const result=f.replies.at(-1).text;
    assert.match(result,/\*Pradhan Mantri Shram Yogi Maandhan\*[\s\S]*Possible match/u);
    assert.match(result,/\*Key points:\*[\s\S]*• Benefit:[^\n]+\[\d+\]/u);
    assert.match(result,/• Source: Pradhan Mantri Shram Yogi Maandhan Yojana: Ministry information note, page \d+(?:, page \d+)* — https:\/\/www\.labour\.gov\.in\/static\/uploads\/2025\/07\/cdc13db52c1398b561576094a81b7b7d\.pdf \[\d+\]/u);
    assert.match(result,/Would you like help finding a nearby service centre\?\n1 Yes · 2 No/u);
    assert.deepEqual(f.calls,{model:0,chat:0,speech:0,profile:0,interpret:0,download:0});
  }
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
