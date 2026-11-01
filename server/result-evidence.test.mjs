import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAnswerService } from './answer-service.mjs';
import { filterApprovedPassages, loadPassages } from './corpus.mjs';
import { resultEvidence } from './result-evidence.mjs';
import { supportedRecords } from './verified-facts.mjs';

const evidence = loadPassages(new Date('2026-11-01T08:00:00Z'));
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/national-profiles.json', import.meta.url))).profiles;
const service = createAnswerService({ passages: evidence });

test('each fictional scheme result shows sourced benefit and condition records in both languages', () => {
  for (const { profile } of fixtures) {
    for (const language of ['en', 'hi']) {
      const item = service.recommend({ profile, language }).results[0];
      const { points, sources } = resultEvidence(item, language, () => evidence);
      const records = supportedRecords(evidence).filter(record => record.scheme_id === profile.scheme_id);
      assert.equal(points.length, 2, `${profile.scheme_id} ${language}`);
      for (const point of points) {
        const record = records.find(candidate => point.includes(candidate[language]));
        assert.ok(record, `point must use an approved pinned record: ${point}`);
        const passage = evidence.find(candidate => candidate.id === record.evidence_id);
        const reference = Number(/\[(\d+)\]$/u.exec(point)?.[1]);
        assert.ok(reference > 0 && sources[reference - 1].includes(passage.url));
        assert.ok(sources[reference - 1].includes(passage.locator));
      }
      assert.equal(new Set(sources).size, sources.length);
    }
  }
});

test('removed, expired or altered highlight evidence is withheld while the checked-rule citation remains', () => {
  const profile = fixtures.find(fixture => fixture.profile.scheme_id === 'pm-kisan').profile;
  const item = service.recommend({ profile }).results[0];
  const noPortal = evidence.filter(passage => passage.document_id !== 'pmkisan-home-2026');
  const altered = evidence.map(passage => passage.document_id === 'pmkisan-home-2026'
    ? { ...passage, text: `${passage.text} changed` } : passage);
  const manifest = JSON.parse(readFileSync(new URL('../corpus/manifest.json', import.meta.url)));
  const passages = JSON.parse(readFileSync(new URL('../corpus/passages.json', import.meta.url)));
  const expired = filterApprovedPassages(passages.passages, manifest.sources.map(source =>
    source.id === 'pmkisan-home-2026' ? { ...source, valid_until: '2026-10-31' } : source),
  new Date('2026-11-01T08:00:00Z'));
  for (const available of [noPortal, altered, expired]) {
    const result = resultEvidence(item, 'en', () => available);
    assert.deepEqual(result.points, []);
    assert.ok(result.sources.some(source => source.includes('RevisedPM-KISANOperationalGuidelines')));
    assert.ok(result.sources.every(source => !source.includes('scheme summary')));
  }
});

test('excluded results and unavailable extra records never gain benefit highlights', () => {
  const profile = fixtures.find(fixture => fixture.profile.scheme_id === 'pm-kisan').profile;
  const excluded = service.recommend({ profile: { ...profile, owns_cultivable_land: false } }).results[0];
  assert.deepEqual(resultEvidence(excluded, 'en', () => evidence).points, []);
  const matched = service.recommend({ profile }).results[0];
  const result = resultEvidence(matched, 'en', () => { throw new Error('unavailable'); });
  assert.deepEqual(result.points, []);
  assert.ok(result.sources.length > 0);
});
