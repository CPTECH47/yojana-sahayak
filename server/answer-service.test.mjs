import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnswerService } from './answer-service.mjs';
import { loadPassages, retrieve } from './corpus.mjs';
import { topicFor } from './verified-facts.mjs';

const passages = loadPassages();

test('retrieval selects a real source passage with a page locator', () => {
  const hits = retrieve(passages, 'PM-KISAN income tax exclusion', 'pm-kisan');
  assert.ok(hits.length > 0);
  assert.equal(hits[0].scheme_id, 'pm-kisan');
  assert.match(hits[0].locator, /page|article/);
});

test('an unseen Hindi question selects reviewed facts and renders pinned Hindi text', async () => {
  const model = async () => ({fact_ids:['pmkisan-home-2026:1']});
  const result = await createAnswerService({ passages, model }).chat({ question: 'पीएम किसान में कितनी राशि मिलती है?', language: 'hi' });
  assert.equal(result.status, 'answered');
  assert.equal(result.citations[0].evidence_id, 'pmkisan-home-2026:1');
  assert.match(result.answer_text,/सालाना ₹6,000/u);
  assert.equal(result.language, 'hi');
});

test('unsupported amounts and missing evidence are refused', async () => {
  const falseAmount = createAnswerService({ passages, model: async () => ({ answer_text: 'Rs 50000 monthly', evidence_ids: ['pmkisan-guidelines:2'] }) });
  const result = await falseAmount.chat({ question: 'PM-KISAN benefit amount?', language: 'en' });
  assert.equal(result.status, 'insufficient_evidence');
  assert.equal(result.reason_code, 'unsupported_selection');
  assert.deepEqual(result.citations, []);
  const unknown = await falseAmount.chat({ question: 'How much does the fictional Moon Farmer Scheme pay?', language: 'en' });
  assert.equal(unknown.reason_code, 'choose_scheme');
  const invalidScheme = await falseAmount.chat({ question: 'What does PM-KISAN pay?', scheme_id: 'fictional-scheme' });
  assert.equal(invalidScheme.reason_code, 'unknown_scheme');
});

test('a known scheme name alone asks a useful clarifying question', async () => {
  const service = createAnswerService({ passages, model: async () => { throw new Error('model should not run'); } });
  const result = await service.chat({ question: 'PM KISAN' });
  assert.equal(result.status, 'clarify');
  assert.equal(result.reason_code, 'missing_intent');
});

test('common free-form overview and scheme questions map to reviewed topics in English and Hindi', () => {
  assert.equal(topicFor('What is PM-KISAN?'), 'overview');
  assert.equal(topicFor('Tell me about PM Vishwakarma'), 'overview');
  assert.equal(topicFor('पीएम-एसवाईएम क्या है?'), 'overview');
  assert.equal(topicFor('What documents do I need for PMUY?'), 'documents');
  assert.equal(topicFor('NMMSS की आखिरी तारीख क्या है?'), 'deadline');
  assert.equal(topicFor('PM-SYM में कितनी पेंशन मिलती है?'), 'benefit');
});

test('overview questions answer from a pinned scheme fact and keep its citation', async () => {
  const service = createAnswerService({ passages, model: async (_messages, schema) => {
    const fact = schema.properties.fact_ids.items.enum.find(id => id === 'pmvishwakarma-scheme-booklet-2025:1');
    return { fact_ids: [fact] };
  } });
  const result = await service.chat({ question: 'What is PM Vishwakarma?', language: 'en' });
  assert.equal(result.status, 'answered');
  assert.match(result.answer_text, /MSME 2025 booklet/u);
  assert.equal(result.citations[0].evidence_id, 'pmvishwakarma-scheme-booklet-2025:1');
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

test('PMUY recommendation uses its reviewed questions and says it is preliminary', () => {
  const result = createAnswerService({ passages }).recommend({
    language: 'en', profile: { scheme_id: 'pmuy', adult_woman_18_plus: true, household_has_existing_lpg: false, can_submit_deprivation_declaration: true },
  });
  assert.equal(result.results[0].status, 'potential_match');
  assert.ok(result.results[0].citations.some(source => source.document_id === 'pmuy-new-connection'));
  assert.equal(result.results[0].official_decision, false);
});

test('PM-SYM income and exclusion checks cite the ministry note and retain unknowns', () => {
  const result = createAnswerService({ passages }).recommend({
    language: 'hi', profile: { scheme_id: 'pm-sym', age_18_to_40: true, monthly_income_at_most_15000: true, unorganised_worker: true, covered_by_epf_esic_nps: null, income_tax_payer: false, receives_other_government_pension: false },
  });
  assert.equal(result.language, 'hi');
  assert.equal(result.results[0].status, 'needs_information');
  assert.deepEqual(result.results[0].missing_fields, ['covered_by_epf_esic_nps']);
  assert.ok(result.results[0].citations.some(source => source.document_id === 'pm-sym-ministry-note-2025'));
});
