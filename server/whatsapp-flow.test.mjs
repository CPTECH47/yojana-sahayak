import test from 'node:test';
import assert from 'node:assert/strict';
import { createWhatsAppConversation } from './whatsapp-flow.mjs';

function fakeConversation() {
  const calls = [];
  const conversation = createWhatsAppConversation({
    answers: { async chat(input) { calls.push(input); return { answer_text: `${input.language}:${input.question}`, citations: [] }; } },
    match(text, language) { calls.push({ text, language, kind: 'match' }); return `${language}:${text}`; },
  });
  return { conversation, calls };
}

test('START asks for language, selection shows next steps in that language, and questions use it', async () => {
  const { conversation, calls } = fakeConversation();
  const prompt = await conversation.handle('chat-a', 'start');
  assert.match(prompt, /Reply 1 for Hindi/u);
  const menu = await conversation.handle('chat-a', 'हिंदी');
  assert.match(menu, /अब मैं हिंदी में/u);
  assert.match(await conversation.handle('chat-a', 'प्रधानमंत्री किसान का लाभ?'), /hi:प्रधानमंत्री किसान/u);
  assert.deepEqual(calls[0], { question: 'प्रधानमंत्री किसान का लाभ?', language: 'hi' });
});

test('language preference is isolated per chat and can be switched', async () => {
  const { conversation, calls } = fakeConversation();
  await conversation.handle('chat-a', 'START');
  await conversation.handle('chat-a', '1');
  await conversation.handle('chat-b', 'START');
  await conversation.handle('chat-b', '2');
  await conversation.handle('chat-a', '2');
  await conversation.handle('chat-a', 'PMUY who can apply?');
  await conversation.handle('chat-b', 'PMUY who can apply?');
  assert.deepEqual(calls.map(call => call.language), ['en', 'en']);
});

test('numbered replies are simple language-selection aliases', async () => {
  const { conversation } = fakeConversation();
  assert.match(await conversation.handle('chat-a', 'YOJANA START'), /Reply 1 for Hindi/u);
  assert.equal(conversation.acceptsBareLanguageChoice('chat-a', '1'), true);
  assert.match(await conversation.handle('chat-a', '1'), /अब मैं हिंदी में/u);
  assert.equal(conversation.acceptsBareLanguageChoice('chat-a', '2'), false);
  assert.match(await conversation.handle('chat-b', '2'), /reply in English/u);
});

test('match instructions and cited answers follow the selected language', async () => {
  const calls = [];
  const conversation = createWhatsAppConversation({
    answers: { async chat(input) { return { answer_text: 'उत्तर', citations: [{ title: 'दस्तावेज़', locator: 'page 1', url: 'https://gov.example/source' }] }; } },
    match(text, language) { calls.push({ text, language }); return `${language}:match`; },
  });
  await conversation.handle('chat-a', 'START');
  await conversation.handle('chat-a', 'HINDI');
  assert.match(await conversation.handle('chat-a', 'MATCH yes no no'), /^hi:match/u);
  assert.match(await conversation.handle('chat-a', 'PM-KISAN राशि'), /स्रोत: दस्तावेज़, page 1/u);
  assert.deepEqual(calls, [{ text: 'MATCH yes no no', language: 'hi' }]);
});

test('messages without a selected language stay at onboarding', async () => {
  const { conversation, calls } = fakeConversation();
  assert.match(await conversation.handle('chat-a', 'PM-KISAN amount'), /Please choose a language/u);
  assert.equal(calls.length, 0);
});
