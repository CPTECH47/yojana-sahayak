// Curated application guidance, not an eligibility engine or generated scheme facts.
export const templates = Object.freeze([
  {
    id: 'pmuy-apply', name: 'PMUY application guidance', checkedOn: '2026-10-31', reviewBy: '2026-11-07',
    source: 'https://pmuy.gov.in/ujjwala2.html',
    en: 'Yojana Sahayak demo: For PMUY applications, visit https://pmuy.gov.in/ujjwala2.html or ask an LPG distributor. Eligibility is not confirmed.',
    hi: 'योजना सहायक डेमो: PMUY आवेदन के लिए https://pmuy.gov.in/ujjwala2.html देखें या LPG वितरक से पूछें। यह पात्रता की मंजूरी नहीं है।',
  },
  {
    id: 'csc-help', name: 'Official CSC locator', checkedOn: '2026-10-31', reviewBy: '2026-11-07',
    source: 'https://locator.csccloud.in/',
    en: 'Yojana Sahayak demo: Find a CSC at https://locator.csccloud.in/ using your PIN/area. Confirm services before visiting. Nearest-centre lookup is not available here.',
    hi: 'योजना सहायक डेमो: CSC खोजने के लिए https://locator.csccloud.in/ पर अपना पिन या क्षेत्र चुनें। जाने से पहले सेवा की पुष्टि करें। यहाँ निकटतम केंद्र की सूची नहीं है।',
  },
]);

const basic = new Set(Array.from('@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'));
const extended = new Set(Array.from('^{}\\[~]|€\f'));
export function estimateSegments(text) {
  let units = 0, gsm = true;
  for (const character of text) {
    if (basic.has(character)) units++;
    else if (extended.has(character)) units += 2;
    else { gsm = false; break; }
  }
  if (!gsm) units = text.length; // UTF-16 units: conservative for surrogate pairs.
  const single = gsm ? 160 : 70, multipart = gsm ? 153 : 67;
  return { encoding: gsm ? 'GSM-7' : 'Unicode', units, segments: units <= single ? 1 : Math.ceil(units / multipart), estimate: true };
}

export function dayInIndia(now = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function selectTemplate(id, language, now) {
  const template = templates.find(item => item.id === id);
  if (!template || !['en', 'hi'].includes(language)) throw new Error('Select a supported template and Hindi or English.');
  if (dayInIndia(now) > template.reviewBy) throw new Error('This demo template needs a fresh official-source review before use.');
  return { ...template, text: template[language], language, ...estimateSegments(template[language]) };
}
