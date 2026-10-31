import { loadPassages, schemeFromText } from './corpus.mjs';
import { topicFor } from './verified-facts.mjs';
import { memoryStore } from './local-store.mjs';
import { extractProfileStatement, interpretQuestionAnswer, isProfileStatement } from './profile-extract.mjs';

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

function languagePrompt(naturalFlow=false) {
  return '🌱 Yojana Sahayak\nआपकी ज़रूरत के अनुसार सरकारी योजनाओं की जानकारी।\nGovernment scheme guidance, made easier.\n\nभाषा चुनें / Choose your language:\nहिंदी के लिए 1 दबाएँ / For Hindi, press 1\nअंग्रेज़ी के लिए 2 दबाएँ / For English, press 2'
    +(naturalFlow?'\n\nआप अपनी बात हिंदी या अंग्रेज़ी में आवाज़ या लिखकर भी बता सकते हैं।\nYou can also describe your situation by voice or text.\nRestart anytime: *YOJANA START*':'');
}

function rolePrompt(language, error = false) {
  const lead = error ? (language === 'hi' ? 'कृपया सूची में से एक विकल्प चुनें।\n' : 'Please choose one of the listed options.\n') : '';
  if (language === 'hi') return `${lead}आपके लिए उपयोगी योजना जानकारी ढूँढने के लिए, अपना विकल्प चुनें:\n1 किसान\n2 विद्यार्थी\n3 कामगार\n4 कारीगर\n5 परिवार का सदस्य / अन्य नागरिक\n\nनीचे केवल विकल्प का नंबर भेजें।`;
  return `${lead}Which best describes you? I’ll use this to find relevant scheme information.\n1 Farmer\n2 Student\n3 Worker\n4 Artisan or craft worker\n5 Family member / other citizen\n\nReply with the number.`;
}

function intro(language,naturalFlow=false) {
  if(!naturalFlow)return language==='hi'
    ? 'डेमो में केवल काल्पनिक जानकारी दें। आधार, बैंक विवरण या पहचान संख्या न भेजें। सवाल कभी भी पूछ सकते हैं। उत्तर सत्र में रहेंगे; SAVE से सहमति देकर 30 दिन के लिए सहेज सकते हैं।'
    : 'Use fictional information for this demo. Do not send Aadhaar, bank details, or ID numbers. Ask a question at any time. Answers stay in this session; SAVE explicitly consents to saving them for 30 days.';
  return language === 'hi'
    ? 'केवल ज़रूरी जानकारी दें। आधार, बैंक विवरण या पहचान संख्या न भेजें। यह सरकारी पात्रता निर्णय नहीं है। जवाब इस सत्र में रहेंगे; SAVE से सहमति देकर 30 दिन के लिए सहेज सकते हैं।'
    : 'Share only necessary details. Do not send Aadhaar, bank details, or ID numbers. This is not an official eligibility decision. Answers stay in this session; SAVE explicitly consents to saving them for 30 days.';
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
  const lead = error ? (language === 'hi' ? 'जवाब समझ नहीं आया। 1 हाँ, 2 नहीं या SKIP भेजें। फिर से शुरू करने के लिए *YOJANA START* भेजें।\n' : 'I could not understand that answer. Reply YES, NO or SKIP; send *YOJANA START* to restart.\n') : '';
  const answerHint = language === 'hi' ? '\n1 हाँ\n2 नहीं\n3 पिछला सवाल (BACK)\n4 पता नहीं (SKIP)\n5 रोकें (CANCEL)' : '\n1 Yes\n2 No\n3 Back\n4 Skip / unsure\n5 Cancel';
  return `${lead}${state.index + 1}/${questionSets[state.role].length}. ${item[language]}${answerHint}`;
}

function parseRole(text) {
  const value = normalize(text);
  if (value === '1' || /किसान|farmer/u.test(value)) return 'farmer';
  if (value === '2' || /विद्यार्थी|छात्र|छात्रा|student/u.test(value)) return 'student';
  if (value === '3' || /कामगार|मजदूर|worker/u.test(value)) return 'worker';
  if (value === '4' || /कारीगर|शिल्पकार|artisan|craft/u.test(value)) return 'artisan';
  if (value === '5' || /परिवार|नागरिक|family|citizen|other/u.test(value)) return 'family';
  if (/स्वयंसेवक|volunteer|help.?desk/u.test(value)) return 'volunteer';
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
  if (!item) return language === 'hi' ? 'सुझाव के लिए जरूरी जाँचे गए स्रोत उपलब्ध नहीं हैं। कृपया आधिकारिक कार्यालय से पुष्टि करें।' : 'The reviewed evidence required for this check is unavailable. Please confirm with the official office.';
  const status = item.status === 'potential_match'
    ? (language === 'hi' ? 'चुनी गई शर्तों के आधार पर संभावित मेल' : 'Possible match based on checked conditions')
    : item.status === 'not_matched'
      ? (language === 'hi' ? 'एक या अधिक जाँची गई शर्तों से मेल नहीं' : 'Does not match one or more checked conditions')
      : (language === 'hi' ? 'अधिक जानकारी चाहिए' : 'More information is needed');
  const citationLabel = language === 'hi' ? 'स्रोत' : 'Source';
  const explanation = item.reasons?.map(reason => `• ${reason}`).join('\n') || '';
  const questions = Object.values(questionSets).flat();
  const missing = (item.missing_fields || []).map(key => questions.find(question => question.key === key)?.[language] || key);
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
  const next = [
    missing.length ? (language === 'hi' ? '• छूटे जवाबों के लिए NEXT भेजें।' : '• Send NEXT to answer skipped questions.') : '',
    item.status === 'not_matched' ? (language === 'hi' ? '• जवाब गलत था? EDIT और सवाल का नंबर भेजकर सुधारें।' : '• Wrong answer? Send EDIT and its question number to correct it.') : '',
  ].filter(Boolean).join('\n');
  const documents = item.scheme_id === 'pmuy'
    ? (language === 'hi' ? '• आवश्यक दस्तावेज़: PMUY की आधिकारिक सूची देखें: https://pmuy.gov.in/ujjwala2.html' : '• Required documents: See the official PMUY list: https://pmuy.gov.in/ujjwala2.html')
    : (language === 'hi' ? '• आवश्यक दस्तावेज़: आधिकारिक योजना पोर्टल या कार्यालय से सूची की पुष्टि करें।' : '• Required documents: Confirm the list with the official scheme portal or office.');
  return `*${item.scheme_name}*\n• ${status}${explanation ? `\n${explanation}` : ''}${missingText}\n• ${note}${next ? `\n${next}` : ''}\n${documents}${sources ? `\n• ${sources.replaceAll('\n', '\n• ')}` : ''}`;
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
    if(!p)return language==='hi'?'कारीगरों की पात्रता जाँच के लिए जाँचा गया स्रोत अभी उपलब्ध नहीं है। आधिकारिक PM Vishwakarma पोर्टल देखें: https://pmvishwakarma.gov.in/':'Reviewed artisan evidence is unavailable. Check the official PM Vishwakarma portal: https://pmvishwakarma.gov.in/';
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
export function createWhatsAppConversation({ answers, passages, store = memoryStore(), now = Date.now, naturalFlow = process.env.YOJANA_NATURAL_FLOW !== '0', extractProfile = extractProfileStatement, interpretAnswer = interpretQuestionAnswer }) {
  const languageByChat = new Map();
  const questionnaireByChat = new Map();
  const completedByChat = new Map();
  const lastSchemeByChat = new Map();
  const touched = new Map();
  const awaitingCsc = new Map();
  const awaitingCscOffer = new Map();
  const moreSchemeByChat = new Map();
  const sensitive=/(?:\baadhaar\b|\baadhar\b|\baccount number\b|\bifsc\b|\bpan card\b|आधार|बैंक खाता|खाता संख्या|पैन नंबर)/iu;
  const cscOffer = language => language === 'hi'
    ? 'क्या नज़दीकी सेवा केंद्र खोजने में मदद चाहिए?\n1 हाँ · 2 नहीं'
    : 'Would you like help finding a nearby service centre?\n1 Yes · 2 No';
  const moreHint = language => language==='hi'
    ? 'दूसरी योजना की शुरुआती जाँच के लिए *YOJANA MORE* भेजें।'
    : 'Send *YOJANA MORE* for another preliminary scheme check.';
  function naturalAnalysis(state){
    try {
      const check=answers.recommend({profile:state.profile,language:state.language});
      const item=check.results?.[0];
      if(!item?.citations?.length)return '';
      const known=questionSets[state.role].filter(q=>typeof state.profile[q.key]==='boolean').length;
      const source=item.citations[0];
      return state.language==='hi'
        ? `आपकी पुष्टि की गई जानकारी से *${item.scheme_name}* की शुरुआती जाँच प्रासंगिक है। ${known}/${questionSets[state.role].length} शर्तों के जवाब मिल गए हैं; आय की राशि अकेले पात्रता तय नहीं करती।\nस्रोत: ${source.title}, ${source.locator} — ${source.url}\nअगला सवाल:`
        : `Your confirmed details make *${item.scheme_name}* worth checking. You have answered ${known}/${questionSets[state.role].length} conditions; the income amount alone does not determine eligibility.\nSource: ${source.title}, ${source.locator} — ${source.url}\nNext question:`;
    } catch {return '';}
  }
  function saved(chatId) {
    const id=store.id(chatId), value=store.get('profiles',id);
    if(value?.expires_at<=now()){store.delete('profiles',id);return null;}
    return value;
  }
  function remember(chatId,state) {
    const completed={...(saved(chatId)?.profiles||{}),...(completedByChat.get(chatId)||{}),[state.profile.scheme_id]:state.profile};
    completedByChat.set(chatId,completed);
    const old=saved(chatId);
    if(old?.storage_consent)store.put('profiles',store.id(chatId),{...old,language:state.language,profile:state.profile,profiles:completed});
  }
  async function answerQuestion(chatId,text,language) {
    const active=questionnaireByChat.get(chatId);
    const scheme_id=schemeFromText(text) || active?.profile?.scheme_id || lastSchemeByChat.get(chatId) || null;
    if(scheme_id)lastSchemeByChat.set(chatId,scheme_id);
    if (active?.phase==='complete' && scheme_id===active.profile?.scheme_id && /^(?:am i eligible|do i qualify|क्या मैं पात्र हूँ|क्या मैं योग्य हूँ)[?？]?$/iu.test(String(text).trim())) {
      return formatRecommendation(answers.recommend({profile:active.profile,language}),language);
    }
    let result;
    try { result=await answers.chat({question:text,language,...(scheme_id?{scheme_id}:{})}); }
    catch { return language==='hi'?'उत्तर सेवा अभी उपलब्ध नहीं है। कृपया बाद में पूछें।':'The answer service is unavailable. Please try again later.'; }
    const mode=result.mode==='extractive'?(language==='hi'?'जाँचे गए रिकॉर्ड का उत्तर (स्थानीय मॉडल उपलब्ध नहीं था)।\n':'Answer from reviewed records (local model unavailable).\n'):'';
    return mode+(result.answer_text || (language==='hi'?'उत्तर उपलब्ध नहीं है।':'No answer is available.'))+
      (result.citations?.length?'\n'+result.citations.map(c=>(language==='hi'?'स्रोत: ':'Source: ')+c.title+', '+c.locator+' — '+c.url).join('\n'):'')+
      (result.status==='insufficient_evidence'?(language==='hi'?'\nइस सवाल की पुष्टि नहीं कर सकता। नया सवाल पूछें या *YOJANA START* से फिर शुरू करें।':'\nI cannot confirm this answer. Ask another question or send *YOJANA START* to restart.'):'');
  }

  async function beginProfile(chatId, language) {
    languageByChat.set(chatId, language);
    questionnaireByChat.set(chatId, { phase: 'role', language, profile: {} });
    return `${intro(language,naturalFlow)}\n\n${rolePrompt(language)}`;
  }

  async function handleProfileStatement(chatId,text,voiceLanguage=null) {
    if(!naturalFlow || !isProfileStatement(text)) return null;
    const language=voiceLanguage==='hi'||voiceLanguage==='en' ? voiceLanguage : languageByChat.get(chatId)||(/[\u0900-\u097f]/u.test(text)?'hi':'en');
    if(sensitive.test(text))return language==='hi'?'कृपया आधार, बैंक या पहचान संख्या न भेजें। बिना इन विवरणों के अपनी स्थिति बताएँ।':'Please do not send Aadhaar, bank or ID numbers. Describe your situation without them.';
    const candidate=await extractProfile(text);
    if(!candidate.role)return language==='hi'?'मैं आपकी भूमिका स्पष्ट नहीं समझ पाया। किसान, विद्यार्थी, कामगार, कारीगर या परिवार का सदस्य लिखें; या *YOJANA START* भेजें।':'I could not identify your role. Say farmer, student, worker, artisan or family member; or send *YOJANA START*.';
    languageByChat.set(chatId,language);
    questionnaireByChat.set(chatId,{phase:'natural_confirm',language,candidate});
    const roleLabel={farmer:['किसान','farmer'],worker:['कामगार','worker'],student:['विद्यार्थी','student'],artisan:['कारीगर','artisan'],family:['परिवार का सदस्य','family member']}[candidate.role];
    const amount=candidate.income_amount===null?'':language==='hi'?`, आपकी व्यक्तिगत आय ₹${candidate.income_amount}${candidate.income_period?' '+({day:'प्रतिदिन',week:'प्रति सप्ताह',month:'प्रति माह',year:'प्रति वर्ष'}[candidate.income_period]):' (समय स्पष्ट नहीं)'}`:`; your personal income ₹${candidate.income_amount}${candidate.income_period?' per '+candidate.income_period:' (period unclear)'}`;
    const factNames={owns_cultivable_land:['खेती योग्य जमीन है','own cultivable land'],income_tax_payer_last_year:['पिछले वर्ष आयकर दिया','paid income tax last year'],unorganised_worker:['असंगठित क्षेत्र में काम','unorganised-sector work'],age_18_to_40:['आयु 18–40 के बीच','age 18–40'],household_has_existing_lpg:['परिवार में LPG कनेक्शन','household LPG connection']};
    const facts=Object.entries(candidate.facts||{}).map(([key,v])=>`${language==='hi'?(v?'हाँ: ':'नहीं: '):(v?'Yes: ':'No: ')}${factNames[key]?.[language==='hi'?0:1]||key}`).join('\n');
    return language==='hi'?`मैंने आपकी बात से यह समझा: ${roleLabel[0]}${amount}।${facts?'\n'+facts:''}\nक्या ये सभी बातें सही हैं?\n1 सही · 2 सुधारें · 3 रद्द करें`:`From your message I understood: ${roleLabel[1]}${amount}.${facts?'\n'+facts:''}\nAre all these details correct?\n1 Confirm · 2 Correct · 3 Cancel`;
  }

  async function handle(chatId, text) {
    if (!chatId) throw new TypeError('A direct-chat identifier is required');
    if(typeof text!=='string' || text.length>1000)return 'Please send a short text question (up to 1000 characters).';
    for(const [id,at] of touched)if(now()-at>86400000){touched.delete(id);languageByChat.delete(id);questionnaireByChat.delete(id);completedByChat.delete(id);lastSchemeByChat.delete(id);awaitingCsc.delete(id);awaitingCscOffer.delete(id);}
    if(!touched.has(chatId) && touched.size>=2000)return 'The service is busy. Please try again later.';
    touched.set(chatId,now());
    const value = normalize(text);
    const state = questionnaireByChat.get(chatId);
    const language=languageByChat.get(chatId)||saved(chatId)?.language||'en';
    if (value === 'csc') {
      awaitingCscOffer.delete(chatId);
      awaitingCsc.set(chatId,now()+300000);
      return language==='hi' ? 'CSC खोजने के लिए 6 अंकों का PIN कोड या शहर का नाम भेजें। रद्द करने के लिए CANCEL भेजें।' : 'Send a 6-digit PIN code or town name to search for a CSC. Send CANCEL to stop.';
    }
    if (awaitingCscOffer.get(chatId) > now()) {
      if (['1','yes','y','हाँ','हां','जी'].includes(value)) {
        awaitingCscOffer.delete(chatId);awaitingCsc.set(chatId,now()+300000);
        return language==='hi'
          ? 'कृपया 6 अंकों का PIN कोड या शहर का नाम भेजें।\n1 छोड़ें · 2 रद्द करें'
          : 'Send your 6-digit PIN code or town name.\n1 Skip · 2 Cancel';
      }
      if (['2','no','n','नहीं','नही','ना','skip','cancel'].includes(value)) {
        awaitingCscOffer.delete(chatId);
        return language==='hi'?'ठीक है। योजना के बारे में सवाल पूछने के लिए YOJANA के बाद सवाल भेजें।':'Okay. Send YOJANA followed by a scheme question whenever you need help.';
      }
      if (/^(?:start|stop|delete|resume|save|alerts on|alerts off|role|edit [1-6]|next|more)$/iu.test(value) || /[?？]/u.test(text) || /^(?:ask\s|what\b|how\b|who\b|when\b|क्या|कितन|कैसे|कब)/iu.test(text)) awaitingCscOffer.delete(chatId);
      else return cscOffer(language);
    }
    if (awaitingCsc.get(chatId) && awaitingCsc.get(chatId) > now()) {
      if (value === 'cancel' || value === 'skip' || value === '1' || value === '2' || value === 'start') { awaitingCsc.delete(chatId); if(value!=='start') return language==='hi'?'केंद्र की खोज छोड़ दी गई। सवाल पूछने के लिए YOJANA के बाद अपना सवाल भेजें।':'Centre search skipped. Send YOJANA followed by your question whenever you need help.'; }
      else if (/^(?:stop|delete|resume|save|alerts on|alerts off|role|edit [1-6]|next|more)$/iu.test(value) || /[?？]/u.test(text)) awaitingCsc.delete(chatId);
      else {
        const area=String(text).trim();
        if (!/^[\p{L}\p{M}\p{N} .,'-]{2,60}$/u.test(area) || (/^\d+$/.test(area) && !/^[1-9]\d{5}$/.test(area))) return language==='hi'?'कृपया सही 6 अंकों का PIN कोड या शहर का नाम भेजें।':'Please send a valid 6-digit PIN code or a town name.';
        awaitingCsc.delete(chatId);
        const url=new URL('https://www.google.com/maps/search/');
        url.searchParams.set('api','1');url.searchParams.set('query',`Common Service Centre ${area} India`);
        return language==='hi' ? `Google Maps पर सेवा केंद्र खोजें:\n${url}\n\nलिस्टिंग की CSC के रूप में पुष्टि नहीं की गई है। जाने से पहले फोन करके योजना की सेवा और शुल्क पूछें।\nआधिकारिक CSC खोज: https://locator.csccloud.in/` : `Search Google Maps for service centres:\n${url}\n\nListings are not verified as CSCs. Call before visiting to check the scheme service and any fee.\nOfficial CSC locator: https://locator.csccloud.in/`;
      }
    }
    if(value==='delete') {
      store.delete('profiles',store.id(chatId));
      for(const [key,a] of store.entries('alerts'))if(a.profile_id===store.id(chatId))store.delete('alerts',key);
      questionnaireByChat.delete(chatId);completedByChat.delete(chatId);languageByChat.delete(chatId);lastSchemeByChat.delete(chatId);awaitingCscOffer.delete(chatId);awaitingCsc.delete(chatId);moreSchemeByChat.delete(chatId);
      return language==='hi'?'सहेजी गई जानकारी और अपडेट की सहमति मिटा दी गई।':'Saved profile and update consent deleted.';
    }
    if(['stop','alerts off'].includes(value)){
      const old=saved(chatId);if(old)store.put('profiles',store.id(chatId),{...old,alert_opt_in:false,recipient:null});
      for(const [key,a] of store.entries('alerts'))if(a.profile_id===store.id(chatId)&&a.status==='queued')store.put('alerts',key,{...a,status:'cancelled'});
      return language==='hi'?'योजना अपडेट बंद हैं।':'Scheme updates are off.';
    }
    if(value==='save'){
      const profiles=completedByChat.get(chatId);
      if(!profiles || !Object.keys(profiles).length)return language==='hi'?'पहले शुरुआती जाँच पूरी करें।':'Complete a preliminary check first.';
      const old=saved(chatId);
      store.put('profiles',store.id(chatId),{...old,storage_consent:true,alert_opt_in:old?.alert_opt_in||false,language,
        profile:state?.profile || Object.values(profiles).at(-1),profiles,expires_at:now()+30*86400000});
      return language==='hi'?'आपकी सहमति से दी गई जानकारी 30 दिन के लिए सहेजी गई। RESUME से खोलें; DELETE से मिटाएँ। अपडेट पाने के लिए अलग से ALERTS ON भेजें।':'With your consent, the supplied profile is saved for 30 days. RESUME to reopen or DELETE to erase. Send ALERTS ON separately if you want reviewed scheme updates.';
    }
    if(value==='alerts on'){
      const old=saved(chatId);
      if(!old?.storage_consent)return language==='hi'?'पहले SAVE से नमूना जानकारी सहेजने की सहमति दें।':'First consent to saving a fictional profile with SAVE.';
      store.put('profiles',store.id(chatId),{...old,alert_opt_in:true,recipient:chatId});
      return language==='hi'?'जाँचे गए प्रासंगिक योजना अपडेट की सहमति दर्ज है। STOP से बंद करें। इस पायलट में भेजना संचालक के टेस्ट मोड पर निर्भर है।':'Consent for relevant reviewed scheme updates is recorded. STOP unsubscribes. Sending in this pilot depends on the operator enabling consenting-test delivery.';
    }
    if(value==='resume'){
      const old=saved(chatId);
      if(!old)return language==='hi'?'कोई सहेजी गई जानकारी नहीं है। START भेजें।':'No saved profile. Send START.';
      languageByChat.set(chatId,old.language);completedByChat.set(chatId,old.profiles || {[old.profile.scheme_id]:old.profile});
      const role=old.profile.scheme_id==='pm-kisan'?'farmer':old.profile.scheme_id==='pmuy'?'family':'worker';
      questionnaireByChat.set(chatId,{phase:'complete',language:old.language,role,profile:old.profile,index:0});
      const result=answers.recommend({profile:old.profile,language:old.language});
      if(result.results?.length)awaitingCscOffer.set(chatId,now()+300000);
      return formatRecommendation(result,old.language)+(result.results?.length?'\n\n'+cscOffer(old.language):'');
    }

    if (isStart(text)) {
      awaitingCsc.delete(chatId);awaitingCscOffer.delete(chatId);lastSchemeByChat.delete(chatId);moreSchemeByChat.delete(chatId);
      languageByChat.delete(chatId);
      questionnaireByChat.set(chatId, { phase: 'language' });
      return languagePrompt(naturalFlow)+(saved(chatId)?'\nRESUME: saved profile / सहेजी गई जानकारी':'');
    }

    if(naturalFlow && state?.phase==='answer_confirm'){
      if(value==='3'||value==='cancel'){questionnaireByChat.delete(chatId);return language==='hi'?'जाँच रद्द की गई। *YOJANA START* से फिर शुरू करें।':'Check cancelled. Send *YOJANA START* to restart.';}
      const active={...state,phase:'questions',proposed_answer:undefined};
      questionnaireByChat.set(chatId,active);
      if(value==='1')return handle(chatId,state.proposed_answer?'1':'2');
      if(value==='2')return currentQuestion(active);
      questionnaireByChat.set(chatId,state);
      return language==='hi'?'इस जवाब को मानें? 1 हाँ · 2 सुधारें · 3 रद्द करें':'Use this answer? 1 Confirm · 2 Correct · 3 Cancel';
    }

    if(naturalFlow && state?.phase==='natural_confirm'){
      if(value==='3'||value==='cancel'){questionnaireByChat.delete(chatId);return state.language==='hi'?'जाँच रद्द की गई। फिर शुरू करने के लिए *YOJANA START* भेजें।':'Check cancelled. Send *YOJANA START* to restart.';}
      if(value==='2') {questionnaireByChat.set(chatId,{phase:'role',language:state.language,profile:{}});return state.language==='hi'?'सही विवरण लिखें, या नीचे अपनी भूमिका चुनें।\n'+rolePrompt(state.language):'Send a corrected sentence, or choose your role below.\n'+rolePrompt(state.language);}
      if(value!=='1')return await handleProfileStatement(chatId,text,state.language) || (state.language==='hi'?'1 से पुष्टि करें या 2 से सुधारें।':'Reply 1 to confirm or 2 to correct.');
      const roleNumber={farmer:'1',student:'2',worker:'3',artisan:'4',family:'5'}[state.candidate.role];
      questionnaireByChat.set(chatId,{phase:'role',language:state.language,profile:{}});
      const nextMessage=await handle(chatId,roleNumber);
      const current=questionnaireByChat.get(chatId);
      if(current?.phase!=='questions')return nextMessage;
      current.profile.income_amount=state.candidate.income_amount;
      current.profile.income_period=state.candidate.income_period;
      const allowed=new Set(questionSets[current.role].map(q=>q.key));
      for(const [key,answer] of Object.entries(state.candidate.facts||{}))if(allowed.has(key) && typeof answer==='boolean')current.profile[key]=answer;
      if(state.candidate.income_amount!==null && !state.candidate.income_period){
        current.phase='income_period';questionnaireByChat.set(chatId,current);
        return state.language==='hi'?'₹'+state.candidate.income_amount+' कितने समय की आय है?\n1 प्रतिदिन · 2 प्रति सप्ताह · 3 प्रति माह · 4 प्रति वर्ष · 5 पता नहीं · 6 वापस · 7 रद्द करें':'₹'+state.candidate.income_amount+' is income for which period?\n1 Day · 2 Week · 3 Month · 4 Year · 5 Unsure · 6 Back · 7 Cancel';
      }
      if(current.role==='worker' && state.candidate.income_period==='month')current.profile.monthly_income_at_most_15000=state.candidate.income_amount<=15000;
      const firstUnknown=questionSets[current.role].findIndex(q=>typeof current.profile[q.key]!=='boolean');
      if(firstUnknown>=0)current.index=firstUnknown;
      return [naturalAnalysis(current),currentQuestion(current)].filter(Boolean).join('\n');
    }
    if(naturalFlow && state?.phase==='income_period'){
      if(value==='7'||value==='cancel'){questionnaireByChat.delete(chatId);return state.language==='hi'?'जाँच रद्द की गई। *YOJANA START* भेजकर फिर शुरू करें।':'Check cancelled. Send *YOJANA START* to restart.';}
      if(value==='6'||value==='back'){
        const next={phase:'natural_confirm',language:state.language,candidate:{role:state.role,income_amount:state.profile.income_amount,income_period:null}};
        questionnaireByChat.set(chatId,next);
        return state.language==='hi'?'पहली जानकारी पर वापस। 1 सही · 2 सुधारें · 3 रद्द करें।':'Back to your profile. 1 Confirm · 2 Correct · 3 Cancel.';
      }
      const period=({1:'day',2:'week',3:'month',4:'year',5:null,day:'day',week:'week',month:'month',year:'year',daily:'day',weekly:'week',monthly:'month',yearly:'year',skip:null})[value];
      if(period===undefined)return state.language==='hi'?'आय का समय 1–5 से बताएँ या *YOJANA START* से फिर शुरू करें।':'Choose income period 1–5, or send *YOJANA START* to restart.';
      state.profile.income_period=period;state.phase='questions';
      if(state.role==='worker' && period==='month')state.profile.monthly_income_at_most_15000=state.profile.income_amount<=15000;
      const firstUnknown=questionSets[state.role].findIndex(q=>typeof state.profile[q.key]!=='boolean');
      if(firstUnknown>=0)state.index=firstUnknown;
      questionnaireByChat.set(chatId,state);
      return [naturalAnalysis(state),currentQuestion(state)].filter(Boolean).join('\n');
    }
    if(naturalFlow && (state?.phase==='language'||state?.phase==='role') && isProfileStatement(text)){
      return await handleProfileStatement(chatId,text);
    }
    if(naturalFlow && value==='more' && state?.phase==='complete' && moreSchemeByChat.get(chatId)==='pm-sym'){
      moreSchemeByChat.delete(chatId);
      const previous=state.profile;
      const next={phase:'questions',language,role:'worker',index:0,profile:{scheme_id:'pm-sym',income_amount:previous.income_amount??null,income_period:previous.income_period??null}};
      if(next.profile.income_period==='month' && Number.isSafeInteger(next.profile.income_amount))next.profile.monthly_income_at_most_15000=next.profile.income_amount<=15000;
      questionnaireByChat.set(chatId,next);
      const source=(passages??loadPassages()).find(p=>p.id==='pm-sym-ministry-note-2025:2');
      return (language==='hi'?'अब PM-SYM की अलग शुरुआती जाँच करेंगे। किसान होने से कामगार की पात्रता अपने आप सिद्ध नहीं होती।':'Next is a separate preliminary PM-SYM check. Being a farmer alone does not establish worker eligibility.')+
        (source?`\n${language==='hi'?'स्रोत':'Source'}: ${source.title}, ${source.locator} — ${source.url}`:'')+'\n'+currentQuestion(next);
    }

    if ((state?.phase === 'language' || !languageByChat.has(chatId)) && schemeFromText(text) && topicFor(text)) {
      const inferredLanguage=/[\u0900-\u097f]/u.test(text)?'hi':'en';
      languageByChat.set(chatId,inferredLanguage);
      if(state?.phase==='language')questionnaireByChat.delete(chatId);
      return answerQuestion(chatId,text,inferredLanguage);
    }
    if (state?.phase === 'language' || !languageByChat.has(chatId)) {
      const language = requestedLanguage(text, true);
      if (!language) {
        questionnaireByChat.set(chatId, { phase: 'language' });
        return languagePrompt(naturalFlow);
      }
      return beginProfile(chatId, language);
    }

    if (value === 'hindi' || value === 'हिंदी' || value === 'हिन्दी' || value === 'english') {
      const language = requestedLanguage(value);
      languageByChat.set(chatId, language);
      if (state?.phase === 'role') {
        const next = { ...state, language };
        questionnaireByChat.set(chatId, next);
        return `${intro(language,naturalFlow)}\n\n${rolePrompt(language)}`;
      }
      if (state?.phase === 'questions') {
        const next = { ...state, language };
        questionnaireByChat.set(chatId, next);
        return currentQuestion(next);
      }
      return language === 'hi' ? 'ठीक है। नया सुझाव शुरू करने के लिए START लिखें।' : 'Okay. Send START to begin a new suggestion.';
    }

    if ((/^cancel$/iu.test(value) || (state?.phase === 'questions' && value === '5')) && state) {
      questionnaireByChat.delete(chatId);
      return state.language === 'hi' ? 'सवाल-जवाब रोक दिया गया। आपकी प्रोफ़ाइल इस सत्र से हटा दी गई।' : 'Questionnaire cancelled. Your profile has been cleared from this session.';
    }

    if(value==='role' && languageByChat.has(chatId)){
      questionnaireByChat.set(chatId,{phase:'role',language,profile:{}});
      return rolePrompt(language);
    }
    const edit=/^edit\s+([1-6])$/u.exec(value);
    if(edit && state?.role && questionSets[state.role]?.[Number(edit[1])-1]){
      const next={...state,phase:'questions',index:Number(edit[1])-1};
      questionnaireByChat.set(chatId,next);return currentQuestion(next);
    }
    // Let users ask factual questions without losing their active questionnaire.
    if((/[?？]/u.test(text) || /^(?:ask\s|what\b|how\b|who\b|when\b|क्या|कितन|कैसे|कब)/iu.test(text)) && languageByChat.has(chatId)){
      return await answerQuestion(chatId,text.replace(/^ask\s+/i,''),language);
    }

    if (state?.phase === 'role') {
      const role = parseRole(text);
      if (!role) return rolePrompt(state.language, true);
      if (!questionSets[role]) {
        questionnaireByChat.delete(chatId);
        return `${infoOnly(role, state.language, passages ?? loadPassages())}\n\n${state.language === 'hi' ? 'अब सवाल पूछें या दूसरी भूमिका के लिए YOJANA ROLE भेजें।' : 'Ask a question now, or send YOJANA ROLE to add another role.'}`;
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
      if (value === 'back' || value === '3') {
        if (state.index === 0) return currentQuestion(state);
        const next = { ...state, index: state.index - 1 };
        questionnaireByChat.set(chatId, next);
        return currentQuestion(next);
      }
      const numericChoice = { '1': true, '2': false, '4': null };
      const answer = Object.hasOwn(numericChoice, value) ? numericChoice[value] : parseYesNo(text);
      const step = questionSets[state.role][state.index];
      if (answer === undefined) {
        const proposed=naturalFlow?await interpretAnswer(text,step.key):null;
        if(typeof proposed==='boolean'){
          questionnaireByChat.set(chatId,{...state,phase:'answer_confirm',proposed_answer:proposed});
          return state.language==='hi'?`आपकी बात से इस सवाल का जवाब ${proposed?'हाँ':'नहीं'} समझा।\n1 पुष्टि · 2 सुधारें · 3 रद्द करें`:`I understood ${proposed?'YES':'NO'} for this question.\n1 Confirm · 2 Correct · 3 Cancel`;
        }
        return currentQuestion(state, true);
      }
      const profile = { ...state.profile, [step.key]: answer };
      let nextIndex = state.index + 1;
      while(nextIndex < questionSets[state.role].length && typeof profile[questionSets[state.role][nextIndex].key]==='boolean')nextIndex++;
      if (nextIndex < questionSets[state.role].length) {
        const next = { ...state, profile, index: nextIndex };
        questionnaireByChat.set(chatId, next);
        return currentQuestion(next);
      }

      const completed={...state,phase:'complete',profile,index:nextIndex};
      questionnaireByChat.set(chatId,completed);
      remember(chatId,completed);
      try {
        const result = answers.recommend({ profile, language: state.language });
        if(result.results?.length)awaitingCscOffer.set(chatId,now()+300000);
        const another=naturalFlow && state.role==='farmer' && result.results?.length && (passages??loadPassages()).some(p=>p.scheme_id==='pm-sym' && p.id==='pm-sym-ministry-note-2025:2');
        if(another)moreSchemeByChat.set(chatId,'pm-sym');
        return formatRecommendation(result, state.language)+(result.results?.length?'\n\n'+cscOffer(state.language):'')+(another?'\n\n'+moreHint(state.language):'');
      } catch {
        return state.language === 'hi' ? 'सुझाव सेवा अभी उपलब्ध नहीं है। बाद में फिर कोशिश करें।' : 'The recommendation service is unavailable. Please try again later.';
      }
    }

    if(value==='next' && state?.phase==='complete'){
      const missing=questionSets[state.role].findIndex(q=>typeof state.profile[q.key]!=='boolean');
      if(missing>=0){const next={...state,phase:'questions',index:missing};questionnaireByChat.set(chatId,next);return currentQuestion(next);}
      return resultControls(language);
    }
    if (/^match\b/i.test(value)) return language==='hi'?'नमूना जाँच के लिए START भेजें।':'Send START for the named fictional questionnaire.';
    return answerQuestion(chatId,text,language);
  }

  function acceptsBareQuestionnaireReply(chatId, text) {
    if (awaitingCsc.get(chatId) > now() && String(text ?? '').trim()) return true;
    if (awaitingCscOffer.get(chatId) > now() && String(text ?? '').trim()) return true;
    const phase = questionnaireByChat.get(chatId)?.phase;
    if((phase || saved(chatId)) && /^(?:stop|delete|resume|save|alerts on|alerts off|role|edit [1-6]|next|more|cancel)$/iu.test(normalize(text)))return true;
    if (phase === 'language') return ['1', '2'].includes(normalize(text)) || (naturalFlow && isProfileStatement(text));
    if (naturalFlow && phase === 'natural_confirm') return String(text ?? '').trim().length>0;
    if (naturalFlow && phase === 'income_period') return String(text ?? '').trim().length>0;
    return ['role','questions','natural_confirm','income_period','answer_confirm'].includes(phase) && Boolean(String(text ?? '').trim());
  }

  return { handle, handleProfileStatement, isProfileStatement: text=>naturalFlow && isProfileStatement(text), answerQuestion, acceptsBareQuestionnaireReply, choosingLanguage: chatId => questionnaireByChat.get(chatId)?.phase === 'language', selectedLanguage: chatId => ['role','questions','natural_confirm','income_period','answer_confirm'].includes(questionnaireByChat.get(chatId)?.phase) ? (languageByChat.get(chatId) || null) : null, hasActiveConversation: chatId => touched.has(chatId) || languageByChat.has(chatId) || questionnaireByChat.has(chatId) };
}
