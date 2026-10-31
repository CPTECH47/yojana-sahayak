import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore } from './store.mjs';
import { createSmsService, DemoError } from './service.mjs';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export function loadConfig(directory = root) {
  const path = resolve(directory, '.runtime/config.json');
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, '')) : { mode: 'simulator', dailySegmentLimit: 6 };
}

export function createDemoServer(service) {
  const files = new Map([
    ['/', ['index.html', 'text/html; charset=utf-8']],
    ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
    ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ]);
  const reply = (res, code, data) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
  return createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
    try {
      const host = req.headers.host || '';
      if (!/^(?:127\.0\.0\.1|localhost):\d+$/.test(host)) throw new DemoError('Use the local operator URL.', 403);
      const path = new URL(req.url, 'http://' + host).pathname;
      if (req.headers.origin && req.headers.origin !== 'http://' + host) throw new DemoError('Cross-origin requests are not allowed.', 403);
      if (req.method === 'GET' && files.has(path)) {
        const [file, type] = files.get(path); res.writeHead(200, { 'Content-Type': type }); return res.end(readFileSync(resolve(root, 'public', file)));
      }
      if (req.method === 'GET' && path === '/api/state') return reply(res, 200, service.state());
      if (req.method !== 'POST' || !['/api/prepare', '/api/send', '/api/status'].includes(path)) return reply(res, 404, { error: 'Unknown route.' });
      if (req.headers['x-demo-request'] !== '1' || !String(req.headers['content-type']).startsWith('application/json')) throw new DemoError('Use the operator console or authenticated local integration format.', 403);
      let size = 0, body = '';
      for await (const chunk of req) { size += chunk.length; if (size > 4096) throw new DemoError('Request too large.', 413); body += chunk; }
      let input;
      try { input = JSON.parse(body); } catch { throw new DemoError('Invalid JSON.'); }
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new DemoError('Expected a JSON object.');
      if (path === '/api/prepare') return reply(res, 201, service.prepare(input));
      if (typeof input.id !== 'string' || input.id.length > 128) throw new DemoError('A message ID is required.');
      return reply(res, 200, path === '/api/send' ? await service.send(input.id) : await service.status(input.id));
    } catch (error) { reply(res, error instanceof DemoError ? error.status : 500, { error: error instanceof DemoError ? error.message : 'Local demo error. Inspect configuration; no automatic retry.' }); }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let store;
  try {
    const config = loadConfig(); store = openStore(resolve(root, '.runtime/state'));
    const service = createSmsService({ config, store });
    const port = Number(process.env.SMS_DEMO_PORT || 3012);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Invalid port.');
    const server = createDemoServer(service);
    server.on('error', () => { console.error('Cannot start SMS demo. Check configuration or whether port 3012 is in use.'); store.close(); process.exitCode = 1; });
    server.listen(port, '127.0.0.1', () => {
      console.log(`Yojana SMS demo: http://127.0.0.1:${port}/`);
      console.log(`Mode: ${config.mode || 'simulator'}. Real sends require a configured Android gateway and a confirmation in the console.`);
    });
    const stop = () => server.close(() => { store.close(); });
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
  } catch { store?.close(); console.error('Cannot start. Check the private configuration and runtime lock. No SMS submitted.'); process.exitCode = 1; }
}
