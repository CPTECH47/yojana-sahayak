import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnswerService } from './answer-service.mjs';
import { createWhatsAppConversation } from './whatsapp-flow.mjs';
import { compareProfiles } from './scheme-comparison.mjs';

const service = createAnswerService();
test('multiple profiles rank sourced matches ahead of unknown and failed checks', () => {
  const result = service.recommend({ profiles: [
    { scheme_id: 'pm-kisan', owns_cultivable_land: false },
    { scheme_id: 'pm-sym' },
    { scheme_id: 'pmuy', adult_woman_18_plus: true, household_has_existing_lpg: false, can_submit_deprivation_declaration: true }
  ] });
  assert.equal(result.results[0].scheme_id, 'pmuy');
  assert.deepEqual(result.results[0].condition_counts, { total: 3, met: 3, failed: 0, unknown: 0 });
  assert.equal(result.results[1].status, 'needs_information');
  assert.equal(result.results[2].status, 'not_matched');
  assert.ok(result.results.every(item => item.citations.length && item.official_decision === false));
  assert.equal(result.ranking_basis, 'reviewed_condition_coverage');
  assert.equal('probability' in result, false);
});

test('missing evidence never contributes to the ranking', () => {
  const result = compareProfiles({ profiles: [{ scheme_id: 'pmuy' }] }, () => ({ status: 'insufficient_evidence', results: [] }));
  assert.equal(result.status, 'insufficient_evidence');
  assert.deepEqual(result.unavailable_schemes, ['pmuy']);
  assert.deepEqual(result.results, []);
});

test('the legacy API default remains PM-KISAN and invalid bulk inputs are bounded', () => {
  assert.equal(service.recommend({ profile: {} }).results[0].scheme_id, 'pm-kisan');
  for (const profiles of [[], [null], [{ scheme_id: 'invented' }], [{ scheme_id: 'pmuy' }, { scheme_id: 'pmuy' }]]) {
    assert.equal(service.recommend({ profiles }).status, 'invalid_request');
  }
});

test('all five roles reach a reviewed multi-scheme question through the WhatsApp entry point', async () => {
  for (const role of ['1', '2', '3', '4', '5']) {
    const flow = createWhatsAppConversation({ answers: service });
    await flow.handle('sample', 'START');
    await flow.handle('sample', '2');
    assert.match(await flow.handle('sample', 'SCHEMES'), /Choose your role/u);
    const question = await flow.handle('sample', role);
    assert.match(question, /\n1\./u);
    assert.match(question, /1 Yes.*2 No/u);
    assert.equal(flow.acceptsBareQuestionnaireReply('sample', '4'), true);
    assert.match(await flow.handle('sample', '5'), /cancelled/u);
  }
});

test('Hindi comparison skips excluded schemes, keeps unknowns and supports correction', async () => {
  const flow = createWhatsAppConversation({ answers: service });
  await flow.handle('sample', 'START'); await flow.handle('sample', '1');
  await flow.handle('sample', 'SCHEMES');
  assert.match(await flow.handle('sample', '1'), /खेती योग्य/u);
  // No land excludes PM-KISAN. Out-of-range age excludes PM-SYM.
  assert.match(await flow.handle('sample', '2'), /आयु/u);
  assert.match(await flow.handle('sample', '2'), /महिला/u);
  await flow.handle('sample', '4'); await flow.handle('sample', '4');
  const result = await flow.handle('sample', '4');
  assert.match(result, /अज्ञात/u);
  assert.match(result, /YOJANA START/u);
  assert.match(result, /pmkisan.gov.in/u);
  assert.match(await flow.handle('sample', 'EDIT 1'), /खेती योग्य/u);
  assert.match(await flow.handle('sample', '1'), /आयकर/u);
  assert.match(await flow.handle('sample', 'START'), /Choose your language/u);
});

test('comparison back revisits the answer that excluded a scheme', async () => {
  const flow = createWhatsAppConversation({ answers: service });
  await flow.handle('sample', 'SCHEMES'); await flow.handle('sample', '1');
  await flow.handle('sample', '2');
  assert.match(await flow.handle('sample', '3'), /cultivable land/u);
  assert.match(await flow.handle('sample', '1'), /income tax/u);
});
