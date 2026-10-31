// Read-only HTTP audit probes. Creates ephemeral localhost servers and changes no corpus data.
import { createApp } from '../../server/index.js';
import { loadPassages } from '../../server/corpus.mjs';

async function inspect(label, getPassages) {
  const server = createApp({ getPassages }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const root = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(`${root}/api/catalog`);
    const data = await response.json();
    console.log(JSON.stringify({
      label, status: response.status, cacheControl: response.headers.get('cache-control'),
      schemes: data.schemes.length, records: data.records.length,
      nmmssRecords: data.records.filter(record => record.scheme_id === 'nmmss').length,
      sourceFields: data.records.length ? Object.keys(data.records[0].source) : [],
    }));
    const missing = await fetch(`${root}/assets/audit-missing.js`);
    console.log(JSON.stringify({ label, missingAssetStatus: missing.status, contentType: missing.headers.get('content-type') }));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

for (const day of ['2026-10-31T12:00:00+05:30', '2026-11-01T12:00:00+05:30']) {
  await inspect(day, () => loadPassages(new Date(day)));
}
await inspect('empty corpus', () => []);
