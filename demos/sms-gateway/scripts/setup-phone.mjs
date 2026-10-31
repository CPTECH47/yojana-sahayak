import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { root } from '../src/server.mjs';
import { gatewaySettings } from '../src/service.mjs';

export function terminalPrompt(input, output) {
  let hidden = false;
  const sink = new Writable({ write(chunk, encoding, done) { if (!hidden) output.write(chunk, encoding); done(); } });
  sink.isTTY = Boolean(output.isTTY); sink.columns = output.columns || 80;
  // Disabling history also prevents a later Up arrow from redisplaying the password.
  const rl = createInterface({ input, output: sink, terminal: true, historySize: 0 });
  const cancelled = new AbortController();
  rl.on('SIGINT', () => { cancelled.abort(); rl.close(); });
  return {
    async ask(label, { secret = false } = {}) {
      if (!secret) return rl.question(label, { signal: cancelled.signal });
      output.write(label); hidden = true;
      try { return await rl.question('', { signal: cancelled.signal }); }
      finally { hidden = false; output.write('\n'); }
    },
    close() { rl.close(); },
  };
}

export async function setupPhone({ ask, directory = resolve(root, '.runtime') }) {
  const usbPath = resolve(directory, 'usb.json');
  const usb = existsSync(usbPath) ? JSON.parse(readFileSync(usbPath, 'utf8').replace(/^\uFEFF/, '')) : null;
  const defaultUrl = usb?.gatewayUrl || '';
  const enteredUrl = await ask(`Gateway URL${defaultUrl ? ` [Enter = ${defaultUrl}]` : ' (example http://192.168.1.20:8080)'}: `);
  const username = (await ask('Local Server username shown in the phone app: ')).trim();
  const password = await ask('Local Server password (hidden; press Enter when finished): ', { secret: true });
  const recipient = (await ask('One consenting test recipient in international format (+91...): ')).trim();
  const messagesPath = (await ask('Message route from phone /docs [/message or /messages; Enter = /message]: ')).trim() || '/message';
  if (!/^\+[1-9]\d{7,14}$/.test(recipient)) throw Error('Use international phone format including +; configuration was not changed.');
  const config = { mode: 'android', gatewayUrl: enteredUrl.trim() || defaultUrl, username, password, allowedNumbers: [recipient], messagesPath, dailySegmentLimit: 6 };
  gatewaySettings(config); // Validate the private address and credentials before writing anything.
  mkdirSync(directory, { recursive: true });
  const destination = resolve(directory, 'config.json');
  const temporary = resolve(directory, 'config.setup.tmp');
  writeFileSync(temporary, JSON.stringify(config, null, 2), { mode: 0o600 });
  if (existsSync(destination)) copyFileSync(destination, resolve(directory, 'config.previous.json'));
  renameSync(temporary, destination);
  return { mode: config.mode, recipientCount: 1, dailySegmentLimit: 6 }; // No secrets in return/log output.
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let prompt;
  try {
    if (!process.stdin.isTTY || !process.stdout.isTTY) throw Error('Run npm.cmd run setup:phone in your interactive PowerShell or Command Prompt window.');
    console.log('Local phone setup — Node.js wizard; no execution-policy changes and no SMS sends.');
    console.log('Keep the USB cable connected and start Local Server in the Android app. Enter its credentials only here.');
    prompt = terminalPrompt(process.stdin, process.stdout);
    await setupPhone({ ask: prompt.ask });
    console.log('Saved in private .runtime/config.json. This file contains credentials; keep it local.');
    console.log('Next: npm.cmd run check:phone. Restart the demo before confirming ONE real SMS.');
    console.log('The six-segment demo budget does not measure other apps or guarantee carrier billing.');
  } catch (error) {
    console.error(error.name === 'AbortError' ? 'Setup cancelled. No SMS sent.' : error.message);
    process.exitCode = 1;
  } finally { prompt?.close(); }
}
