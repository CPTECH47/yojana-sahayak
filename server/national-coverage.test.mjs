import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAnswerService } from './answer-service.mjs';
import { loadPassages, schemes, schemeFromText } from './corpus.mjs';
import { createWhatsAppConversation } from './whatsapp-flow.mjs';
import { memoryStore } from './local-store.mjs';
import { schemeQuestions } from './scheme-comparison.mjs';

const samples = JSON.parse(readFileSync(new URL('./fixtures/national-profiles.json', import.meta.url))).profiles;
const evidence = loadPassages(new Date('2026-11-01T08:00:00Z'));
const answers = createAnswerService({ passages: evidence, model: async () => { throw Error('offline fixture'); } });

test('six fictional profiles have sourced preliminary results; every opposite or unknown answer changes the outcome', () => {
  for (const { profile } of samples) {
    const result = answers.recommend({ profile }).results[0];
    assert.equal(result.status, 'potential_match', profile.scheme_id);
    assert.ok(result.citations.length);
    for (const field of Object.keys(profile).filter(key => key !== 'scheme_id')) {
      assert.equal(answers.recommend({ profile: { ...profile, [field]: !profile[field] } }).results[0].status, 'not_matched', field);
      const unknown = answers.recommend({ profile: { ...profile, [field]: null } }).results[0];
      assert.equal(unknown.status, 'needs_information', field);
      assert.deepEqual(unknown.missing_fields, [field]);
    }
  }
  const outside = answers.recommend({ profile: { ...samples[2].profile, fresh_class_ix_selected: false } }).results[0];
  assert.match(outside.scope_note, /Renewal, test-entry/u);
});

test('new national rule sets fail closed for changed evidence and review expiry', () => {
  for (const scheme_id of ['pm-kmy', 'nmmss', 'pm-vishwakarma']) {
    const changed = evidence.map(p => p.scheme_id === scheme_id ? { ...p, text: p.text + ' altered' } : p);
    assert.equal(createAnswerService({ passages: changed }).recommend({ profile: { scheme_id } }).status, 'insufficient_evidence');
  }
  const expired = createAnswerService({ now: () => new Date('2026-12-01T08:00:00Z') });
  assert.equal(expired.recommend({ profile: samples[1].profile }).status, 'insufficient_evidence');
});

test('the Baileys multi-scheme role route starts with each role’s own scheme', async () => {
  for (const [number, scheme] of [['1','pm-kisan'],['2','nmmss'],['3','pm-sym'],['4','pm-vishwakarma'],['5','pmuy']]) {
    const flow = createWhatsAppConversation({ answers, multiScheme: true });
    await flow.handle('fictional','START'); await flow.handle('fictional','2');
    assert.ok((await flow.handle('fictional',number)).startsWith(schemes[scheme].name + '\n'));
  }
});

test('each role completes its own fictional profile in one-question turns and preserves correction', async () => {
  for (const { role, profile } of samples.filter(item => item.profile.scheme_id !== 'pm-kmy')) {
    const number = { farmer:'1', student:'2', worker:'3', artisan:'4', family:'5' }[role];
    const flow = createWhatsAppConversation({ answers, multiScheme:true });
    await flow.handle('fictional','START'); await flow.handle('fictional','2');
    let reply = await flow.handle('fictional',number);
    for (const q of schemeQuestions[profile.scheme_id]) {
      assert.ok(reply.includes(q.en), reply);
      reply = await flow.handle('fictional',profile[q.key] ? '1' : '2');
    }
    const result = await flow.handle('fictional','RESULTS');
    assert.match(result, /Possible match/u);
    assert.ok(result.includes(schemes[profile.scheme_id].name));
    assert.match(await flow.handle('fictional','EDIT 1'), /\n1\./u);
    await flow.handle('fictional','2');
    assert.match(await flow.handle('fictional','RESULTS'), /Reported condition did not match/u);
  }
});

test('questions and language changes do not consume comparison answers', async () => {
  const flow = createWhatsAppConversation({ answers, multiScheme:true });
  await flow.handle('fictional','START'); await flow.handle('fictional','2');
  const first = await flow.handle('fictional','4');
  const answer = await flow.handle('fictional','PM Vishwakarma trades?');
  assert.match(answer,/18 (?:covered )?traditional/u);
  assert.ok(answer.endsWith(first));
  const unknown = await flow.handle('fictional','What is the PM Vishwakarma application deadline?');
  assert.match(unknown,/could not verify/u);
  assert.ok(unknown.endsWith(first));
  const hindi = await flow.handle('fictional','HINDI');
  assert.match(hindi,/18 सूचीबद्ध/u);
  assert.match(await flow.handle('fictional','4'), /पंजीकरण की तारीख/u);
});

test('comparison SAVE, process restart, RESUME, correction and DELETE preserve explicit consent', async () => {
  const store = memoryStore();
  let flow = createWhatsAppConversation({ answers, store, multiScheme:true });
  await flow.handle('fictional','START'); await flow.handle('fictional','2'); await flow.handle('fictional','2');
  await flow.handle('fictional','1'); await flow.handle('fictional','RESULTS');
  assert.equal(store.get('profiles','fictional'),undefined);
  await flow.handle('fictional','SAVE');
  assert.equal(store.get('profiles','fictional').alert_opt_in,false);
  flow = createWhatsAppConversation({ answers, store, multiScheme:true });
  assert.match(await flow.handle('fictional','RESUME'),/NMMSS|National Means/u);
  assert.match(await flow.handle('fictional','NEXT'),/school/u);
  assert.match(await flow.handle('fictional','EDIT 1'),/fresh Class IX/u);
  await flow.handle('fictional','2');
  await flow.handle('fictional','RESULTS');
  assert.equal(store.get('profiles','fictional').comparison_snapshot.profiles.nmmss.fresh_class_ix_selected,false);
  await flow.handle('fictional','DELETE');
  assert.equal(store.get('profiles','fictional'),undefined);
});

test('RAG retrieves pinned policy records for the added schemes without borrowing facts or stale dates', async () => {
  assert.equal(schemeFromText('PM Kisan Maandhan pension'),'pm-kmy');
  for (const scheme_id of ['pm-kmy','nmmss','pm-vishwakarma']) {
    const answer = await answers.chat({ question:'What are the eligibility conditions?', scheme_id, language:'hi' });
    assert.equal(answer.status,'answered');
    assert.ok(answer.citations.every(c => c.document_id.endsWith('policy-2026')));
    assert.equal(answer.mode,'extractive');
    assert.equal((await answers.chat({ question:'What is the application deadline?',scheme_id })).status,'insufficient_evidence');
  }
  for (const input of [{profiles:[samples[0].profile],profile:null},{profiles:[samples[0].profile],language:'pa'}]) {
    assert.equal(answers.recommend(input).status,'invalid_request');
  }
});
