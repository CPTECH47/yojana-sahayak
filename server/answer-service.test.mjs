import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnswerService } from './answer-service.mjs';
import { loadPassages, retrieve } from './corpus.mjs';

const passages = loadPassages();

test('retrieval selects a real source passage with a page locator', () => {
  const hits = retrieve(passages, 'PM-KISAN income tax exclusion', 'pm-kisan');
  assert.ok(hits.length > 0);
  assert.equal(hits[0].scheme_id, 'pm-kisan');
  assert.match(hits[0].locator, /page|article/);
});

test('an unseen Hindi question uses translated retrieval and cites only selected evidence', async () => {
  let call = 0;
  const model = async () => {
    call += 1;
    return call === 1 ? { query_en: 'PM-KISAN financial benefit 6000 per year' } : { answer_text: 'सालाना ₹6,000', evidence_ids: ['pmkisan-guidelines:2'] };
  };
  const result = await createAnswerService({ passages, model }).chat({ question: 'पीएम किसान में कितनी राशि मिलती है?', language: 'hi' });
  assert.equal(result.status, 'answered');
  assert.equal(result.citations[0].evidence_id, 'pmkisan-guidelines:2');
  assert.equal(result.language, 'hi');
});

test('unsupported amounts and missing evidence are refused', async () => {
  const falseAmount = createAnswerService({ passages, model: async () => ({ answer_text: 'Rs 50000 monthly', evidence_ids: ['pmkisan-guidelines:2'] }) });
  const result = await falseAmount.chat({ question: 'PM-KISAN benefit amount?', language: 'en' });
  assert.equal(result.status, 'insufficient_evidence');
  assert.equal(result.reason_code, 'unsupported_claim');
  assert.deepEqual(result.citations, []);
  const unknown = await falseAmount.chat({ question: 'How much does the fictional Moon Farmer Scheme pay?', language: 'en' });
  assert.equal(unknown.reason_code, 'no_evidence');
});

test('fictional profiles produce preliminary, excluded and missing-information results', () => {
  const service = createAnswerService({ passages });
  const base = { owns_cultivable_land: true, income_tax_payer_last_year: false, practising_registered_professional: false, other_official_exclusion: false };
  assert.equal(service.recommend({ profile: base }).results[0].status, 'potential_match');
  assert.equal(service.recommend({ profile: { ...base, income_tax_payer_last_year: true } }).results[0].status, 'not_matched');
  const unknown = service.recommend({ profile: { ...base, other_official_exclusion: null } }).results[0];
  assert.equal(unknown.status, 'needs_information');
  assert.deepEqual(unknown.missing_fields, ['other_official_exclusion']);
  assert.equal(unknown.official_decision, false);
});
