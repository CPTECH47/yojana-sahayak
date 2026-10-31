import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const records = JSON.parse(await readFile(resolve(here, 'candidate-records.json'), 'utf8'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const canonicalText = bytes => Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');

for (const item of records.candidates) {
  const snapshotPath = resolve(here, 'snapshots', `${item.id}.txt`);
  const snapshot = canonicalText(await readFile(snapshotPath));
  if (snapshot.length !== item.snapshot_bytes || digest(snapshot) !== item.snapshot_sha256) {
    throw new Error(`Article snapshot hash or byte count mismatch: ${item.id}`);
  }
  const excerpt = canonicalText(await readFile(resolve(here, item.excerpt_filename)));
  if (digest(excerpt) !== item.excerpt_sha256) {
    throw new Error(`Excerpt hash mismatch: ${item.id}`);
  }
  console.log(`${item.id}: ${snapshot.length} bytes; SHA-256 ${item.snapshot_sha256}; excerpt hash matches`);
}
