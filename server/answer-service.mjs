import { loadPassages, retrieve, schemeFromText, schemes } from './corpus.mjs';

const MODEL_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/chat';

async function askModel(messages, schema, fetchImpl = fetch) {
  const response = await fetchImpl(MODEL_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: process.env.OLLAMA_MODEL || 'qwen3:4b', stream: false, think: false, format: schema, options: { temperature: 0, num_predict: 300 }, messages }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`Model returned HTTP ${response.status}`);
  const data = await response.json();
  return JSON.parse(data.message?.content || '{}');
}

function citation(p) {
  return { evidence_id: p.id, document_id: p.document_id, title: p.title, authority: p.authority, url: p.url, locator: p.locator, verified_at: p.verified_at };
}

function failure(reasonCode, language, schemeId = null) {
  const hi = language === 'hi';
  const messages = {
    no_evidence: hi ? 'अभी उपलब्ध सरकारी दस्तावेज़ों में इसका भरोसेमंद उत्तर नहीं मिला। कृपया आधिकारिक स्रोत देखें या सवाल और स्पष्ट करें।' : 'I could not verify that from the current government documents. Please check the official source or ask a more specific question.',
    model_unavailable: hi ? 'उत्तर बनाने वाला स्थानीय मॉडल अभी उपलब्ध नहीं है। कृपया थोड़ी देर बाद फिर पूछें।' : 'The local answer model is unavailable. Please try again shortly.',
    unsupported_claim: hi ? 'मिला हुआ उत्तर दस्तावेज़ से पूरी तरह सत्यापित नहीं हुआ, इसलिए मैं उसे साझा नहीं करूँगा।' : 'The drafted answer did not pass the source check, so I will not present it as verified.',
  };
  return { status: 'insufficient_evidence', language, scheme_id: schemeId, answer_text: messages[reasonCode] || messages.no_evidence, reason_code: reasonCode, citations: [] };
}

function languageOf(question, requested) {
  if (['en', 'hi', 'pa'].includes(requested)) return requested;
  return /[\u0a00-\u0a7f]/u.test(question) ? 'pa' : /[\u0900-\u097f]/u.test(question) ? 'hi' : 'en';
}

function numericClaimsSupported(answer, evidence) {
  const numbers = answer.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
  const source = evidence.replace(/,/g, '');
  return numbers.every(value => source.includes(value.replace(/,/g, '')));
}

export function createAnswerService({ passages = loadPassages(), model = askModel } = {}) {
  async function chat({ question, language, scheme_id: requestedScheme } = {}) {
    if (typeof question !== 'string' || !question.trim() || question.length > 1000) {
      return { status: 'invalid_request', reason_code: 'invalid_question', answer_text: 'Enter a question of 1–1000 characters.', citations: [] };
    }
    const lang = languageOf(question, language);
    if (requestedScheme && !Object.hasOwn(schemes, requestedScheme)) return failure('no_evidence', lang);
    const schemeId = requestedScheme || schemeFromText(question);
    let searchQuery = question;
    if (lang !== 'en') {
      try {
        const rewrite = await model([
          { role: 'system', content: 'Translate this welfare-scheme question into a short English search query. Keep scheme names, numbers and negations. Return JSON only.' },
          { role: 'user', content: question },
        ], { type: 'object', properties: { query_en: { type: 'string' } }, required: ['query_en'], additionalProperties: false });
        searchQuery = String(rewrite.query_en || '').slice(0, 500);
      } catch {
        return failure('model_unavailable', lang, schemeId);
      }
    }
    const bareName = /^(?:pm[\s-]?kisan|पीएम[\s-]?किसान|प्रधानमंत्री किसान|nmmss?|national means[\s-]?cum[\s-]?merit scholarship)$/iu.test(question.trim());
    if (schemeId && bareName) {
      const name = schemes[schemeId].name;
      return { status: 'clarify', language: lang, scheme_id: schemeId, answer_text: lang === 'hi' ? `${name} के बारे में लाभ, शर्तें या आवेदन प्रक्रिया में से क्या जानना चाहेंगे?` : `What would you like to know about ${name}: benefits, conditions, or application steps?`, reason_code: 'missing_intent', citations: [] };
    }
    const evidence = retrieve(passages, searchQuery, schemeId);
    if (!evidence.length) return failure('no_evidence', lang, schemeId);
    const evidenceText = evidence.map(p => `[${p.id}] ${p.title}, ${p.locator}: ${p.text}`).join('\n\n');
    let draft;
    try {
      draft = await model([
        { role: 'system', content: `Answer only from the supplied government passages. Write in ${lang === 'hi' ? 'Hindi' : lang === 'pa' ? 'Punjabi' : 'English'}. If they do not answer, return an empty answer. Do not assert personal eligibility or invent amounts, dates, documents, links or schemes. Return JSON with answer_text and evidence_ids used.` },
        { role: 'user', content: `Question: ${question}\n\nPassages:\n${evidenceText}` },
      ], { type: 'object', properties: { answer_text: { type: 'string' }, evidence_ids: { type: 'array', items: { type: 'string', enum: evidence.map(p => p.id) } } }, required: ['answer_text', 'evidence_ids'], additionalProperties: false });
    } catch {
      return failure('model_unavailable', lang, schemeId);
    }
    const answer = typeof draft.answer_text === 'string' ? draft.answer_text.trim() : '';
    const selected = evidence.filter(p => Array.isArray(draft.evidence_ids) && draft.evidence_ids.includes(p.id));
    if (!answer || !selected.length) return failure('no_evidence', lang, schemeId);
    if (!numericClaimsSupported(answer, selected.map(p => p.text).join(' '))) return failure('unsupported_claim', lang, schemeId);
    return { status: 'answered', language: lang, scheme_id: schemeId, answer_text: answer, reason_code: null, citations: selected.map(citation) };
  }

  function recommend({ profile, language = 'en' } = {}) {
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return { status: 'invalid_request', results: [], reason_code: 'invalid_profile' };
    const land = profile.owns_cultivable_land;
    const tax = profile.income_tax_payer_last_year;
    const professional = profile.practising_registered_professional;
    const other = profile.other_official_exclusion;
    const fields = { owns_cultivable_land: land, income_tax_payer_last_year: tax, practising_registered_professional: professional, other_official_exclusion: other };
    const missing = Object.entries(fields).filter(([, value]) => typeof value !== 'boolean').map(([key]) => key);
    const failed = [];
    if (land === false) failed.push('No recorded cultivable landholding was confirmed.');
    if (tax === true) failed.push('Income tax was paid in the last assessment year.');
    if (professional === true) failed.push('A registered professional is practising.');
    if (other === true) failed.push('Another official exclusion applies.');
    const status = failed.length ? 'not_matched' : missing.length ? 'needs_information' : 'potential_match';
    const ruleEvidence = passages.filter(p => ['pmkisan-guidelines:2', 'pmkisan-guidelines:3'].includes(p.id)).map(citation);
    return {
      status: 'ok', language: ['en', 'hi'].includes(language) ? language : 'en',
      results: [{ scheme_id: 'pm-kisan', scheme_name: schemes['pm-kisan'].name, status, reasons: failed.length ? failed : ['Basic checked conditions pass; official land records and full guidelines still require verification.'], missing_fields: missing, citations: ruleEvidence, official_decision: false }],
      coverage_note: 'This pilot checks selected PM-KISAN conditions only. It cannot determine official eligibility.',
    };
  }

  return { chat, recommend };
}
