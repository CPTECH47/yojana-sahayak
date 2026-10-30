# WhatsApp conversation and QA handoff — Tejas

Status: proposed copy and review, not implemented or tested over WhatsApp. Charchit owns the server adapter and conversation state. Use only fictional profiles during the hackathon.

## Bilingual message suggestions

| Moment | English | Hindi |
| --- | --- | --- |
| Start | Welcome to Yojana Sahayak. Choose your language: 1. English  2. हिन्दी | योजना सहायक में आपका स्वागत है। भाषा चुनें: 1. English  2. हिन्दी |
| Privacy | For this demo, use fictional information. Do not send Aadhaar, bank details, passwords or OTPs. | इस डेमो में काल्पनिक जानकारी दें। आधार, बैंक विवरण, पासवर्ड या OTP न भेजें। |
| Next step | Ask a question or check possible matches. A match is not an official decision. | सवाल पूछें या संभावित योजनाएँ देखें। मिलान सरकारी निर्णय नहीं है। |
| One question | Does the sample person own cultivable land? Reply yes, no or unsure. | क्या नमूना व्यक्ति के पास खेती योग्य भूमि है? हाँ, नहीं या पता नहीं लिखें। |
| Unknown | I will leave this answer unknown. You can change it later. | यह उत्तर अभी अज्ञात रहेगा। आप इसे बाद में बदल सकते हैं। |
| Correct | Which answer would you like to change? | आप कौन-सा उत्तर बदलना चाहेंगे? |
| Missing | More information is needed: {server-provided conditions}. | और जानकारी चाहिए: {server-provided conditions}। |
| Match | {scheme name}: possible match based on the checked conditions. This is not an official decision. | {scheme name}: जाँची गई शर्तों के आधार पर संभावित मिलान। यह सरकारी निर्णय नहीं है। |
| No evidence | I could not verify an answer from the available documents. Please ask another way or check the official source. | उपलब्ध दस्तावेज़ों से उत्तर की पुष्टि नहीं हो सकी। कृपया सवाल दूसरे तरीके से पूछें या आधिकारिक स्रोत देखें। |
| Service error | The service is unavailable right now. Please try again later. | सेवा अभी उपलब्ध नहीं है। कृपया थोड़ी देर बाद फिर प्रयास करें। |
| Source | Source: {document title}, {page or section}, {exact URL}. | स्रोत: {document title}, {page or section}, {exact URL}। |

Only interpolate fields actually returned by the validated server. Do not generate scheme names, URLs, eligibility conditions or promises from these templates. Keep scheme discovery generic; the current matching contract covers selected PM-KISAN conditions only.

## Checks completed

- Reviewed captain/server-integration commit b6fa4acc0394b4a31fdcf2c4da71608d80119773: YOJANA-prefixed direct text is routed to shared chat; replies append returned citation title, locator and URL. The start text is English-only, and match remains a fictional diagnostic shortcut; language selection, guided correction, voice and persistent conversation are not implemented in the reviewed handler.
- On that exact commit, `node --test server/answer-service.test.mjs`: 5/5 pass. These tests use a mocked model for the Hindi answer and do not prove live model or WhatsApp delivery.
- On the UI checkout's running local API: a fictional partial profile produced needs_information and two PM-KISAN source references. An unsupported fictional question received a no-evidence answer. Ollama endpoint was unavailable and the answerable PM-KISAN request returned model_unavailable.
- Citation review verified the returned URL strings and page locators in the response; it did not confirm the government PDF opened or that every cited passage supports every claim.

## Remaining team integration checks

- After the conversation implementation lands, test English and Hindi language selection, each named question, skip, correction, restart and status for fictional match/exclusion/unknown profiles.
- On a consenting paired test account, verify actual delivery, duplicate-message handling, long answers and opening exact source links on a phone. Do not store private conversations or authentication files in Git.
- Test an answerable unseen question and an unsupported question in each language against reviewed passages with the real local model. Record version, hardware, latency, source checks and any incorrect refusals.
- Pulkit and Charchit must review and integrate additional public documents and scheme-specific rules; never claim all schemes are covered. Test additional occupation/student cases once supported.
- The optional web UI has not been approved as the main interface. Its independent Hindi/correction/error/link tests remain pending if the captain chooses to use it.
