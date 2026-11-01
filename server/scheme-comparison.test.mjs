import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnswerService } from './answer-service.mjs';
import { createWhatsAppConversation } from './whatsapp-flow.mjs';
import { compareProfiles, createSchemeComparison } from './scheme-comparison.mjs';
import { loadPassages } from './corpus.mjs';

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
  // Each scheme keeps its own land answer. No land excludes both farmer schemes.
  assert.match(await flow.handle('sample', '2'), /2 हेक्टेयर/u);
  assert.match(await flow.handle('sample', '2'), /आयु/u);
  assert.match(await flow.handle('sample', '2'), /महिला/u);
  await flow.handle('sample', '4'); await flow.handle('sample', '4');
  const result = await flow.handle('sample', '4');
  assert.match(result, /और जानकारी चाहिए/u);
  assert.match(result, /YOJANA START/u);
  assert.match(result, /pmuy.gov.in/u);
  assert.doesNotMatch(result,/PM-KISAN|चुनी शर्तें|अज्ञात/u);
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

test('WhatsApp result shows one best suitable scheme while retaining full internal comparison',()=>{
  const profiles={
    'pm-kisan':{scheme_id:'pm-kisan',owns_cultivable_land:true,income_tax_payer_last_year:false,practising_registered_professional:false,other_official_exclusion:false},
    'pm-kmy':{scheme_id:'pm-kmy',small_marginal_land_up_to_2ha:false},
    'pm-sym':{scheme_id:'pm-sym',unorganised_worker:false},
    pmuy:{scheme_id:'pmuy',adult_woman_18_plus:false},
  };
  const flow=createSchemeComparison({answers:service});
  const result=flow.restore('short',{role:'farmer',profiles},'en');
  assert.match(result,/\*PM-KISAN\*[\s\S]*Possible match/u);
  assert.match(result,/\*Key points:\*[\s\S]*Benefit:.*₹6,000[\s\S]*Important:.*eKYC/u);
  assert.match(result,/Source:.*PM-KISAN.*\[\d+\]/u);
  assert.doesNotMatch(result,/Maandhan|Ujjwala|Selected conditions|failed|unknown|4\/4/u);
  assert.match(result,/page 2, page 3/u);
  const links = result.match(/https:\/\/[^\s]+/gu) || [];
  assert.equal(new Set(links).size, links.length, 'each cited document should appear once');
  assert.ok(links.some(link => link.includes('RevisedPM-KISANOperationalGuidelines')));
  assert.ok(links.some(link => link === 'https://pmkisan.gov.in/'));
  assert.equal(service.recommend({profiles:Object.values(profiles)}).results.length,4);
  assert.equal(Object.keys(flow.snapshot('short').profiles).length,4);
});

test('comparison result keeps the match but withholds highlights when their separate source expires',()=>{
  const passages = loadPassages(new Date('2026-11-01T08:00:00Z'))
    .filter(passage => passage.document_id !== 'pmkisan-home-2026');
  const answers = createAnswerService({ passages });
  const profiles = { 'pm-kisan': { scheme_id:'pm-kisan', owns_cultivable_land:true,
    income_tax_payer_last_year:false, practising_registered_professional:false, other_official_exclusion:false } };
  const result = createSchemeComparison({ answers, getPassages:()=>passages })
    .restore('fictional',{role:'farmer',profiles},'en');
  assert.match(result,/Possible match/u);
  assert.match(result,/RevisedPM-KISANOperationalGuidelines/u);
  assert.doesNotMatch(result,/Key points:|₹6,000|scheme summary/u);
});

test('all excluded results never recommend a failed scheme',()=>{
  const profiles={
    'pm-kisan':{owns_cultivable_land:false},'pm-kmy':{small_marginal_land_up_to_2ha:false},
    'pm-sym':{age_18_to_40:false},pmuy:{adult_woman_18_plus:false},
  };
  for(const language of ['en','hi']){
    const flow=createSchemeComparison({answers:service});
    const result=flow.restore('none',{role:'farmer',profiles},language);
    assert.match(result,language==='hi'?/कोई उपयुक्त योजना नहीं/u:/could not identify a suitable scheme/u);
    assert.doesNotMatch(result,/PM-KISAN|Ujjwala|Maandhan|Possible match|संभावित मेल|Selected conditions/u);
  }
});
