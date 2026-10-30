import test from 'node:test';
import assert from 'node:assert/strict';
import { filterApprovedPassages, loadPassages } from './corpus.mjs';

test('corpus loader returns only passages from approved manifest sources', () => {
  const passages = loadPassages(new Date('2026-10-31T12:00:00Z'));
  assert.ok(passages.length > 0);
  assert.deepEqual([...new Set(passages.map(passage => passage.document_id))].sort(), [
    'nmms-2026-notice',
    'nsp-scholarships-2026',
    'pm-sym-ministry-note-2025',
    'pmkisan-ekyc-methods',
    'pmkisan-home-2026',
    'pmkisan-guidelines',
    'pmkisan-instalments-2026',
    'pmuy-faq',
    'pmuy-new-connection',
    'pmvishwakarma-scheme-booklet-2025',
  ]);
});

test('candidate, superseded and unregistered documents are excluded', () => {
  const sources = [
    { id: 'approved-doc', status: 'approved' },
    { id: 'candidate-doc', status: 'needs_review' },
    { id: 'old-doc', status: 'superseded' },
  ];
  const passages = [
    { document_id: 'approved-doc', text: 'approved evidence' },
    { document_id: 'candidate-doc', text: 'candidate evidence' },
    { document_id: 'old-doc', text: 'superseded evidence' },
    { document_id: 'missing-from-manifest', text: 'unregistered evidence' },
  ];
  assert.deepEqual(filterApprovedPassages(passages, sources), [passages[0]]);
});

test('expired approved evidence is automatically removed from retrieval', () => {
  const sources = [{ id: 'timed', status: 'approved', valid_until: '2026-10-31' }];
  const passages = [{ document_id: 'timed' }];
  assert.deepEqual(filterApprovedPassages(passages, sources, new Date('2026-10-31T23:59:59Z')), passages);
  assert.deepEqual(filterApprovedPassages(passages, sources, new Date('2026-11-01T00:00:00Z')), []);
});

test('approval filter fails closed when manifest inputs are malformed', () => {
  assert.throws(() => filterApprovedPassages([], null), /must be arrays/);
});
