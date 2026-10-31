import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const corpusPath = fileURLToPath(new URL('../corpus/passages.json', import.meta.url));
const manifestPath = fileURLToPath(new URL('../corpus/manifest.json', import.meta.url));
const ignored = new Set(['the', 'a', 'an', 'is', 'are', 'does', 'do', 'how', 'what', 'which', 'who', 'for', 'of', 'in', 'on', 'to', 'and', 'or', 'with', 'my', 'i', 'me', 'can', 'get', 'scheme', 'yojana', 'please', 'about']);
// Small reviewed vocabulary bridges Hindi questions to English source passages.
const bilingualTerms = Object.freeze({
  किसान:['farmer'], खेती:['farmer','land'], जमीन:['land'], लाभ:['benefit'], राशि:['amount','benefit'],
  पैसा:['amount'], रुपये:['amount'], किस्त:['instalment'], पेंशन:['pension'], आय:['income'],
  दस्तावेज:['document'], कागज:['document'], पात्र:['eligible'], योग्यता:['eligible'], आवेदन:['application'],
  सालाना:['annual'], मासिक:['monthly'], उम्र:['age'], महिला:['woman'], कामगार:['worker'], मजदूर:['worker'],
});

export const schemes = Object.freeze({
  'pm-kisan': { name: 'PM-KISAN', aliases: [/pm[\s-]?kisan/i, /पीएम[\s-]?किसान/u, /प्रधानमंत्री किसान/u] },
  'pm-kmy': { name: 'Pradhan Mantri Kisan Maandhan (PM-KMY)', aliases: [/\bpm[\s-]?kmy\b/i, /kisan\s+maan.?dhan/i, /किसान मानधन/u] },
  nmmss: { name: 'National Means-cum-Merit Scholarship Scheme', aliases: [/\bnmmss?\b/i, /national means.{0,12}merit/i, /नेशनल मीन्स/u] },
  pmuy: { name: 'Pradhan Mantri Ujjwala Yojana', aliases: [/\bpmuy\b/i, /ujjwala/i, /उज्ज्वला/u] },
  'pm-vishwakarma': { name: 'PM Vishwakarma', aliases: [/pm[\s-]?vishwakarma/i, /विश्वकर्मा/u] },
  'pm-sym': { name: 'Pradhan Mantri Shram Yogi Maandhan', aliases: [/pm[\s-]?sym/i, /shram yogi/i, /श्रम योगी/u] },
});

export function schemeFromText(text) {
  // The more specific pension name must precede the broad "PM Kisan" alias.
  if (schemes['pm-kmy'].aliases.some(alias => alias.test(text))) return 'pm-kmy';
  return Object.entries(schemes).find(([, scheme]) => scheme.aliases.some(alias => alias.test(text)))?.[0] ?? null;
}

export function passageDigest(passage) {
  const keys = ['id', 'document_id', 'scheme_id', 'title', 'authority', 'url', 'published_at', 'verified_at', 'snapshot_sha256', 'locator', 'text'];
  return createHash('sha256').update(JSON.stringify(keys.map(key => passage[key] ?? null))).digest('hex');
}

export function filterApprovedPassages(passages, sources, asOf = new Date()) {
  if (!Array.isArray(passages) || !Array.isArray(sources)) throw new Error('Corpus passages and manifest sources must be arrays');
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(asOf);
  const approved = new Map(sources.filter(source => source?.status === 'approved'
    && typeof source.id === 'string'
    && /^[a-f0-9]{64}$/.test(source.snapshot_sha256 || '')
    && (!source.valid_until || (/^\d{4}-\d{2}-\d{2}$/.test(source.valid_until) && source.valid_until >= day))).map(source => [source.id, source]));
  return passages.filter(passage => {
    const source = approved.get(passage.document_id);
    return source && passage.scheme_id === source.scheme_id && passage.url === source.url
      && passage.title === source.title && passage.authority === source.authority
      && passage.snapshot_sha256 === source.snapshot_sha256
      && source.passage_hashes?.[passage.id] === passageDigest(passage);
  });
}

export function loadPassages(asOf = new Date()) {
  const data = JSON.parse(readFileSync(corpusPath, 'utf8'));
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (!Array.isArray(data.passages)) throw new Error('Corpus passages are missing');
  if (!Array.isArray(manifest.sources)) throw new Error('Corpus source manifest is missing');
  return filterApprovedPassages(data.passages, manifest.sources, asOf);
}

function tokens(text) {
  const words=(text.toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? []).filter(word => word.length > 2 && !ignored.has(word));
  return [...new Set(words.flatMap(word=>[word,...(bilingualTerms[word]||[])]))];
}

export function retrieve(passages, query, schemeId, limit = 3) {
  const words = tokens(query);
  if (!words.length) return [];
  const ranked = passages
    .filter(p => !schemeId || p.scheme_id === schemeId)
    .map(p => {
      const body = p.text.toLowerCase();
      const title = p.title.toLowerCase();
      let score = 0;
      for (const word of words) {
        if (body.includes(word)) score += 1;
        if (title.includes(word)) score += 2;
      }
      return { passage: p, score };
    })
    .filter(row => row.score >= 2)
    .sort((a, b) => b.score - a.score);
  return ranked.slice(0, limit).map(row => row.passage);
}
