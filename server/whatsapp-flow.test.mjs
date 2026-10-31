import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnswerService } from './answer-service.mjs';
import { loadPassages } from './corpus.mjs';
import { createWhatsAppConversation } from './whatsapp-flow.mjs';

const passages = loadPassages();
const service = createAnswerService({ passages });

function conversation(overrides = {}) {
  const calls = [];
  const answers = {
    recommend(input) { calls.push(input); return service.recommend(input); },
    async chat(input) { calls.push(input); return { answer_text: `${input.language}:${input.question}`, citations: [] }; },
    ...overrides,
  };
  return { flow: createWhatsAppConversation({ answers, match: (text, language) => `${language}:${text}`, passages }), calls };
}

async function startAndChoose(flow, jid = 'chat-a', language = '1') {
  await flow.handle(jid, 'START');
  return flow.handle(jid, language);
}

test('START asks language, then role, and farmer questions produce a sourced preliminary result', async () => {
  const { flow, calls } = conversation();
  assert.match(await flow.handle('chat-a', 'START'), /For Hindi, press 1/u);
  assert.match(await flow.handle('chat-a', 'START'), /Government scheme guidance/u);
  const roleMenu = await flow.handle('chat-a', '1');
  assert.match(roleMenu, /1 किसान/u);
  assert.match(roleMenu, /आधार, बैंक विवरण/u);
  assert.match(await flow.handle('chat-a', '1'), /PM-KISAN/u);
  await flow.handle('chat-a', 'yes');
  await flow.handle('chat-a', 'no');
  await flow.handle('chat-a', 'maybe');
  assert.match(await flow.handle('chat-a', 'maybe'), /जवाब समझ नहीं आया/u);
  await flow.handle('chat-a', 'no');
  const result = await flow.handle('chat-a', 'SKIP');
  assert.match(result, /अधिक जानकारी चाहिए/u);
  assert.match(result, /pmkisan.gov.in/u);
  assert.equal(calls[0].profile.scheme_id, 'pm-kisan');
  assert.equal(calls[0].profile.owns_cultivable_land, true);
  assert.equal(calls[0].profile.income_tax_payer_last_year, false);
  assert.equal(calls[0].profile.other_official_exclusion, null);
});

test('family questionnaire recommends PMUY only as a preliminary match with its sources', async () => {
  const { flow, calls } = conversation();
  await startAndChoose(flow);
  await flow.handle('chat-a', '5');
  await flow.handle('chat-a', 'yes');
  await flow.handle('chat-a', 'no');
  const result = await flow.handle('chat-a', 'yes');
  assert.match(result, /PMUY/u);
  assert.match(result, /संभावित मेल/u);
  assert.match(result, /pmuy.gov.in\/ujjwala2.html/u);
  assert.match(result, /आवश्यक दस्तावेज़/u);
  assert.match(result, /Common Service Centre/u);
  assert.match(result, /locator\.csccloud\.in/u);
  assert.equal(calls[0].profile.scheme_id, 'pmuy');
  assert.equal(calls[0].profile.household_has_existing_lpg, false);
});

test('recommendation reply keeps a short summary, groups repeated source pages, and offers the manual CSC locator', async () => {
  const { flow } = conversation({
    recommend() {
      return {
        results: [{
          scheme_name: 'PM-KISAN',
          status: 'not_matched',
          reasons: ['A listed professional is practising.'],
          citations: [
            { title: 'PM-KISAN Operational Guidelines', locator: 'page 2', url: 'https://example.gov/guidelines.pdf' },
            { title: 'PM-KISAN Operational Guidelines', locator: 'page 3', url: 'https://example.gov/guidelines.pdf' },
          ],
        }],
      };
    },
  });
  await startAndChoose(flow, 'chat-a', '2');
  await flow.handle('chat-a', '1');
  for (const answer of ['yes', 'no', 'yes']) await flow.handle('chat-a', answer);
  const result = await flow.handle('chat-a', 'no');
  assert.match(result, /Does not match one or more checked conditions/u);
  assert.match(result, /Preliminary check only/u);
  assert.match(result, /page 2, page 3/u);
  assert.equal((result.match(/Source:/gu) || []).length, 1);
  assert.match(result, /locator\.csccloud\.in/u);
  assert.match(result, /select your area there/u);
  assert.match(result, /If an answer was wrong/u);
  assert.match(result, /Required documents/u);
  assert.doesNotMatch(result, /Confirm with the official scheme portal or help desk/u);
});

test('worker questionnaire checks only sourced PM-SYM conditions, including income band', async () => {
  const { flow, calls } = conversation();
  await startAndChoose(flow, 'chat-a', '2');
  await flow.handle('chat-a', '3');
  for (const answer of ['yes', 'yes', 'yes', 'no', 'no', 'no']) await flow.handle('chat-a', answer);
  const result = await flow.handle('chat-a', 'START');
  assert.match(result, /भाषा चुनें/u);
  assert.equal(calls[0].profile.scheme_id, 'pm-sym');
  assert.equal(calls[0].profile.monthly_income_at_most_15000, true);
});

test('BACK repeats the previous question; CANCEL clears the active questionnaire', async () => {
  const { flow, calls } = conversation();
  await startAndChoose(flow);
  await flow.handle('chat-a', '1');
  await flow.handle('chat-a', 'yes');
  const previous = await flow.handle('chat-a', 'BACK');
  assert.match(previous, /खेती योग्य जमीन/u);
  assert.match(await flow.handle('chat-a', 'CANCEL'), /हटा दी गई/u);
  assert.equal(calls.length, 0);
});

test('student gets an information lead without a false current-eligibility match', async () => {
  const { flow, calls } = conversation();
  await startAndChoose(flow);
  const result = await flow.handle('chat-a', '2');
  assert.match(result, /वर्तमान पात्रता नियम सत्यापित नहीं/u);
  assert.match(result, /scholarships.gov.in/u);
  assert.equal(calls.length, 0);
});

test('each direct chat has its own language and profile state', async () => {
  const { flow, calls } = conversation();
  await flow.handle('a', 'START');
  await flow.handle('b', 'START');
  await flow.handle('a', '1');
  await flow.handle('b', '2');
  const hindiRole = await flow.handle('a', '2');
  const englishLead = await flow.handle('b', '2');
  assert.match(hindiRole, /NMMSS/u);
  assert.match(englishLead, /current eligibility rules/u);
  await flow.handle('a', 'PMUY eligibility');
  assert.deepEqual(calls.at(-1), { question: 'PMUY eligibility', language: 'hi' });
});

test('bare replies are accepted only while a chat is actively inside the questionnaire', async () => {
  const { flow } = conversation();
  assert.equal(flow.acceptsBareQuestionnaireReply('chat-a', '1'), false);
  await flow.handle('chat-a', 'START');
  assert.equal(flow.acceptsBareQuestionnaireReply('chat-a', '1'), true);
  await flow.handle('chat-a', '1');
  assert.equal(flow.acceptsBareQuestionnaireReply('chat-a', '1'), true);
  await flow.handle('chat-a', '1');
  assert.equal(flow.acceptsBareQuestionnaireReply('chat-a', 'YES'), true);
  await flow.handle('chat-a', 'YES');
  await flow.handle('chat-a', 'NO');
  await flow.handle('chat-a', 'NO');
  await flow.handle('chat-a', 'NO');
  assert.equal(flow.acceptsBareQuestionnaireReply('chat-a', 'what is PM-KISAN?'), false);
});
