import { supportedRecords } from './verified-facts.mjs';

// Render only the existing bilingual fact records whose current passages pass
// the same approval, expiry and digest checks used by the answer service.
// getPassages must return loadPassages() output in production.
export function resultEvidence(item, language, getPassages) {
  const hi = language === 'hi';
  const groups = [];
  const indexes = new Map();
  function addSource(source) {
    if (!source?.title || !source?.url) return null;
    const key = `${source.title}\n${source.url}`;
    if (!indexes.has(key)) {
      indexes.set(key, groups.length);
      groups.push({ title: source.title, url: source.url, locators: [] });
    }
    const index = indexes.get(key);
    const group = groups[index];
    if (source.locator && !group.locators.includes(source.locator)) group.locators.push(source.locator);
    return index + 1;
  }

  for (const source of item.citations || []) addSource(source);
  const points = [];
  if (item.status !== 'not_matched') {
    try {
      const passages = getPassages();
      const byId = new Map(passages.map(passage => [passage.id, passage]));
      const candidates = supportedRecords(passages).filter(record => record.scheme_id === item.scheme_id);
      const used = new Set();
      for (const [topic, label] of [
        ['benefit', hi ? 'लाभ' : 'Benefit'],
        ['conditions', hi ? 'ज़रूरी बात' : 'Important'],
      ]) {
        const record = candidates.find(candidate => !used.has(candidate.id)
          && candidate.topics.includes(topic) && typeof candidate[language] === 'string' && candidate[language].trim());
        if (!record) continue;
        const sourceNumber = addSource(byId.get(record.evidence_id));
        if (!sourceNumber) continue;
        used.add(record.id);
        points.push(`• ${label}: ${record[language].trim()} [${sourceNumber}]`);
      }
    } catch {
      // A result may still show its rule citations when extra highlights are unavailable.
    }
  }
  const sources = groups.map((source, index) => {
    const locator = source.locators.length ? `, ${source.locators.join(', ')}` : '';
    return `• ${hi ? 'स्रोत' : 'Source'}: ${source.title}${locator} — ${source.url} [${index + 1}]`;
  });
  return { points, sources };
}
