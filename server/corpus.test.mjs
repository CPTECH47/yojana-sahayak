import test from 'node:test';
import assert from 'node:assert/strict';
import { filterApprovedPassages, loadPassages } from './corpus.mjs';

test('corpus loader returns only passages from approved manifest sources', () => {
  const passages = loadPassages();
  assert.ok(passages.length > 0);
  assert.deepEqual([...new Set(passages.map(passage => passage.document_id))].sort(), [
    'nmms-2026-notice',
    'pmkisan-guidelines',
    'pmkisan-instalments-2026',
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

test('approval filter fails closed when manifest inputs are malformed', () => {
  assert.throws(() => filterApprovedPassages([], null), /must be arrays/);
});
