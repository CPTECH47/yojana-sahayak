import test from 'node:test';
import assert from 'node:assert/strict';
import { extractProfileStatement } from './profile-extract.mjs';
import { createWhatsAppConversation } from './whatsapp-flow.mjs';
import { createVoiceFlow } from './voice-flow.mjs';
import { createAnswerService } from './answer-service.mjs';
import { loadPassages, retrieve } from './corpus.mjs';

const answers=createAnswerService({passages:loadPassages(),model:async()=>({fact_ids:[]})});

test('model cannot invent a role, income or income period',async()=>{
  const result=await extractProfileStatement('I am a farmer earning 500rs',{model:async()=>({role:'worker',income_period:'month',income_amount:999999})});
  assert.deepEqual(result,{role:'farmer',income_amount:500,income_period:null});
  assert.deepEqual(await extractProfileStatement('मैं किसान हूँ और ५०० रुपये मासिक कमाता हूँ',{model:async()=>({role:'farmer',income_period:'month'})}),{role:'farmer',income_amount:500,income_period:'month'});
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
  assert.match(await voice.handle('hi','1'),/मैंने समझा/u);
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
