import test from 'node:test';
import assert from 'node:assert/strict';
import { filterApprovedPassages, loadPassages, passageDigest } from './corpus.mjs';
const seal=p=>({id:p.document_id,status:'approved',scheme_id:p.scheme_id,url:p.url,title:p.title,authority:p.authority,snapshot_sha256:p.snapshot_sha256,passage_hashes:{[p.id]:passageDigest(p)}});

test('corpus loader returns only passages from approved manifest sources', () => {
  const passages = loadPassages(new Date('2026-10-31T12:00:00Z'));
  assert.ok(passages.length > 0);
  assert.deepEqual([...new Set(passages.map(passage => passage.document_id))].sort(), [
    'nmms-2026-notice',
    'nsp-scholarships-2026',
    'pm-sym-ministry-note-2025',
    'pmkisan-ekyc-methods',
    'pmkisan-guidelines',
    'pmkisan-home-2026',
    'pmkisan-instalments-2026',
    'pmuy-faq',
    'pmuy-new-connection',
    'pmvishwakarma-scheme-booklet-2025',
  ]);
});

test('candidate, superseded and unregistered documents are excluded', () => {
  const approved={id:'approved:1',document_id:'approved-doc',text:'approved evidence',snapshot_sha256:'a'.repeat(64)};
  const sources = [
    seal(approved),
    { id: 'candidate-doc', status: 'needs_review' },
    { id: 'old-doc', status: 'superseded' },
  ];
  const passages = [
    approved,
    { document_id: 'candidate-doc', text: 'candidate evidence' },
    { document_id: 'old-doc', text: 'superseded evidence' },
    { document_id: 'missing-from-manifest', text: 'unregistered evidence' },
  ];
  assert.deepEqual(filterApprovedPassages(passages, sources), [passages[0]]);
});

test('expired approved evidence is automatically removed from retrieval', () => {
  const passages = [{id:'timed:1',document_id:'timed',snapshot_sha256:'a'.repeat(64)}];
  const sources = [{...seal(passages[0]), valid_until:'2026-10-31'}];
  assert.deepEqual(filterApprovedPassages(passages, sources, new Date('2026-10-31T18:29:59Z')), passages);
  assert.deepEqual(filterApprovedPassages(passages, sources, new Date('2026-10-31T18:30:00Z')), []);
});

test('an approved document ID cannot approve altered text, hashes, URL or scheme',()=>{
 const passage=loadPassages(new Date('2026-10-31T07:00:00Z'))[0],sources=[seal(passage)];
 for(const change of [{text:'invented'},{snapshot_sha256:'b'.repeat(64)},{url:'https://example.invalid'},{scheme_id:'fake'}])
   assert.deepEqual(filterApprovedPassages([{...passage,...change}],sources),[]);
});

test('approval filter fails closed when manifest inputs are malformed', () => {
  assert.throws(() => filterApprovedPassages([], null), /must be arrays/);
});
