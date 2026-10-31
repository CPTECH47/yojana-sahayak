import { loadPassages } from './corpus.mjs';

function normalize(text) {
  return String(text ?? '').trim().normalize('NFC').toLocaleLowerCase().replace(/[.!?।,]/gu, '').trim();
}

function requestedLanguage(text, allowNumbers = false) {
  const value = normalize(text);
  if (['hi', 'hindi', 'हिंदी', 'हिन्दी', ...(allowNumbers ? ['1'] : [])].includes(value)) return 'hi';
  if (['en', 'english', ...(allowNumbers ? ['2'] : [])].includes(value)) return 'en';
  return null;
}

function isStart(text) {
  return /^(?:start|hi|hello|नमस्ते|नमस्कार)?$/iu.test(normalize(text));
}

function languagePrompt() {
  return '🌱 Yojana Sahayak\nआपकी ज़रूरत के अनुसार सरकारी योजनाओं की जानकारी।\nGovernment scheme guidance, made easier.\n\nभाषा चुनें / Choose your language:\nहिंदी के लिए 1 दबाएँ / For Hindi, press 1\nअंग्रेज़ी के लिए 2 दबाएँ / For English, press 2';
}

function rolePrompt(language, error = false) {
  const lead = error ? (language === 'hi' ? 'कृपया सूची में से एक विकल्प चुनें।\n' : 'Please choose one of the listed options.\n') : '';
  if (language === 'hi') return `${lead}आपके लिए उपयोगी योजना जानकारी ढूँढने के लिए, अपना विकल्प चुनें:\n1 किसान\n2 विद्यार्थी\n3 कामगार\n4 कारीगर\n5 परिवार का सदस्य / अन्य नागरिक\n6 किसी व्यक्ति की मदद करने वाला स्वयंसेवक\n\nनीचे केवल विकल्प का नंबर भेजें।`;
  return `${lead}Which best describes you? I’ll use this to find relevant scheme information.\n1 Farmer\n2 Student\n3 Worker\n4 Artisan or craft worker\n5 Family member / other citizen\n6 Volunteer helping someone\n\nReply with the number.`;
}

function intro(language) {
  return language === 'hi'
    ? 'मैं कुछ छोटे सवाल पूछूँगा। जवाब इस चल रहे चैट सत्र में अस्थायी रूप से रखे जाएँगे। आधार, बैंक विवरण या कोई पहचान संख्या न भेजें। भाषा बदलने के लिए YOJANA ENGLISH भेजें।'
    : 'I’ll ask a few short questions. Your answers stay temporarily in this running chat session. Do not send Aadhaar, bank details, or ID numbers. Send YOJANA HINDI to switch languages.';
}

const questionSets = {
  farmer: [
    { key: 'owns_cultivable_land', en: 'Does your farmer family own cultivable land?', hi: 'क्या आपके किसान परिवार के पास खेती योग्य जमीन है?' },
    { key: 'income_tax_payer_last_year', en: 'Did anyone in the family pay income tax in the last assessment year?', hi: 'क्या पिछले आकलन वर्ष में परिवार के किसी सदस्य ने आयकर दिया था?' },
    { key: 'practising_registered_professional', en: 'Is anyone in your farmer family a doctor, engineer, lawyer, chartered accountant or architect registered with a professional body and currently practising?', hi: 'क्या आपके किसान परिवार में कोई डॉक्टर, इंजीनियर, वकील, चार्टर्ड अकाउंटेंट या आर्किटेक्ट किसी पेशेवर संस्था में पंजीकृत है और अभी अपना पेशा कर रहा है?' },
    { key: 'other_official_exclusion', en: 'Does any other PM-KISAN exclusion in the official guidelines apply? If unsure, skip.', hi: 'क्या PM-KISAN के सरकारी नियमों का कोई अन्य अपवाद लागू होता है? पता न हो तो SKIP लिखें।' },
  ],
  family: [
    { key: 'adult_woman_18_plus', en: 'Is the applicant a woman aged 18 or older?', hi: 'क्या आवेदक 18 वर्ष या उससे अधिक आयु की महिला हैं?' },
    { key: 'household_has_existing_lpg', en: 'Does anyone in this household already have an LPG connection?', hi: 'क्या इस परिवार में किसी के नाम पहले से LPG कनेक्शन है?' },
    { key: 'can_submit_deprivation_declaration', en: 'Can the applicant provide the required poor-household declaration?', hi: 'क्या आवेदक आवश्यक गरीब-परिवार घोषणा दे सकती हैं?' },
  ],
  worker: [
    { key: 'age_18_to_40', en: 'Are you between 18 and 40 years old?', hi: 'क्या आपकी आयु 18 से 40 वर्ष के बीच है?' },
    { key: 'monthly_income_at_most_15000', en: 'Is your monthly income ₹15,000 or less?', hi: 'क्या आपकी मासिक आय ₹15,000 या उससे कम है?' },
    { key: 'unorganised_worker', en: 'Do you work in the unorganised sector?', hi: 'क्या आप असंगठित क्षेत्र में काम करते हैं?' },
    { key: 'covered_by_epf_esic_nps', en: 'Are you covered by EPF, ESIC, or NPS?', hi: 'क्या आप EPF, ESIC या NPS के अंतर्गत आते हैं?' },
    { key: 'income_tax_payer', en: 'Are you an income-tax payer?', hi: 'क्या आप आयकरदाता हैं?' },
    { key: 'receives_other_government_pension', en: 'Do you receive another government pension?', hi: 'क्या आपको कोई दूसरी सरकारी पेंशन मिलती है?' },
  ],
};

const roleNames = {
  farmer: { en: 'farmer', hi: 'किसान' },
  family: { en: 'family', hi: 'परिवार' },
  worker: { en: 'worker', hi: 'कामगार' },
};

function currentQuestion(state, error = false) {
  const language = state.language;
  const item = questionSets[state.role][state.index];
  const lead = error ? (language === 'hi' ? 'जवाब समझ नहीं आया। कृपया हाँ / नहीं लिखें, या BACK, SKIP, CANCEL चुनें।\n' : 'I didn’t understand that. Reply YES or NO, or use BACK, SKIP, or CANCEL.\n') : '';
  const answerHint = language === 'hi' ? '\nजवाब: हाँ / नहीं' : '\nAnswer: YES / NO';
  const controls = language === 'hi'
    ? '\nपिछले सवाल पर लौटें: BACK · पता न हो: SKIP · रोकें: CANCEL'
    : '\nCorrect the previous answer: BACK · Unsure: SKIP · Stop: CANCEL';
  return `${lead}${state.index + 1}/${questionSets[state.role].length}. ${item[language]}${answerHint}${controls}`;
}

function parseRole(text) {
  const value = normalize(text);
  if (value === '1' || /किसान|farmer/u.test(value)) return 'farmer';
  if (value === '2' || /विद्यार्थी|छात्र|छात्रा|student/u.test(value)) return 'student';
  if (value === '3' || /कामगार|मजदूर|worker/u.test(value)) return 'worker';
  if (value === '4' || /कारीगर|शिल्पकार|artisan|craft/u.test(value)) return 'artisan';
  if (value === '5' || /परिवार|नागरिक|family|citizen|other/u.test(value)) return 'family';
  if (value === '6' || /स्वयंसेवक|volunteer|help.?desk/u.test(value)) return 'volunteer';
  return null;
}

function parseYesNo(text) {
  const value = normalize(text);
  if (['yes', 'y', 'हाँ', 'हां', 'जी', 'सही'].includes(value)) return true;
  if (['no', 'n', 'नहीं', 'नही', 'ना'].includes(value)) return false;
  if (['skip', 'unsure', 'पता नहीं', 'छोड़ें', 'छोड़ें'].includes(value)) return null;
  return undefined;
}

function formatRecommendation(result, language) {
  const item = result.results?.[0];
  if (!item) return language === 'hi' ? 'अभी सुझाव नहीं बन पाया। कृपया बाद में फिर कोशिश करें।' : 'I could not prepare a suggestion just now. Please try again.';
  const status = item.status === 'potential_match'
    ? (language === 'hi' ? 'चुनी गई शर्तों के आधार पर संभावित मेल' : 'Possible match based on checked conditions')
    : item.status === 'not_matched'
      ? (language === 'hi' ? 'एक या अधिक जाँची गई शर्तों से मेल नहीं' : 'Does not match one or more checked conditions')
      : (language === 'hi' ? 'अधिक जानकारी चाहिए' : 'More information is needed');
  const citationLabel = language === 'hi' ? 'स्रोत' : 'Source';
  const explanation = item.reasons?.map(reason => `• ${reason}`).join('\n') || '';
  const questions = Object.values(questionSets).flat();
  const missing = (item.missing_fields || []).map(key => questions.find(question => question.key === key)?.[language]).filter(Boolean);
  const missingText = missing.length
    ? `\n${language === 'hi' ? '• जिन सवालों के जवाब बाकी हैं:' : '• Answers still needed:'}\n${missing.map(question => `  ◦ ${question}`).join('\n')}`
    : '';
  const groupedCitations = new Map();
  for (const citation of item.citations || []) {
    const key = `${citation.title}\n${citation.url}`;
    if (!groupedCitations.has(key)) groupedCitations.set(key, { ...citation, locators: [] });
    const group = groupedCitations.get(key);
    if (citation.locator && !group.locators.includes(citation.locator)) group.locators.push(citation.locator);
  }
  const sources = [...groupedCitations.values()].map(citation => {
    const locator = citation.locators.length ? `, ${citation.locators.join(', ')}` : '';
    return `${citationLabel}: ${citation.title}${locator} — ${citation.url}`;
  }).join('\n');
  const note = language === 'hi'
    ? 'यह शुरुआती जाँच है, सरकारी निर्णय नहीं। पूरी शर्तें आधिकारिक पोर्टल या स्थानीय कार्यालय से जाँचें।'
    : 'Preliminary check only, not an official decision. Verify the full rules with the official portal or local office.';
  const csc = language === 'hi'
    ? 'पास का Common Service Centre खोजें: https://locator.csccloud.in/ (वहाँ अपना क्षेत्र चुनें; सेवाएँ केंद्र के अनुसार अलग हो सकती हैं)।'
    : 'Need in-person help? Find a Common Service Centre: https://locator.csccloud.in/ (select your area there; services vary by centre).';
  const next = item.status === 'not_matched'
    ? (language === 'hi' ? '• अगला कदम: यदि कोई जवाब गलत था, YOJANA START भेजकर सही जानकारी के साथ फिर जाँचें। नियमों और अन्य योजनाओं के लिए आधिकारिक कार्यालय से पूछें।' : '• Next: If an answer was wrong, send YOJANA START and check again with correct details. Ask the official office about the rules and other schemes.')
    : (language === 'hi' ? '• अगला कदम: छूटे हुए जवाब देने या सुधारने के लिए YOJANA START भेजें। आवेदन से पहले आधिकारिक नियम जाँचें।' : '• Next: Send YOJANA START to supply or correct answers. Check the official rules before applying.');
  const documents = item.scheme_id === 'pmuy'
    ? (language === 'hi' ? '• आवश्यक दस्तावेज़: PMUY की आधिकारिक सूची देखें: https://pmuy.gov.in/ujjwala2.html' : '• Required documents: See the official PMUY list: https://pmuy.gov.in/ujjwala2.html')
    : (language === 'hi' ? '• आवश्यक दस्तावेज़: आधिकारिक योजना पोर्टल या कार्यालय से सूची की पुष्टि करें।' : '• Required documents: Confirm the list with the official scheme portal or office.');
  return `*${item.scheme_name}*\n• ${status}${explanation ? `\n${explanation}` : ''}${missingText}\n• ${note}\n${next}\n${documents}${sources ? `\n• ${sources.replaceAll('\n', '\n• ')}` : ''}\n• ${csc}`;
}

function infoOnly(role, language, passages) {
  if (role === 'student') {
    const text = language === 'hi'
      ? 'आप विद्यार्थी हैं, इसलिए NMMSS की जानकारी प्रासंगिक हो सकती है। इस पायलट में NMMSS के वर्तमान पात्रता नियम सत्यापित नहीं हैं, इसलिए मैं पात्रता-मेल नहीं बताऊँगा। नवीन जानकारी National Scholarship Portal पर देखें।\nस्रोत: https://scholarships.gov.in/All-Scholarships'
      : 'NMMSS may be relevant for a student, but this pilot does not have verified current eligibility rules for it, so I will not claim an eligibility match. Check the National Scholarship Portal for current information.\nSource: https://scholarships.gov.in/All-Scholarships';
    return text;
  }
  if (role === 'artisan') {
    const p = passages.find(item => item.document_id === 'pmvishwakarma-scheme-booklet-2025');
    const text = language === 'hi'
      ? 'कारीगरों के लिए PM Vishwakarma देखना उपयोगी हो सकता है। उपलब्ध 2025 मंत्रालय पुस्तिका में 18 पारंपरिक ट्रेड और सहायता का वर्णन है; यह पूरी वर्तमान पात्रता की पुष्टि नहीं करती।\nवर्तमान जानकारी: https://pmvishwakarma.gov.in/'
      : 'PM Vishwakarma may be relevant to an artisan. The available 2025 Ministry booklet describes 18 traditional trades and support, but it does not confirm full current eligibility.\nCurrent information: https://pmvishwakarma.gov.in/';
    return p ? `${text}\nSource: ${p.title}, ${p.locator} — ${p.url}` : text;
  }
  return language === 'hi'
    ? 'किसी व्यक्ति की मदद करने से पहले उसकी अनुमति लें। यह बॉट चुनी हुई शुरुआती शर्तें ही जाँचता है; सरकारी निर्णय नहीं देता। किसी की आधार या बैंक जानकारी न भेजें।'
    : 'Get the person’s consent before helping. This bot checks selected preliminary conditions only and does not make government decisions. Do not enter anyone’s Aadhaar or bank details.';
}

// Language and profile answers are kept per direct chat in process memory and cleared on completion/restart.
export function createWhatsAppConversation({ answers, match, passages = loadPassages() }) {
  const languageByChat = new Map();
  const questionnaireByChat = new Map();

  async function beginProfile(chatId, language) {
    languageByChat.set(chatId, language);
    questionnaireByChat.set(chatId, { phase: 'role', language, profile: {} });
    return `${intro(language)}\n\n${rolePrompt(language)}`;
  }

  async function handle(chatId, text) {
    if (!chatId) throw new TypeError('A direct-chat identifier is required');
    const value = normalize(text);
    const state = questionnaireByChat.get(chatId);

    if (isStart(text)) {
      languageByChat.delete(chatId);
      questionnaireByChat.set(chatId, { phase: 'language' });
      return languagePrompt();
    }

    if (state?.phase === 'language' || !languageByChat.has(chatId)) {
      const language = requestedLanguage(text, true);
      if (!language) {
        questionnaireByChat.set(chatId, { phase: 'language' });
        return languagePrompt();
      }
      return beginProfile(chatId, language);
    }

    if (value === 'hindi' || value === 'हिंदी' || value === 'हिन्दी' || value === 'english') {
      const language = requestedLanguage(value);
      languageByChat.set(chatId, language);
      if (state?.phase === 'role') {
        const next = { ...state, language };
        questionnaireByChat.set(chatId, next);
        return `${intro(language)}\n\n${rolePrompt(language)}`;
      }
      if (state?.phase === 'questions') {
        const next = { ...state, language };
        questionnaireByChat.set(chatId, next);
        return currentQuestion(next);
      }
      return language === 'hi' ? 'ठीक है। नया सुझाव शुरू करने के लिए START लिखें।' : 'Okay. Send START to begin a new suggestion.';
    }

    if (/^cancel$/iu.test(value) && state) {
      questionnaireByChat.delete(chatId);
      return state.language === 'hi' ? 'सवाल-जवाब रोक दिया गया। आपकी प्रोफ़ाइल इस सत्र से हटा दी गई।' : 'Questionnaire cancelled. Your profile has been cleared from this session.';
    }

    if (state?.phase === 'role') {
      const role = parseRole(text);
      if (!role) return rolePrompt(state.language, true);
      if (!questionSets[role]) {
        questionnaireByChat.delete(chatId);
        return `${infoOnly(role, state.language, passages)}\n\n${state.language === 'hi' ? 'अब आप योजना से जुड़ा सवाल पूछ सकते हैं।' : 'You can now ask a scheme question.'}`;
      }
      const next = { ...state, phase: 'questions', role, index: 0, profile: { scheme_id: role === 'farmer' ? 'pm-kisan' : role === 'family' ? 'pmuy' : 'pm-sym' } };
      questionnaireByChat.set(chatId, next);
      const schemeIntro = state.language === 'hi'
        ? `अब ${roleNames[role].hi} के लिए ${next.profile.scheme_id === 'pm-kisan' ? 'PM-KISAN' : next.profile.scheme_id === 'pmuy' ? 'PMUY' : 'PM-SYM'} की शुरुआती जाँच करेंगे।`
        : `Next, I’ll do a preliminary ${next.profile.scheme_id.toUpperCase()} check for a ${roleNames[role].en}.`;
      return `${schemeIntro}\n${currentQuestion(next)}`;
    }

    if (state?.phase === 'questions') {
      if (value === 'edit') {
        const next = { phase: 'role', language: state.language, profile: {} };
        questionnaireByChat.set(chatId, next);
        return rolePrompt(state.language);
      }
      if (value === 'back') {
        if (state.index === 0) return currentQuestion(state);
        const next = { ...state, index: state.index - 1 };
        questionnaireByChat.set(chatId, next);
        return currentQuestion(next);
      }
      const answer = parseYesNo(text);
      if (answer === undefined) return currentQuestion(state, true);
      const step = questionSets[state.role][state.index];
      const profile = { ...state.profile, [step.key]: answer };
      const nextIndex = state.index + 1;
      if (nextIndex < questionSets[state.role].length) {
        const next = { ...state, profile, index: nextIndex };
        questionnaireByChat.set(chatId, next);
        return currentQuestion(next);
      }

      questionnaireByChat.delete(chatId);
      try {
        const result = answers.recommend({ profile, language: state.language });
        return `${formatRecommendation(result, state.language)}\n\n${state.language === 'hi' ? 'अब आप योजना के बारे में सवाल पूछ सकते हैं। नई शुरुआती जाँच के लिए YOJANA START भेजें।' : 'You can now ask a scheme question. Send YOJANA START for another preliminary check.'}`;
      } catch {
        return state.language === 'hi' ? 'सुझाव सेवा अभी उपलब्ध नहीं है। बाद में फिर कोशिश करें।' : 'The recommendation service is unavailable. Please try again later.';
      }
    }

    if (/^match\b/i.test(value)) return match(text, languageByChat.get(chatId) || 'en');
    const language = languageByChat.get(chatId) || 'en';
    let result;
    try {
      result = await answers.chat({ question: text, language });
    } catch {
      return language === 'hi'
        ? 'स्थानीय उत्तर सेवा अभी उपलब्ध नहीं है। कृपया थोड़ी देर बाद फिर पूछें।'
        : 'The local answer service is unavailable. Please try again shortly.';
    }
    let reply = result.answer_text;
    if (result.citations?.length) {
      const sourceLabel = language === 'hi' ? 'स्रोत' : 'Source';
      reply += '\n' + result.citations.map(c => `${sourceLabel}: ${c.title}, ${c.locator} — ${c.url}`).join('\n');
    }
    return reply;
  }

  function acceptsBareQuestionnaireReply(chatId, text) {
    const phase = questionnaireByChat.get(chatId)?.phase;
    if (phase === 'language') return ['1', '2'].includes(normalize(text));
    return (phase === 'role' || phase === 'questions') && Boolean(String(text ?? '').trim());
  }

  return { handle, acceptsBareQuestionnaireReply };
}
