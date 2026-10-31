// Conditions are tied to separately reviewed and pinned official passages.
import { schemes } from './corpus.mjs';
import { questionSets } from './scheme-questions.mjs';

const definitions = {
  'pm-kmy': {
    evidence: ['pmkmy-policy-2026:1', 'pmkmy-policy-2026:2'],
    expected: [true, true, true, false, false],
    scope: ['Selected PM-KMY entry checks. This is a contributory pension; confirm contributions, complete exclusions and current enrolment with the CSC.', 'PM-KMY में प्रवेश की चुनी जाँच। यह अंशदायी पेंशन है; योगदान, सभी अपवाद और वर्तमान पंजीकरण की पुष्टि CSC से करें।'],
  },
  nmmss: {
    evidence: ['nmmss-policy-2026:1'],
    expected: [true, true, true, true],
    scope: ['Fresh Class IX selection only. Renewal, test-entry, quotas, remaining exclusions and current dates need school/NSP verification.', 'केवल चयन के बाद कक्षा 9 का नया आवेदन। नवीनीकरण, परीक्षा-प्रवेश, कोटा, बाकी अपवाद और वर्तमान तारीखें स्कूल/NSP से जाँचें।'],
  },
  'pm-vishwakarma': {
    evidence: ['pmvishwakarma-policy-2026:1'],
    expected: [true, true, true, false, false, false],
    scope: ['Selected registration checks only. Confirm current intake and complete verification with the CSC; a loan is not a guaranteed grant.', 'पंजीकरण की चुनी जाँच। वर्तमान आवेदन और पूरी पुष्टि CSC से करें; ऋण की मंजूरी या अनुदान की गारंटी नहीं है।'],
  },
};

export const additionalSchemeRules = Object.fromEntries(Object.entries(definitions).map(([id, definition]) => {
  const questions = questionSets[id];
  return [id, {
    name: schemes[id].name,
    evidence: definition.evidence,
    fields: questions.map(q => q.key),
    scope_note: { en: definition.scope[0], hi: definition.scope[1] },
    failures: questions.map((q, index) => [q.key, !definition.expected[index],
      `The reported answer did not meet this selected check: ${q.en}`,
      `बताया गया जवाब इस चुनी शर्त से मेल नहीं खाता: ${q.hi}`]),
  }];
}));
