import test from 'node:test';
import assert from 'node:assert/strict';
import { extractProfileStatement, interpretQuestionAnswer } from './profile-extract.mjs';
import { createWhatsAppConversation } from './whatsapp-flow.mjs';
import { createAnswerService } from './answer-service.mjs';

const unknownModel = async () => ({ role: 'unknown', income_period: 'unknown', claims: [] });

test('Hindi relatives and negation cannot become the applicant role or daily income', async () => {
  for (const text of ['मेरे पिता किसान हैं, मैं बेरोजगार हूँ', 'मैं नहीं हूँ किसान', 'मैं किसान नही हूँ']) {
    const result = await extractProfileStatement(text, { model: unknownModel });
    assert.equal(result.role, null, text);
    assert.equal(result.income_amount, null, text);
    assert.equal(result.income_period, null, text);
  }
});

test('personal role remains separate from a relative in a different clause', async () => {
  const result = await extractProfileStatement('मैं छात्र हूँ, मेरे पिता किसान हैं', { model: unknownModel });
  assert.equal(result.role, 'student');
  assert.equal((await extractProfileStatement('I am a student. My father is a farmer', { model: unknownModel })).role, 'student');
});

test('Hindi daily income uses full words and Devanagari amounts', async () => {
  const daily = await extractProfileStatement('मैं मजदूर हूँ और ५०० रुपये रोज कमाता हूँ', { model: unknownModel });
  assert.equal(daily.role, 'worker');
  assert.equal(daily.income_amount, 500);
  assert.equal(daily.income_period, 'day');
  const unemployed = await extractProfileStatement('मैं किसान हूँ, मेरी आय ५०० रुपये है, मैं बेरोजगार हूँ', { model: unknownModel });
  assert.equal(unemployed.income_period, null);
});

test('income cannot be borrowed from relatives, expenses, or conflicting amounts', async () => {
  for (const text of [
    'I am a worker. My father earns 500rs monthly',
    'I am a worker. My father is a farmer and earns 500rs monthly',
    'I am a worker with expenses of 500rs monthly',
    'I am a worker. I earn 500rs daily and earn 10000rs monthly',
    'I am a worker earning -500 rupees monthly'
  ]) {
    const result = await extractProfileStatement(text, { model: unknownModel });
    assert.equal(result.income_amount, null, text);
    assert.equal(result.income_period, null, text);
  }
});

test('contradictory role statements require clarification', async () => {
  const result = await extractProfileStatement('I am a farmer. I am not a farmer', { model: unknownModel });
  assert.equal(result.role, null);
});

test('the normal Hindi chat route clarifies third-person descriptions before any match', async () => {
  const flow = createWhatsAppConversation({
    answers: createAnswerService(),
    extractProfile: text => extractProfileStatement(text, { model: unknownModel })
  });
  await flow.handle('fictional-hindi', 'START');
  const response = await flow.handle('fictional-hindi', 'मेरे पिता किसान हैं, मैं बेरोजगार हूँ');
  assert.match(response, /भूमिका स्पष्ट नहीं/u);
  assert.doesNotMatch(response, /मैंने आपकी बात से यह समझा|प्रतिदिन/u);
});

test('a null model response keeps explicit details and does not crash the conversation', async () => {
  const result = await extractProfileStatement('I am a farmer earning 500rs', { model: async () => null });
  assert.equal(result.role, 'farmer');
  assert.equal(result.income_amount, 500);
});

test('a quoted fragment cannot remove negation or a third-person subject', async () => {
  const model = async () => ({ answer: 'yes', quote: 'own cultivable land' });
  assert.equal(await interpretQuestionAnswer('I do not own cultivable land', 'owns_cultivable_land', { model }), null);
  const relative = async () => ({ answer: 'yes', quote: 'aged 30' });
  assert.equal(await interpretQuestionAnswer('My father is aged 30', 'age_18_to_40', { model: relative }), null);
  assert.equal(await interpretQuestionAnswer('If I own cultivable land, can I apply?', 'owns_cultivable_land', { model }), null);
});

test('contradictory descriptions stay unknown in single-question interpretation', async () => {
  const result = await interpretQuestionAnswer('I own cultivable land, but I do not own land', 'owns_cultivable_land', {
    model: async () => ({ answer: 'yes', quote: 'I own cultivable land' })
  });
  assert.equal(result, null);
});

test('missing monthly income still asks the income question after profile confirmation', async () => {
  const flow = createWhatsAppConversation({
    answers: createAnswerService(),
    extractProfile: async () => ({ role: 'worker', income_amount: null, income_period: 'month', facts: {} })
  });
  await flow.handle('fictional-worker', 'START');
  await flow.handle('fictional-worker', 'I am a worker');
  await flow.handle('fictional-worker', '1');
  const question = await flow.handle('fictional-worker', '1');
  assert.match(question, /monthly income/i);
});

test('back from income period preserves previously confirmed scheme facts', async () => {
  const flow = createWhatsAppConversation({
    answers: createAnswerService(),
    extractProfile: async () => ({
      role: 'farmer', income_amount: 500, income_period: null,
      facts: { owns_cultivable_land: true, income_tax_payer_last_year: false }
    })
  });
  await flow.handle('fictional-farmer', 'START');
  await flow.handle('fictional-farmer', 'I am a farmer earning 500rs');
  await flow.handle('fictional-farmer', '1');
  await flow.handle('fictional-farmer', '6');
  await flow.handle('fictional-farmer', '1');
  const question = await flow.handle('fictional-farmer', '3');
  assert.match(question, /3\/4.*doctor/u);
  assert.doesNotMatch(question, /1\/4.*land/u);
});
