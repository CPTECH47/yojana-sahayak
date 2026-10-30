import { assessPmkisan, source } from './yojana-prototype.mjs';

export function demoCommand(text) {
  const match = /^yojana(?:\s+|:)(.*)$/is.exec(text.trim());
  return match ? match[1].trim() : null;
}

// Curated from the official scheme and exclusions page. One document only.
// Qwen selects a topic; the displayed facts remain fixed and source checked.
const replies = {
  amount: {
    en: 'PM-KISAN provides Rs. 6,000 per year in three equal installments.',
    hi: 'पीएम-किसान में सालाना ₹6,000 तीन बराबर किस्तों में दिए जाते हैं।'
  },
  land: {
    en: 'The scheme is for landholding farmer families. Other conditions and exclusions also apply.',
    hi: 'यह योजना जमीन रखने वाले किसान परिवारों के लिए है। अन्य शर्तें और अपवाद भी लागू होते हैं।'
  },
  exclusions: {
    en: 'The official exclusions include income-tax payers in the last assessment year and practising registered professionals, including engineers. The full list has more exclusions.',
    hi: 'आधिकारिक अपवादों में पिछले आकलन वर्ष में आयकर देने वाले और पेशे में कार्यरत पंजीकृत इंजीनियर जैसे पेशेवर शामिल हैं। पूरी सूची में अन्य अपवाद भी हैं।'
  },
  eligibility: {
    en: 'I cannot confirm eligibility from one question. Send MATCH yes no no for three preliminary checks and review the complete official guidelines.',
    hi: 'एक सवाल से पात्रता पक्की नहीं की जा सकती। तीन शुरुआती जाँचों के लिए MATCH yes no no भेजें और पूरी सरकारी शर्तें देखें।'
  },
  other: {
    en: 'I do not know that from this one official source.',
    hi: 'इस एक आधिकारिक स्रोत से मुझे इसका उत्तर नहीं मिला।'
  }
};

export function answerMatch(text) {
  const parts = text.trim().toLowerCase().split(/\s+/);
  if (parts[0] !== 'match' || parts.length !== 4 || parts.slice(1).some(value => !['yes', 'no'].includes(value))) {
    return 'For a sample PM-KISAN check, send: MATCH yes no no\nThe answers mean: owns cultivable land; family paid income tax last assessment year; practising registered professional. Use fictional answers for this test.';
  }
  const [ownsCultivableLand, paidIncomeTaxLastYear, practisingRegisteredProfessional] = parts.slice(1).map(value => value === 'yes');
  const result = assessPmkisan({ ownsCultivableLand, paidIncomeTaxLastYear, practisingRegisteredProfessional });
  const summary = result.status === 'possible_match_check_full_guidelines' ? 'Possible match on these three checks; full eligibility is not confirmed.' : 'Does not match one or more of these selected checks.';
  return `${summary}\n${result.reasons.join(' ')}\nSource: ${source.url}`;
}

export async function answerSchemeQuestion(question, { fetchImpl = fetch } = {}) {
  if (!/pm[\s-]?kisan|पीएम[\s-]?किसान|प्रधानमंत्री किसान/i.test(question)) {
    return `This tiny demo only has one official PM-KISAN source. Ask about PM-KISAN or send MATCH yes no no.\nSource: ${source.url}`;
  }
  const response = await fetchImpl('http://127.0.0.1:11434/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen3:4b', stream: false,
      format: { type: 'object', properties: { intent: { type: 'string', enum: Object.keys(replies) } }, required: ['intent'], additionalProperties: false },
      options: { temperature: 0, num_predict: 100 },
      messages: [
        { role: 'system', content: 'Classify this PM-KISAN question into one intent: amount (payment size or installments), land (landholding requirement), exclusions (who is excluded), eligibility (personal qualification), or other. Return only the intent.' },
        { role: 'user', content: question }
      ]
    }),
    signal: AbortSignal.timeout(90000)
  });
  if (!response.ok) throw new Error(`Local model returned HTTP ${response.status}`);
  const data = await response.json();
  let intent = JSON.parse(data.message?.content ?? '{}').intent;
  if (!Object.hasOwn(replies, intent)) throw new Error('Local model returned no usable classification');
  // Keep a clear payment question on its verified answer even if the small model says "other".
  if (/\bkitna\s+(?:paisa|rupee|rupaye)\b|कितन[ाीे]\s*(?:पैस|रुपय)|\b(?:amount|payment|installments?|benefit amount)\b/i.test(question)) {
    intent = 'amount';
  }
  const language = /[\u0900-\u097f]|\b(kya|kitna|hai|kaun|kisan ko)\b/i.test(question) ? 'hi' : 'en';
  return `${replies[intent][language]}\nSource: ${source.url}`;
}
