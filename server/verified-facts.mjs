// Final text is bound to a pinned, approved passage. Model prose never reaches users.
import { readFileSync } from 'node:fs';
import { passageDigest } from './corpus.mjs';
const records = JSON.parse(readFileSync(new URL('../corpus/answer-records.json', import.meta.url), 'utf8')).records;
const ruleEvidence = JSON.parse(readFileSync(new URL('../corpus/rule-evidence-lock.json', import.meta.url), 'utf8'));
export function ruleEvidenceMatches(passage) {
  return ruleEvidence[passage.id] === passageDigest(passage);
}

export function supportedRecords(passages) {
  const byId = new Map(passages.map(p => [p.id, p]));
  return records.filter(record => {
    const passage = byId.get(record.evidence_id);
    return passage && passageDigest(passage) === record.passage_sha256 && passage.scheme_id === record.scheme_id;
  });
}

export function topicFor(question) {
  if (/deadline|last date|open|closing|अंतिम|तारीख|कब तक/i.test(question)) return 'deadline';
  if (/document|proof|कागज|दस्तावेज/i.test(question)) return 'documents';
  if (/ekyc|e-kyc|केवाईसी/i.test(question)) return 'ekyc';
  if (/apply|application|enrol|register|आवेदन|पंजीकरण/i.test(question)) return 'application';
  if (/eligib|exclu|condition|qualif|who can|land|tax|age|income|पात्र|शर्त|अपवाद|जमीन|आयु|उम्र|आयकर/i.test(question)) return 'conditions';
  if (/benefit|amount|pay|pension|money|rupee|instal|kitn|paisa|लाभ|राशि|पैस|रुपय|पेंशन|किस्त/i.test(question)) return 'benefit';
  if (/trade|occupation|ट्रेड|व्यवसाय/i.test(question)) return 'trades';
  return null;
}
