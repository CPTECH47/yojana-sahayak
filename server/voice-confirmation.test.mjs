import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoiceFlow } from './voice-flow.mjs';
import { createWhatsAppConversation } from './whatsapp-flow.mjs';

test('Hindi and English language selection can finish using voice only', async()=>{
  for(const [language,confirmation,expected] of [['हिंदी','हाँ।',/1 किसान/],['English','Yes.',/1 Farmer/]]){
    const answers={};
    const conversation=createWhatsAppConversation({answers,naturalFlow:false});
    let spoken=language;
    const voice=createVoiceFlow({answers,fallback:conversation.handle,choosingLanguage:conversation.choosingLanguage,isQuestionnaireReply:conversation.acceptsBareQuestionnaireReply,transcribe:async()=>({text:spoken,language:'en'})});
    await conversation.handle('fictional','START');
    assert.match(await voice.handleAudio('fictional',Buffer.from('fake'),true),/No typing needed/);
    assert.equal(voice.acceptsAudio('fictional'),true);
    spoken=confirmation;
    assert.match(await voice.handleAudio('fictional',Buffer.from('fake'),true),expected);
    assert.equal(voice.hasPendingPrompt('fictional'),false);
  }
});

test('spoken confirmation submits the original question once, never the confirmation text',async()=>{
  const submitted=[];let spoken='What is PM-KISAN?';
  const voice=createVoiceFlow({answers:{},fallback:async()=>'',answerQuestion:async(_id,text)=>{submitted.push(text);return 'Cited answer';},transcribe:async()=>({text:spoken,language:'en'})});
  await voice.handle('a','voice');
  await voice.handleAudio('a',Buffer.from('fake'));
  spoken='confirm';
  assert.equal(await voice.handleAudio('a',Buffer.from('fake')),'Cited answer');
  assert.deepEqual(submitted,['What is PM-KISAN?']);
  assert.equal(await voice.handleAudio('a',Buffer.from('fake')),null);
});

test('unclear or failed spoken confirmation preserves the original pending transcript',async()=>{
  let result={text:'original question',language:'en'},calls=0;
  const voice=createVoiceFlow({answers:{chat:async({question})=>{calls++;assert.equal(question,'original question');return {answer_text:'answer'};}},fallback:async()=>'',transcribe:async()=>{if(result instanceof Error)throw result;return result;}});
  await voice.handle('a','voice');await voice.handleAudio('a',Buffer.from('fake'));
  for(result of [{text:'yes but no',language:'en'},{text:'yes',language:'en',languageUncertain:true},new Error('unavailable')]){
    await voice.handleAudio('a',Buffer.from('fake'));
    assert.equal(voice.hasPendingPrompt('a'),true);assert.equal(calls,0);
  }
  result={text:'yes',language:'en'};
  assert.equal(await voice.handleAudio('a',Buffer.from('fake')),'answer');
  assert.equal(calls,1);
});

test('spoken retry lets a standalone voice user re-record without typing VOICE',async()=>{
  let spoken='old question';const submitted=[];
  const voice=createVoiceFlow({answers:{},fallback:async()=>'',answerQuestion:async(_id,text)=>{submitted.push(text);return 'answer';},transcribe:async()=>({text:spoken,language:'en'})});
  await voice.handle('a','voice');await voice.handleAudio('a',Buffer.from('fake'));
  spoken='record again';assert.match(await voice.handleAudio('a',Buffer.from('fake')),/cancelled/);
  assert.equal(voice.acceptsAudio('a'),true);
  spoken='replacement question';await voice.handleAudio('a',Buffer.from('fake'));
  spoken='one';await voice.handleAudio('a',Buffer.from('fake'));
  assert.deepEqual(submitted,['replacement question']);
});

test('expiry while transcribing confirmation never applies the old question',async()=>{
  let time=0,calls=0;
  const voice=createVoiceFlow({now:()=>time,answers:{chat:async()=>{calls++;}},fallback:async()=>'',transcribe:async()=>{if(time)time=400000;return {text:time?'yes':'question',language:'en'};}});
  await voice.handle('a','voice');await voice.handleAudio('a',Buffer.from('fake'));
  time=1;assert.match(await voice.handleAudio('a',Buffer.from('fake')),/expired/);
  assert.equal(calls,0);
});
