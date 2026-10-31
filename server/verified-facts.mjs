// Final text is bound to a pinned, approved passage. Model prose never reaches users.
import { readFileSync } from 'node:fs';
import { passageDigest } from './corpus.mjs';
const records = JSON.parse(readFileSync(new URL('../corpus/answer-records.json', import.meta.url), 'utf8')).records;
const ruleEvidence = JSON.parse(readFileSync(new URL('../corpus/rule-evidence-lock.json', import.meta.url), 'utf8'));
// Tejas observed a conflicting current NSP listing; retain provenance but withhold disputed dates pending review.
const quarantinedEvidence = new Set(['nmms-2026-notice:1', 'nsp-scholarships-2026:1']);
export function ruleEvidenceMatches(passage) {
  return ruleEvidence[passage.id] === passageDigest(passage);
}

export function supportedRecords(passages) {
  const byId = new Map(passages.map(p => [p.id, p]));
  return records.filter(record => {
    const passage = byId.get(record.evidence_id);
    return !quarantinedEvidence.has(record.evidence_id) && passage && passageDigest(passage) === record.passage_sha256 && passage.scheme_id === record.scheme_id;
  });
}

export function topicFor(question) {
  if (/deadline|last date|closing date|application dates?|open(?:ing)?|closing|अंतिम तारीख|अंतिम तिथि|कब तक|आखिरी तारीख|आखिरी तिथि/i.test(question)) return 'deadline';
  if (/documents?|proofs?|papers?|what (?:do i|does .* need|is) .* (?:submit|provide)|कागज|दस्तावेज|प्रमाण पत्र|कौन से कागज़/i.test(question)) return 'documents';
  if (/e[ -]?kyc|know your customer|केवाईसी/i.test(question)) return 'ekyc';
  if (/apply|application|enrol(?:lment)?|register|registration|where .* apply|आवेदन|नामांकन|पंजीकरण|कैसे आवेदन|कहाँ आवेदन/i.test(question)) return 'application';
  if (/eligib|exclu|condition|qualif|who can|who is eligible|requirement|land|tax|age|income|पात्र|योग्य|शर्त|अपवाद|जमीन|आयु|उम्र|आयकर|कौन पात्र|कौन ले सकता/i.test(question)) return 'conditions';
  if (/benefit|amount|how much|how many instal|payment|pension|money|rupee|instal|kitn|paisa|लाभ|राशि|कितना मिलता|कितनी राशि|पैस|रुपय|पेंशन|किस्त|भुगतान/i.test(question)) return 'benefit';
  if (/trade|occupation|craft|profession|व्यवसाय|पारंपरिक काम|ट्रेड|कारीगरी/i.test(question)) return 'trades';
  if (/what is|what does|tell me about|explain|overview|purpose|objective|scheme for|about this scheme|क्या है|क्या योजना|किस लिए|किसके लिए|योजना बताइ|योजना के बारे में|उद्देश्य|लक्ष्य/i.test(question)) return 'overview';
  return null;
}
