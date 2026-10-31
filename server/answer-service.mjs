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

export function createAnswerService({ passages, model = askModel } = {}) {
  const getPassages = () => passages ?? loadPassages();
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
    const evidence = retrieve(getPassages(), searchQuery, schemeId);
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
    const lang = ['en', 'hi'].includes(language) ? language : 'en';
    const schemeId = profile.scheme_id || 'pm-kisan';
    const config = {
      'pm-kisan': {
        name: schemes['pm-kisan'].name,
        evidence: ['pmkisan-guidelines:2', 'pmkisan-guidelines:3'],
        fields: ['owns_cultivable_land', 'income_tax_payer_last_year', 'practising_registered_professional', 'other_official_exclusion'],
        failures: [
          ['owns_cultivable_land', false, 'No recorded cultivable landholding was confirmed.', 'खेती योग्य जमीन रखने की पुष्टि नहीं हुई।'],
          ['income_tax_payer_last_year', true, 'Income tax was paid in the last assessment year.', 'पिछले आकलन वर्ष में परिवार के किसी सदस्य ने आयकर दिया।'],
          ['practising_registered_professional', true, 'A farmer-family member was reported as a registered and practising doctor, engineer, lawyer, chartered accountant or architect.', 'किसान परिवार का कोई सदस्य पंजीकृत और कार्यरत डॉक्टर, इंजीनियर, वकील, चार्टर्ड अकाउंटेंट या आर्किटेक्ट बताया गया।'],
          ['other_official_exclusion', true, 'Another official exclusion was reported.', 'एक अन्य आधिकारिक अपवाद लागू बताया गया।'],
        ],
      },
      pmuy: {
        name: schemes.pmuy.name,
        evidence: ['pmuy-new-connection:1', 'pmuy-faq:1'],
        fields: ['adult_woman_18_plus', 'household_has_existing_lpg', 'can_submit_deprivation_declaration'],
        failures: [
          ['adult_woman_18_plus', false, 'The applicant is not an adult woman aged 18 or older.', 'आवेदक 18 वर्ष या उससे अधिक आयु की वयस्क महिला नहीं है।'],
          ['household_has_existing_lpg', true, 'An LPG connection already exists in the household.', 'परिवार में पहले से LPG कनेक्शन मौजूद है।'],
          ['can_submit_deprivation_declaration', false, 'The required poor-household declaration cannot be provided.', 'ज़रूरी गरीब-परिवार घोषणा देने की पुष्टि नहीं हुई।'],
        ],
      },
      'pm-sym': {
        name: schemes['pm-sym'].name,
        evidence: ['pm-sym-ministry-note-2025:2'],
        fields: ['age_18_to_40', 'monthly_income_at_most_15000', 'unorganised_worker', 'covered_by_epf_esic_nps', 'income_tax_payer', 'receives_other_government_pension'],
        failures: [
          ['age_18_to_40', false, 'The reported age is outside the 18–40 entry range in the cited Ministry note.', 'बताई गई आयु मंत्रालय के नोट में दी गई 18–40 वर्ष की सीमा से बाहर है।'],
          ['monthly_income_at_most_15000', false, 'The reported monthly income is above the limit in the cited Ministry note.', 'बताई गई मासिक आय मंत्रालय के नोट की सीमा से अधिक है।'],
          ['unorganised_worker', false, 'The person did not report unorganised-sector work.', 'असंगठित क्षेत्र में काम करने की पुष्टि नहीं हुई।'],
          ['covered_by_epf_esic_nps', true, 'Coverage under EPF, ESIC or NPS was reported.', 'EPF, ESIC या NPS में शामिल होना बताया गया।'],
          ['income_tax_payer', true, 'Income-tax payer status was reported.', 'आयकरदाता होना बताया गया।'],
          ['receives_other_government_pension', true, 'Another government pension was reported.', 'दूसरी सरकारी पेंशन मिलना बताया गया।'],
        ],
      },
    }[schemeId];
    if (!config) return { status: 'invalid_request', results: [], reason_code: 'unsupported_scheme' };
    const missing = config.fields.filter(key => typeof profile[key] !== 'boolean');
    const failed = config.failures.filter(([key, value]) => profile[key] === value).map(row => row[lang === 'hi' ? 3 : 2]);
    const status = failed.length ? 'not_matched' : missing.length ? 'needs_information' : 'potential_match';
    const sourcePassages = getPassages();
    const ruleEvidence = sourcePassages.filter(p => config.evidence.includes(p.id)).map(citation);
    const reasons = failed.length ? failed : [status === 'needs_information'
      ? (lang === 'hi' ? 'कुछ जवाब नहीं दिए गए; इन्हें जाने बिना शुरुआती जाँच पूरी नहीं हो सकती।' : 'Some answers are missing, so the preliminary check cannot be completed yet.')
      : (lang === 'hi' ? 'दिए गए जवाब चुनी हुई शर्तों से मेल खाते हैं; बाकी आधिकारिक शर्तों की पुष्टि बाकी है।' : 'The supplied answers pass these selected checks; other official conditions still need verification.')];
    return {
      status: 'ok', language: lang,
      results: [{ scheme_id: schemeId, scheme_name: config.name, status, reasons, missing_fields: missing, citations: ruleEvidence, official_decision: false }],
      coverage_note: lang === 'hi'
        ? 'यह केवल चुनी हुई शुरुआती शर्तों की जाँच है; यह सरकारी पात्रता निर्णय नहीं है। आधिकारिक पोर्टल/कार्यालय से पुष्टि करें।'
        : 'This checks selected preliminary conditions only; it is not an official eligibility decision. Confirm with the official portal or office.',
    };
  }

  return { chat, recommend };
}
