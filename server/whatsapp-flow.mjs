import { loadPassages } from './corpus.mjs';
import { memoryStore } from './local-store.mjs';

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
    ? 'डेमो में केवल काल्पनिक जानकारी दें। आधार, बैंक विवरण या पहचान संख्या न भेजें। सवाल कभी भी पूछ सकते हैं। उत्तर सत्र में रहेंगे; SAVE से सहमति देकर 30 दिन के लिए सहेज सकते हैं।'
    : 'Use fictional information for this demo. Do not send Aadhaar, bank details, or ID numbers. Ask a question at any time. Answers stay in this session; SAVE explicitly consents to saving them for 30 days.';
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
  const lead = error ? (language === 'hi' ? 'जवाब समझ नहीं आया। कृपया नीचे दिए गए विकल्पों में से चुनें।\n' : 'I didn’t understand that. Reply YES or NO, or use BACK, SKIP, or CANCEL.\n') : '';
  const answerHint = language === 'hi' ? '\n1 हाँ\n2 नहीं\n3 पिछला सवाल (BACK)\n4 पता नहीं (SKIP)\n5 रोकें (CANCEL)' : '\nAnswer: YES / NO';
  const controls = language === 'hi'
    ? '\nविकल्प का नंबर भेजें। हाँ, नहीं, BACK, SKIP या CANCEL भी लिख सकते हैं।'
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
  const csc = language === 'hi'
    ? 'नज़दीकी सेवा केंद्र खोजने के लिए 6 अंकों का PIN कोड या शहर का नाम भेजें। नहीं चाहिए तो SKIP भेजें। आधिकारिक CSC सूची: https://locator.csccloud.in/ (वहाँ अपना क्षेत्र चुनें)।'
    : 'To search for nearby service centres, reply with a 6-digit PIN code or town name. Send SKIP if you do not need this. Official CSC locator: https://locator.csccloud.in/ (select your area there).';
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
export function createWhatsAppConversation({ answers, passages, store = memoryStore(), now = Date.now }) {
  const languageByChat = new Map();
  const questionnaireByChat = new Map();
  const completedByChat = new Map();
  const touched = new Map();
  const awaitingCsc = new Map();
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
  function resultControls(language) {
    return language==='hi'?'सुधार: EDIT 1 (सवाल का नंबर), आगे: NEXT, दूसरी भूमिका: ROLE, सहेजें: SAVE, फिर खोलें: RESUME, अपडेट: ALERTS ON, बंद: STOP, मिटाएँ: DELETE।':'Correct: EDIT 1 (question number), continue: NEXT, another role: ROLE, save: SAVE, resume: RESUME, updates: ALERTS ON, unsubscribe: STOP, erase: DELETE.';
  }
  async function answerQuestion(chatId,text,language) {
    const result=await answers.chat({question:text,language});
    const mode=result.mode==='extractive'?(language==='hi'?'जाँचे गए रिकॉर्ड का उत्तर (स्थानीय मॉडल उपलब्ध नहीं था)।\n':'Answer from reviewed records (local model unavailable).\n'):'';
    return mode+(result.answer_text || (language==='hi'?'उत्तर उपलब्ध नहीं है।':'No answer is available.'))+
      (result.citations?.length?'\n'+result.citations.map(c=>(language==='hi'?'स्रोत: ':'Source: ')+c.title+', '+c.locator+' — '+c.url).join('\n'):'');
  }

  async function beginProfile(chatId, language) {
    languageByChat.set(chatId, language);
    questionnaireByChat.set(chatId, { phase: 'role', language, profile: {} });
    return `${intro(language)}\n\n${rolePrompt(language)}`;
  }

  async function handle(chatId, text) {
    if (!chatId) throw new TypeError('A direct-chat identifier is required');
    if(typeof text!=='string' || text.length>1000)return 'Please send a short text question (up to 1000 characters).';
    for(const [id,at] of touched)if(now()-at>86400000){touched.delete(id);languageByChat.delete(id);questionnaireByChat.delete(id);completedByChat.delete(id);awaitingCsc.delete(id);}
    if(!touched.has(chatId) && touched.size>=2000)return 'The service is busy. Please try again later.';
    touched.set(chatId,now());
    const value = normalize(text);
    const state = questionnaireByChat.get(chatId);
    const language=languageByChat.get(chatId)||saved(chatId)?.language||'en';
    if (value === 'csc') {
      awaitingCsc.set(chatId,now()+300000);
      return language==='hi' ? 'CSC खोजने के लिए 6 अंकों का PIN कोड या शहर का नाम भेजें। रद्द करने के लिए CANCEL भेजें।' : 'Send a 6-digit PIN code or town name to search for a CSC. Send CANCEL to stop.';
    }
    if (awaitingCsc.get(chatId) && awaitingCsc.get(chatId) > now()) {
      if (value === 'cancel' || value === 'skip' || value === 'start') { awaitingCsc.delete(chatId); if(value!=='start') return language==='hi'?'केंद्र की खोज छोड़ दी गई। सवाल पूछने के लिए YOJANA के बाद अपना सवाल भेजें।':'Centre search skipped. Send YOJANA followed by your question whenever you need help.'; }
      else if (/^(?:stop|delete|resume|save|alerts on|alerts off|role|edit [1-6]|next)$/iu.test(value) || /[?？]/u.test(text)) awaitingCsc.delete(chatId);
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
      questionnaireByChat.delete(chatId);completedByChat.delete(chatId);languageByChat.delete(chatId);
      return language==='hi'?'सहेजी गई जानकारी और अपडेट की सहमति मिटा दी गई।':'Saved profile and update consent deleted.';
    }
    if(['stop','alerts off'].includes(value)){
      const old=saved(chatId);if(old)store.put('profiles',store.id(chatId),{...old,alert_opt_in:false,recipient:null});
      for(const [key,a] of store.entries('alerts'))if(a.profile_id===store.id(chatId)&&a.status==='queued')store.put('alerts',key,{...a,status:'cancelled'});
      return language==='hi'?'योजना अपडेट बंद हैं।':'Scheme updates are off.';
    }
    if(value==='save'){
      const profiles=completedByChat.get(chatId);
      if(!profiles || !Object.keys(profiles).length)return language==='hi'?'पहले नमूना जाँच पूरी करें।':'Complete a fictional profile check first.';
      const old=saved(chatId);
      store.put('profiles',store.id(chatId),{...old,storage_consent:true,alert_opt_in:old?.alert_opt_in||false,language,
        profile:state?.profile || Object.values(profiles).at(-1),profiles,expires_at:now()+30*86400000});
      return language==='hi'?'आपकी सहमति से नमूना जानकारी 30 दिन के लिए सहेजी गई। RESUME से खोलें; DELETE से मिटाएँ। अपडेट पाने के लिए अलग से ALERTS ON भेजें।':'With your consent, the fictional profile is saved for 30 days. RESUME to reopen or DELETE to erase. Send ALERTS ON separately if you want reviewed scheme updates.';
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
      if(result.results?.length)awaitingCsc.set(chatId,now()+300000);
      return formatRecommendation(result,old.language)+'\n'+resultControls(old.language);
    }

    if (isStart(text)) {
      languageByChat.delete(chatId);
      questionnaireByChat.set(chatId, { phase: 'language' });
      return languagePrompt()+(saved(chatId)?'\nRESUME: saved fictional profile / सहेजी गई नमूना जानकारी':'');
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

    if ((/^cancel$/iu.test(value) || (state?.phase === 'questions' && state.language === 'hi' && value === '5')) && state) {
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
      if (value === 'back' || (state.language === 'hi' && value === '3')) {
        if (state.index === 0) return currentQuestion(state);
        const next = { ...state, index: state.index - 1 };
        questionnaireByChat.set(chatId, next);
        return currentQuestion(next);
      }
      const hindiChoice = state.language === 'hi' ? { '1': true, '2': false, '4': null } : {};
      const answer = Object.hasOwn(hindiChoice, value) ? hindiChoice[value] : parseYesNo(text);
      if (answer === undefined) return currentQuestion(state, true);
      const step = questionSets[state.role][state.index];
      const profile = { ...state.profile, [step.key]: answer };
      const partial=answers.recommend({profile,language:state.language});
      const nextIndex = state.index + 1;
      if (nextIndex < questionSets[state.role].length && partial.results?.[0]?.status!=='not_matched') {
        const next = { ...state, profile, index: nextIndex };
        questionnaireByChat.set(chatId, next);
        return currentQuestion(next);
      }

      const completed={...state,phase:'complete',profile,index:nextIndex};
      questionnaireByChat.set(chatId,completed);
      remember(chatId,completed);
      try {
        const result = answers.recommend({ profile, language: state.language });
        if(result.results?.length)awaitingCsc.set(chatId,now()+300000);
        return `${formatRecommendation(result, state.language)}\n\n${resultControls(state.language)}`;
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
    if (awaitingCsc.get(chatId) > now() && String(text ?? '').trim()) return true;
    const phase = questionnaireByChat.get(chatId)?.phase;
    if((phase || saved(chatId)) && /^(?:stop|delete|resume|save|alerts on|alerts off|role|edit [1-6]|next|cancel)$/iu.test(normalize(text)))return true;
    if (phase === 'language') return ['1', '2'].includes(normalize(text));
    return (phase === 'role' || phase === 'questions') && Boolean(String(text ?? '').trim());
  }

  return { handle, acceptsBareQuestionnaireReply, selectedLanguage: chatId => ['role','questions'].includes(questionnaireByChat.get(chatId)?.phase) ? (languageByChat.get(chatId) || null) : null, hasActiveConversation: chatId => touched.has(chatId) || languageByChat.has(chatId) || questionnaireByChat.has(chatId) };
}
