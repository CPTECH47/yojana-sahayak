import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnswerService } from './answer-service.mjs';
import { loadPassages } from './corpus.mjs';
import { createWhatsAppConversation } from './whatsapp-flow.mjs';
import { createVoiceFlow } from './voice-flow.mjs';

const answers=createAnswerService({passages:loadPassages(),model:async()=>({fact_ids:[]})});
const make=(options={})=>createWhatsAppConversation({answers,multiScheme:true,discoverSchemes:async()=>({leads:[],pending:[]}),...options});

test('comparison clarifies income period and retains confirmed land answer',async()=>{
  const flow=make({extractProfile:async()=>({role:'farmer',income_amount:500,income_period:null,facts:{owns_cultivable_land:true}})});
  await flow.handle('p','START');await flow.handle('p','I am a farmer earning 500rs');
  assert.match(await flow.handle('p','1'),/which period/u);
  const next=await flow.handle('p','3');
  assert.match(next,/income tax/u);
  assert.doesNotMatch(next,/Does your farmer family own cultivable land/u);
});

test('comparison result offers CSC consent before location, even for partial result',async()=>{
  const flow=make();
  await flow.handle('c','START');await flow.handle('c','2');await flow.handle('c','1');
  const result=await flow.handle('c','RESULTS');
  assert.match(result,/Would you like help finding a nearby service centre\?[\s\S]*1 Yes · 2 No/u);
  assert.doesNotMatch(result,/Missing answer:/u);
  assert.match(await flow.handle('c','1'),/PIN code/u);
  assert.match(await flow.handle('c','Delhi'),/locator.csccloud.in/u);
});

test('comparison interprets a descriptive answer only after confirmation',async()=>{
  const flow=make({interpretAnswer:async(text,field)=>field==='owns_cultivable_land'&&/own cultivable land/iu.test(text)?true:null});
  await flow.handle('a','START');await flow.handle('a','2');await flow.handle('a','1');
  assert.match(await flow.handle('a','I own cultivable land'),/1 Confirm/u);
  assert.match(await flow.handle('a','1'),/income tax/u);
});

test('voice profile during comparison replaces old check before confirmation',async()=>{
  const flow=make({extractProfile:async()=>({role:'worker',income_amount:null,income_period:null,facts:{}})});
  const voice=createVoiceFlow({answers,transcribe:async()=>({text:'I am a worker',language:'en'}),fallback:flow.handle,profileStatement:flow.handleProfileStatement,isProfileStatement:flow.isProfileStatement,isQuestionnaireReply:flow.acceptsBareQuestionnaireReply,choosingLanguage:flow.choosingLanguage});
  await flow.handle('v','START');await flow.handle('v','2');await flow.handle('v','1');
  await voice.handleAudio('v',Buffer.from('sample'),true);
  assert.match(await voice.handle('v','1'),/Are all these details correct/u);
  const next=await flow.handle('v','1');
  assert.match(next,/Shram Yogi Maandhan/u);
  assert.doesNotMatch(next,/income tax in the last assessment year/u);
});
