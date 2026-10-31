import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoiceFlow } from './voice-flow.mjs';

test('voice requires opt-in and confirmation before a cited answer', async()=>{
  let calls=0;
  const flow=createVoiceFlow({
    fallback:async()=> 'normal',
    transcribe:async()=>({text:'PM-KISAN के लाभ क्या हैं?',language:'hi'}),
    answers:{chat:async input=>{calls++;assert.equal(input.language,'hi');return {answer_text:'जाँची गई जानकारी',citations:[{title:'Official source',locator:'page 2',url:'https://example.gov/source'}]};}},
  });
  assert.equal(flow.acceptsAudio('a'),false);
  assert.match(await flow.handle('a','voice'),/Send one short/);
  assert.equal(flow.acceptsAudio('a'),true);
  assert.match(await flow.handleAudio('a',Buffer.from('fictional')),/YOJANA CONFIRM/);
  assert.equal(calls,0);
  const response=await flow.handle('a','confirm');
  assert.equal(calls,1);assert.match(response,/Official source/);assert.match(response,/जाँची गई जानकारी/);
  assert.equal(flow.acceptsAudio('a'),false);
});

test('cancelled, expired and failed voice questions are not submitted',async()=>{
  let time=0,calls=0;
  const flow=createVoiceFlow({now:()=>time, fallback:async()=> 'normal', transcribe:async()=>({text:'test',language:'en'}), answers:{chat:async()=>{calls++;}}});
  await flow.handle('a','voice');await flow.handleAudio('a',Buffer.from('fake'));await flow.handle('a','cancel');
  assert.equal(await flow.handle('a','confirm'),'normal');
  await flow.handle('b','voice');time=300001;assert.equal(flow.acceptsAudio('b'),false);assert.equal(calls,0);
  await flow.handle('c','voice');await flow.handle('c','cancel');assert.equal(flow.acceptsAudio('c'),false);
  const failing=createVoiceFlow({fallback:async()=>'',transcribe:async()=>{throw Error();},answers:{}});
  await failing.handle('x','voice');assert.match(await failing.handleAudio('x',Buffer.from('fake')),/could not be transcribed/);
});

test('voice notes in an active conversation work without the voice command and require confirmation',async()=>{
  let submitted=0;
  const flow=createVoiceFlow({fallback:async()=>{submitted++;return 'next question'},isQuestionnaireReply:()=>true,transcribe:async()=>({text:'हाँ',language:'hi'}),answers:{}});
  assert.equal(await flow.handleAudio('personal-chat',Buffer.from('fake')),null);
  assert.match(await flow.handleAudio('active-chat',Buffer.from('fake'),true),/YOJANA CONFIRM/);
  assert.equal(submitted,0);
  assert.equal(await flow.handle('active-chat','confirm'),'next question');
  assert.equal(submitted,1);
});
