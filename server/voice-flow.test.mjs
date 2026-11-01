import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoiceFlow } from './voice-flow.mjs';
import { createWhatsAppConversation } from './whatsapp-flow.mjs';

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
  assert.match(await flow.handleAudio('a',Buffer.from('fictional')),/\*1\* भेजें/);
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
  assert.match(await flow.handleAudio('active-chat',Buffer.from('fake'),true),/\*1\* भेजें/);
  assert.equal(submitted,0);
  assert.equal(await flow.handle('active-chat','confirm'),'next question');
  assert.equal(submitted,1);
});

test('spoken number choices are applied only after confirmation to an active questionnaire',async()=>{
  const applied=[];
  const flow=createVoiceFlow({fallback:async(_id,text)=>{applied.push(text);return 'next'},isQuestionnaireReply:()=>true,transcribe:async()=>({text:'एक।',language:'hi'}),answers:{}});
  assert.match(await flow.handleAudio('chat',Buffer.from('fake'),true),/\*1\* भेजें/);
  assert.deepEqual(applied,[]);
  assert.equal(await flow.handle('chat','confirm'),'next');
  assert.deepEqual(applied,['1']);
});

test('confirmed spoken language and role choices advance the real conversation',async()=>{
  const answers={chat:async()=>({answer_text:'',citations:[]}),recommend:()=>({results:[]})};
  const conversation=createWhatsAppConversation({answers});
  let spoken='one';
  const flow=createVoiceFlow({answers,fallback:conversation.handle,isQuestionnaireReply:conversation.acceptsBareQuestionnaireReply,transcribe:async()=>({text:spoken,language:'en'})});
  await conversation.handle('chat','start');
  await flow.handleAudio('chat',Buffer.from('fake'),true);
  assert.match(await flow.handle('chat','confirm'),/किसान/);
  spoken='एक';
  await flow.handleAudio('chat',Buffer.from('fake'),true);
  assert.match(await flow.handle('chat','confirm'),/PM-KISAN/);
});

test('selected questionnaire language is passed as a speech hint',async()=>{
  let options;
  const flow=createVoiceFlow({fallback:async()=>'',answers:{},selectedLanguage:()=> 'hi',transcribe:async(_audio,value)=>{options=value;return {text:'एक',language:'hi'};}});
  await flow.handleAudio('chat',Buffer.from('fake'),true);
  assert.equal(options.language,'hi');
});

test('voice language menu describes the chosen language rather than the detected transcript language',async()=>{
  const answers={chat:async()=>({answer_text:'',citations:[]}),recommend:()=>({results:[]})};
  const conversation=createWhatsAppConversation({answers});
  let spoken='one';
  const flow=createVoiceFlow({answers,fallback:conversation.handle,isQuestionnaireReply:conversation.acceptsBareQuestionnaireReply,choosingLanguage:conversation.choosingLanguage,transcribe:async()=>({text:spoken,language:'en'})});
  await conversation.handle('a','START');
  assert.match(await flow.handleAudio('a',Buffer.from('fake'),true),/Option 1 selects \*Hindi/);
  assert.match(await flow.handle('a','confirm'),/किसान/);
  await conversation.handle('a','START');spoken='two';
  assert.match(await flow.handleAudio('a',Buffer.from('fake'),true),/Option 2 selects \*English/);
  assert.match(await flow.handle('a','confirm'),/Farmer/);
});

test('unclear language menu audio gets Hindi retry and never applies without confirmation',async()=>{
  const hints=[],submitted=[];
  const flow=createVoiceFlow({answers:{},choosingLanguage:()=>true,isQuestionnaireReply:()=>true,fallback:async(_id,v)=>{submitted.push(v);return 'next'},transcribe:async(_audio,{language})=>{hints.push(language);return language==='hi'?{text:'एक',language:'hi'}:{text:'I',language:'en'};}});
  assert.match(await flow.handleAudio('a',Buffer.from('fake'),true),/Option 1 selects \*Hindi/);
  assert.deepEqual(hints,[null,'hi']);assert.deepEqual(submitted,[]);
  assert.equal(await flow.handle('a','confirm'),'next');assert.deepEqual(submitted,['1']);
});

test('unrecognised language choice falls back to typing without guessing',async()=>{
  const flow=createVoiceFlow({answers:{},fallback:async()=>'',choosingLanguage:()=>true,transcribe:async()=>({text:'unclear',language:'en'})});
  assert.match(await flow.handleAudio('a',Buffer.from('fake'),true),/type 1 for Hindi or 2 for English/);
});

test('speech worker failure at language menu offers the typed choices',async()=>{
  const flow=createVoiceFlow({answers:{},fallback:async()=>'',choosingLanguage:()=>true,transcribe:async()=>{throw Error('voice worker inference failed')}});
  assert.match(await flow.handleAudio('a',Buffer.from('fake'),true),/type 1 for Hindi or 2 for English/);
});

test('a pending transcript can be corrected and confirmed with one keypress',async()=>{
  const submitted=[];
  const flow=createVoiceFlow({answers:{chat:async input=>{submitted.push(input);return {answer_text:'Cited reply',citations:[]};}},fallback:async()=>'',transcribe:async()=>({text:'PMG sound scheme',language:'en'})});
  await flow.handleAudio('chat',Buffer.from('fake'),true);
  assert.equal(flow.acceptsPendingChoice('chat','1'),true);
  assert.match(await flow.handle('chat','edit पीएम किसान में कितना मिलता है?'),/Corrected transcript/);
  assert.deepEqual(submitted,[]);
  assert.match(await flow.handle('chat','1'),/Cited reply/);
  assert.deepEqual(submitted,[{question:'पीएम किसान में कितना मिलता है?',language:'hi'}]);
  assert.equal(flow.acceptsPendingChoice('chat','1'),false);
});

test('two cancels a pending transcript without using it',async()=>{
  let calls=0;
  const flow=createVoiceFlow({answers:{chat:async()=>{calls++;}},fallback:async()=>'',transcribe:async()=>({text:'question',language:'en'})});
  await flow.handleAudio('chat',Buffer.from('fake'),true);
  assert.match(await flow.handle('chat','2'),/cancelled/);
  assert.equal(calls,0);
});

test('confirmed voice questions use conversation-aware answer routing',async()=>{
  const submitted=[];
  const flow=createVoiceFlow({answers:{},fallback:async()=>'',answerQuestion:async(id,question,language)=>{submitted.push({id,question,language});return 'Reviewed answer\nSource: official URL';},transcribe:async()=>({text:'How much money per year?',language:'en'})});
  await flow.handleAudio('chat',Buffer.from('fake'),true);
  assert.match(await flow.handle('chat','1'),/Source: official URL/);
  assert.deepEqual(submitted,[{id:'chat',question:'How much money per year?',language:'en'}]);
});
