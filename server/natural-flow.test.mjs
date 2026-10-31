import test from 'node:test';
import assert from 'node:assert/strict';
import { extractProfileStatement, interpretQuestionAnswer } from './profile-extract.mjs';
import { createWhatsAppConversation } from './whatsapp-flow.mjs';
import { createVoiceFlow } from './voice-flow.mjs';
import { createAnswerService } from './answer-service.mjs';
import { loadPassages, retrieve } from './corpus.mjs';

const answers=createAnswerService({passages:loadPassages(),model:async()=>({fact_ids:[]})});

test('model cannot invent a role, income or income period',async()=>{
  const result=await extractProfileStatement('I am a farmer earning 500rs',{model:async()=>({role:'worker',income_period:'month',income_amount:999999})});
  assert.deepEqual(result,{role:'farmer',income_amount:500,income_period:null,facts:{}});
  assert.deepEqual(await extractProfileStatement('मैं किसान हूँ और ५०० रुपये मासिक कमाता हूँ',{model:async()=>({role:'farmer',income_period:'month'})}),{role:'farmer',income_amount:500,income_period:'month',facts:{}});
  assert.equal((await extractProfileStatement('I am not a farmer',{model:async()=>({role:'farmer',income_period:'unknown'})})).role,null);
  assert.equal((await extractProfileStatement('My father is a farmer',{model:async()=>({role:'farmer',income_period:'unknown'})})).role,null);
});

test('free-form farmer profile confirms income period, then asks one sourced question at a time and keeps CSC',async()=>{
  const flow=createWhatsAppConversation({answers,extractProfile:async()=>({role:'farmer',income_amount:500,income_period:null})});
  assert.match(await flow.handle('a','START'),/\*YOJANA START\*/);
  assert.equal(flow.acceptsBareQuestionnaireReply('a','I am a farmer earning 500rs'),true);
  assert.match(await flow.handle('a','I am a farmer earning 500rs'),/period unclear/);
  assert.match(await flow.handle('a','1'),/which period/);
  assert.match(await flow.handle('a','3'),/1\/4.*land/u);
  assert.match(await flow.handle('a','unclear'),/\*YOJANA START\*/);
  assert.match(await flow.handle('a','1'),/2\/4.*income tax/u);
  assert.match(await flow.handle('a','2'),/3\/4.*doctor/u);
  assert.match(await flow.handle('a','2'),/4\/4.*exclusion/u);
  const result=await flow.handle('a','4');
  assert.match(result,/pmkisan.gov.in/u);
  assert.match(result,/nearby service centre[\s\S]*1 Yes · 2 No/u);
  assert.match(await flow.handle('a','1'),/PIN code/u);
  assert.match(await flow.handle('a','Delhi'),/locator.csccloud.in/u);
  assert.match(await flow.handle('a','MORE'),/PM-SYM[\s\S]*Source:[\s\S]*1\/6/u);
});

test('monthly worker income is used only after confirmation and the known question is skipped',async()=>{
  const flow=createWhatsAppConversation({answers,extractProfile:async()=>({role:'worker',income_amount:500,income_period:'month'})});
  await flow.handle('w','START');
  await flow.handle('w','I am a worker earning 500rs monthly');
  assert.match(await flow.handle('w','1'),/1\/6.*between 18 and 40/u);
  assert.match(await flow.handle('w','1'),/3\/6.*unorganised sector/u);
});

test('voice statement after greeting is confirmed before profile extraction',async()=>{
  let extracted=0;
  const flow=createWhatsAppConversation({answers,extractProfile:async()=>{extracted++;return {role:'farmer',income_amount:500,income_period:null};}});
  const voice=createVoiceFlow({answers,transcribe:async()=>({text:'I am a farmer earning 500rs',language:'en'}),fallback:flow.handle,profileStatement:flow.handleProfileStatement,isProfileStatement:flow.isProfileStatement,isQuestionnaireReply:flow.acceptsBareQuestionnaireReply,choosingLanguage:flow.choosingLanguage});
  await flow.handle('v','START');
  assert.match(await voice.handleAudio('v',Buffer.from('sample'),true),/I heard \(English\)/u);
  assert.equal(extracted,0);
  assert.match(await voice.handle('v','1'),/I understood: farmer/u);
  assert.equal(extracted,1);
});

test('Hindi voice profile and spoken period stay in the numbered flow',async()=>{
  let spoken='मैं किसान हूँ और ५०० रुपये कमाता हूँ';
  const flow=createWhatsAppConversation({answers,extractProfile:async()=>({role:'farmer',income_amount:500,income_period:null})});
  const voice=createVoiceFlow({answers,transcribe:async()=>({text:spoken,language:'hi'}),fallback:flow.handle,profileStatement:flow.handleProfileStatement,isProfileStatement:flow.isProfileStatement,isQuestionnaireReply:flow.acceptsBareQuestionnaireReply,choosingLanguage:flow.choosingLanguage});
  await flow.handle('hi','START');
  assert.match(await voice.handleAudio('hi',Buffer.from('sample'),true),/मैंने सुना/u);
  assert.match(await voice.handle('hi','1'),/मैंने आपकी बात से यह समझा/u);
  assert.match(await flow.handle('hi','1'),/कितने समय की आय/u);
  spoken='तीन';
  await voice.handleAudio('hi',Buffer.from('sample'),true);
  assert.match(await voice.handle('hi','1'),/खेती योग्य जमीन/u);
});

test('numbered cancel and back work while confirming a natural profile',async()=>{
  const flow=createWhatsAppConversation({answers,extractProfile:async()=>({role:'farmer',income_amount:500,income_period:null})});
  await flow.handle('c','START');await flow.handle('c','I am a farmer earning 500rs');
  assert.match(await flow.handle('c','3'),/cancelled/u);
  await flow.handle('c','START');await flow.handle('c','I am a farmer earning 500rs');
  await flow.handle('c','1');
  assert.match(await flow.handle('c','6'),/Back to your profile/u);
});

test('feature switch keeps the previous language menu and does not parse free-form profiles',async()=>{
  const flow=createWhatsAppConversation({answers,naturalFlow:false});
  assert.doesNotMatch(await flow.handle('old','START'),/voice or text/u);
  assert.equal(flow.isProfileStatement('I am a farmer'),false);
  assert.equal(flow.acceptsBareQuestionnaireReply('old','I am a farmer'),false);
});

test('Hindi query terms retrieve an approved English source passage in the same scheme',()=>{
  const hit=retrieve([{id:'x',scheme_id:'pm-kisan',title:'Farmer benefit',text:'The farmer benefit amount is paid annually.'}], 'किसान राशि', 'pm-kisan');
  assert.equal(hit[0]?.id,'x');
});

test('confirmed free-form facts skip already answered scheme questions',async()=>{
  const sentence='I am a farmer. I own cultivable land. I did not pay income tax last year.';
  const extracted=await extractProfileStatement(sentence,{model:async()=>({role:'farmer',income_period:'unknown',claims:[
    {field:'owns_cultivable_land',value:true,quote:'I own cultivable land'},
    {field:'income_tax_payer_last_year',value:false,quote:'I did not pay income tax last year'},
  ]})});
  assert.deepEqual(extracted.facts,{owns_cultivable_land:true,income_tax_payer_last_year:false});
  const flow=createWhatsAppConversation({answers,extractProfile:async()=>extracted});
  await flow.handle('facts','START');
  assert.match(await flow.handle('facts',sentence),/own cultivable land/u);
  const next=await flow.handle('facts','1');
  assert.match(next,/2\/4 conditions/u);
  assert.match(next,/3\/4.*doctor/u);
  assert.doesNotMatch(next,/1\/4.*land/u);
});

test('fabricated, contradictory, or unsupported model claims do not become profile facts',async()=>{
  const text='I am a farmer. I own cultivable land.';
  const result=await extractProfileStatement(text,{model:async()=>({role:'farmer',income_period:'unknown',claims:[
    {field:'owns_cultivable_land',value:false,quote:'I own cultivable land'},
    {field:'income_tax_payer_last_year',value:false,quote:'I did not pay income tax last year'},
    {field:'practising_registered_professional',value:false,quote:'I am a farmer'},
  ]})});
  assert.deepEqual(result.facts,{owns_cultivable_land:true});
  assert.equal(await interpretQuestionAnswer('I own cultivable land','owns_cultivable_land',{model:async()=>({answer:'no',quote:'I own cultivable land'})}),null);
  assert.equal(await interpretQuestionAnswer('I own cultivable land','owns_cultivable_land',{model:async()=>({answer:'yes',quote:'I own cultivable land'})}),true);
});

test('a descriptive question answer is confirmed before the next condition',async()=>{
  const flow=createWhatsAppConversation({answers,interpretAnswer:async(text,field)=>text.toLowerCase()==='i own cultivable land'&&field==='owns_cultivable_land'?true:null});
  await flow.handle('answer','START');await flow.handle('answer','2');await flow.handle('answer','1');
  assert.match(await flow.handle('answer','I own cultivable land'),/1 Confirm/u);
  assert.match(await flow.handle('answer','2'),/1\/4.*land/u);
  await flow.handle('answer','I own cultivable land');
  assert.match(await flow.handle('answer','1'),/2\/4.*income tax/u);
});

test('a confirmed voice description reaches the same answer confirmation',async()=>{
  const flow=createWhatsAppConversation({answers,interpretAnswer:async(text,field)=>text.toLowerCase()==='i own cultivable land'&&field==='owns_cultivable_land'?true:null});
  const voice=createVoiceFlow({answers,transcribe:async()=>({text:'I own cultivable land',language:'en'}),fallback:flow.handle,profileStatement:flow.handleProfileStatement,isProfileStatement:flow.isProfileStatement,isQuestionnaireReply:flow.acceptsBareQuestionnaireReply,choosingLanguage:flow.choosingLanguage});
  await flow.handle('voice-fact','START');await flow.handle('voice-fact','2');await flow.handle('voice-fact','1');
  assert.match(await voice.handleAudio('voice-fact',Buffer.from('sample'),true),/I heard \(English\)/u);
  assert.match(await voice.handle('voice-fact','1'),/1 Confirm/u);
  assert.match(await flow.handle('voice-fact','1'),/2\/4.*income tax/u);
});
