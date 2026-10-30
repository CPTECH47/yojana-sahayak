import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const corpusPath = fileURLToPath(new URL('../corpus/passages.json', import.meta.url));
const manifestPath = fileURLToPath(new URL('../corpus/manifest.json', import.meta.url));
const ignored = new Set(['the', 'a', 'an', 'is', 'are', 'does', 'do', 'how', 'what', 'which', 'who', 'for', 'of', 'in', 'on', 'to', 'and', 'or', 'with', 'my', 'i', 'me', 'can', 'get', 'scheme', 'yojana', 'please', 'about']);

export const schemes = Object.freeze({
  'pm-kisan': { name: 'PM-KISAN', aliases: [/pm[\s-]?kisan/i, /पीएम[\s-]?किसान/u, /प्रधानमंत्री किसान/u] },
  nmmss: { name: 'National Means-cum-Merit Scholarship Scheme', aliases: [/\bnmmss?\b/i, /national means.{0,12}merit/i, /नेशनल मीन्स/u] },
});

export function schemeFromText(text) {
  return Object.entries(schemes).find(([, scheme]) => scheme.aliases.some(alias => alias.test(text)))?.[0] ?? null;
}

export function filterApprovedPassages(passages, sources) {
  if (!Array.isArray(passages) || !Array.isArray(sources)) throw new Error('Corpus passages and manifest sources must be arrays');
  const approvedIds = new Set(sources.filter(source => source?.status === 'approved' && typeof source.id === 'string').map(source => source.id));
  return passages.filter(passage => approvedIds.has(passage.document_id));
}

export function loadPassages() {
  const data = JSON.parse(readFileSync(corpusPath, 'utf8'));
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (!Array.isArray(data.passages)) throw new Error('Corpus passages are missing');
  if (!Array.isArray(manifest.sources)) throw new Error('Corpus source manifest is missing');
  return filterApprovedPassages(data.passages, manifest.sources);
}

function tokens(text) {
  return [...new Set((text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(word => word.length > 2 && !ignored.has(word)))];
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
