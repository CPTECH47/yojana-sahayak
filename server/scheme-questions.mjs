export const questionSets = {
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
  'pm-kmy': [
    { key: 'small_marginal_land_up_to_2ha', en: 'Are you a small/marginal farmer with cultivable land of up to 2 hectares?', hi: 'क्या आप अधिकतम 2 हेक्टेयर खेती योग्य जमीन वाले छोटे/सीमांत किसान हैं?' },
    { key: 'age_18_to_40', en: 'Are you aged 18–40 at entry?', hi: 'क्या योजना में प्रवेश के समय आपकी आयु 18–40 वर्ष है?' },
    { key: 'recorded_on_2019_08_01', en: 'Was your name in State/UT land records on 1 August 2019?', hi: 'क्या 1 अगस्त 2019 को राज्य/केंद्रशासित प्रदेश के भूमि रिकॉर्ड में आपका नाम था?' },
    { key: 'other_pension_coverage', en: 'Are you already covered by NPS/ESIC/EPF, PM-SYM, PM-LVM or another statutory pension scheme?', hi: 'क्या आप NPS/ESIC/EPF, PM-SYM, PM-LVM या अन्य वैधानिक पेंशन योजना में पहले से शामिल हैं?' },
    { key: 'other_kmy_exclusion', en: 'Does another official PM-KMY exclusion apply? Read the cited exclusions; if unsure, reply 4.', hi: 'क्या PM-KMY का कोई अन्य सरकारी अपवाद लागू है? दिए गए स्रोत के अपवाद पढ़ें; पता न हो तो 4 भेजें।', source_hint: true },
  ],
  nmmss: [
    { key: 'fresh_class_ix_selected', en: 'Is this a fresh Class IX application after selection in the State/UT NMMSS examination? Renewal/test-entry checks are separate.', hi: 'क्या यह राज्य/केंद्रशासित प्रदेश की NMMSS परीक्षा में चयन के बाद कक्षा 9 का नया आवेदन है? नवीनीकरण/परीक्षा-प्रवेश की जाँच अलग है।' },
    { key: 'eligible_school', en: 'Do you study regularly at a state-government, government-aided or local-body school?', hi: 'क्या आप राज्य सरकार, सरकारी सहायता प्राप्त या स्थानीय निकाय के स्कूल में नियमित पढ़ते हैं?' },
    { key: 'parental_income_at_most_350000', en: 'Is your parents’ total annual income ₹3.50 lakh or less?', hi: 'क्या आपके माता-पिता की कुल वार्षिक आय ₹3.50 लाख या कम है?' },
    { key: 'class_vii_marks_requirement', en: 'Did your Class VII result meet 55%, or 50% if SC/ST, or the equivalent grade? No certificate numbers needed.', hi: 'क्या कक्षा 7 में 55% अंक, या SC/ST होने पर 50% अंक, अथवा बराबर ग्रेड मिला? प्रमाणपत्र नंबर न भेजें।' },
  ],
  'pm-vishwakarma': [
    { key: 'notified_trade_active', en: 'Do you currently work with hands/tools in one of the 18 notified traditional trades? Ask “PM Vishwakarma trades” for the list.', hi: 'क्या आप अभी हाथ/औज़ार से 18 सूचीबद्ध पारंपरिक व्यवसायों में से कोई काम करते हैं? सूची के लिए “PM Vishwakarma trades” पूछें।' },
    { key: 'age_at_least_18', en: 'Are you at least 18 on the registration date?', hi: 'क्या पंजीकरण की तारीख को आपकी आयु कम से कम 18 वर्ष है?' },
    { key: 'self_employed_unorganised', en: 'Are you self-employed in the unorganised sector?', hi: 'क्या आप असंगठित क्षेत्र में अपना काम करते हैं?' },
    { key: 'similar_loan_exclusion', en: 'Have you taken a similar government business loan in the past 5 years? Do not count fully repaid MUDRA/PM SVANidhi loans.', hi: 'क्या पिछले 5 वर्षों में सरकारी व्यवसाय ऋण लिया है? पूरा चुकाया हुआ MUDRA/PM SVANidhi ऋण इसमें न गिनें।' },
    { key: 'family_member_registered', en: 'Has another family member registered for PM Vishwakarma? Family here means husband, wife and unmarried children.', hi: 'क्या परिवार का कोई अन्य सदस्य PM Vishwakarma में पंजीकृत है? यहाँ परिवार का अर्थ पति, पत्नी और अविवाहित बच्चे हैं।' },
    { key: 'government_service_family', en: 'Are you or a member of that family in government service?', hi: 'क्या आप या उस परिवार का कोई सदस्य सरकारी सेवा में है?' },
  ],
};
