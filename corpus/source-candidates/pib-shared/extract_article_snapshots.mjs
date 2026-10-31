import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(here, '../../..');
const rawDir = resolve(process.argv[2] ?? join(root, 'corpus/source-candidates/pib-shared/raw-local'));
const outDir = resolve(process.argv[3] ?? join(here, 'snapshots'));
const recordsPath = join(here, 'candidate-records.json');
const records = JSON.parse(await readFile(recordsPath, 'utf8'));

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function decodeEntities(text) {
  const named = {
    amp: '&', apos: "'", gt: '>', lt: '<', quot: '"', nbsp: ' ',
    rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–',
    mdash: '—', hellip: '…', copy: '©', reg: '®',
  };
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, entity) => {
    if (entity[0] === '#') {
      const value = entity[1]?.toLowerCase() === 'x'
        ? Number.parseInt(entity.slice(2), 16)
        : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : whole;
    }
    return named[entity.toLowerCase()] ?? whole;
  });
}

function extractArticleBody(html) {
  const startTag = /<div\b[^>]*\bid=["'](?:pibReleaseBody|condiv)["'][^>]*>/i.exec(html);
  let fragment;
  if (startTag) {
    const bodyStart = startTag.index + startTag[0].length;
    const tail = html.slice(bodyStart);
    const tokens = /<\/?div\b[^>]*>/gi;
    let depth = 1;
    let endIndex = -1;
    for (const token of tail.matchAll(tokens)) {
      if (/^<\s*\/div/i.test(token[0])) depth -= 1;
      else depth += 1;
      if (depth === 0) {
        endIndex = token.index;
        break;
      }
    }
    if (endIndex < 0) throw new Error('Could not close PIB article body element');
    fragment = tail.slice(0, endIndex);
  } else {
    const dateIndex = html.indexOf('Posted On:');
    const releaseIndex = html.search(/Release ID:\s*\d+/i);
    if (dateIndex < 0 || releaseIndex <= dateIndex) {
      throw new Error('Could not locate PIB article boundaries');
    }
    fragment = html.slice(dateIndex, releaseIndex);
  }
  fragment = fragment
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|li|tr|h[1-6])\s*>/gi, '\n\n')
    .replace(/<[^>]*>/g, ' ');
  return decodeEntities(fragment)
    .replace(/\r\n?/g, '\n')
    .replace(/[\t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n';
}

await mkdir(outDir, { recursive: true });
for (const record of records.candidates) {
  const rawPath = join(rawDir, record.raw_filename);
  const raw = await readFile(rawPath);
  if (raw.length !== record.raw_bytes || sha256(raw) !== record.raw_sha256) {
    throw new Error(`Raw source mismatch: ${record.id}`);
  }
  const body = extractArticleBody(raw.toString('utf8'));
  const bodyBytes = Buffer.from(body, 'utf8');
  const outputName = `${record.id}.txt`;
  await writeFile(join(outDir, outputName), bodyBytes);
  record.raw_path = `local-only/${basename(rawPath)}`;
  record.snapshot_file = `corpus/source-candidates/pib-shared/snapshots/${outputName}`;
  record.snapshot_bytes = bodyBytes.length;
  record.snapshot_sha256 = sha256(bodyBytes);
  record.extraction_status = 'article_body_text_extracted';
  record.raw_snapshot_in_git = false;
  record.snapshot_in_git = true;
}
await writeFile(recordsPath, JSON.stringify(records, null, 2) + '\n');
console.log(`Extracted ${records.candidates.length} attributed PIB article-body snapshots.`);
