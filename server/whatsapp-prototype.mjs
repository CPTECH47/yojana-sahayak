import makeWASocket, { DisconnectReason, fetchLatestWaWebVersion, useMultiFileAuthState } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import pino from 'pino';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { answerMatch, demoCommand } from './yojana-answer.mjs';
import { createAnswerService } from './answer-service.mjs';

const authDir = fileURLToPath(new URL('./.baileys-auth/', import.meta.url));
const seen = new Set();
const answers = createAnswerService();

function messageText(message) {
  const content = message.message?.ephemeralMessage?.message ?? message.message;
  return content?.conversation ?? content?.extendedTextMessage?.text ?? '';
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestWaWebVersion();
  const socket = makeWASocket({ auth: state, version, logger: pino({ level: 'silent' }), printQRInTerminal: false });
  let pairingRequested = false;
  socket.ev.on('creds.update', saveCreds);
  socket.ev.on('connection.update', ({ connection, qr, lastDisconnect }) => {
    if (qr) {
      if (process.env.YOJANA_PAIRING_MODE === 'code' && !socket.authState.creds.registered) {
        if (!pairingRequested) {
          pairingRequested = true;
          const input = createInterface({ input: process.stdin, output: process.stdout });
          input.question('WhatsApp number with country code, digits only (entered locally): ')
            .then(async number => {
              input.close();
              if (!/^\d{10,15}$/.test(number)) throw new Error('Use 10-15 digits including country code, without + or spaces.');
              const code = await socket.requestPairingCode(number);
              console.log(`Enter pairing code ${code} in WhatsApp > Linked devices > Link a device > Link with phone number instead.`);
            })
            .catch(error => console.error('Pairing code failed:', error.message));
        }
      } else {
        QRCode.toFile(join(authDir, 'pairing.png'), qr, { margin: 2, scale: 8 })
          .then(() => console.log('Pairing QR saved to server/.baileys-auth/pairing.png'))
          .catch(error => console.error('Could not save pairing QR:', error.message));
        if (process.env.YOJANA_QR_QUIET === '1') console.log('WhatsApp QR received; pairing is ready.');
        else {
          console.log('Scan this QR in WhatsApp > Linked devices > Link a device:');
          qrcode.generate(qr, { small: true });
        }
      }
    }
    if (connection === 'open') console.log('WhatsApp connected. Ask a teammate to send YOJANA START in a direct chat.');
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log(`WhatsApp disconnected (${code ?? 'unknown'}).`);
      if (code !== DisconnectReason.loggedOut) setTimeout(start, 3000);
    }
  });
  socket.ev.on('messages.upsert', async ({ type, messages }) => {
    if (type !== 'notify') return;
    for (const message of messages) {
      const jid = message.key.remoteJid;
      const id = message.key.id;
      if (message.key.fromMe || !jid || jid.endsWith('@g.us') || !id || seen.has(id)) continue;
      seen.add(id);
      if (seen.size > 200) seen.clear();
      const text = demoCommand(messageText(message));
      if (text === null) continue;
      try {
        let reply;
        if (/^(start|hi|hello)?$/i.test(text)) reply = 'Yojana Sahayak pilot. Ask YOJANA PM-KISAN kitna paisa deta hai?, YOJANA PMUY who can apply?, YOJANA PM Vishwakarma benefits, or YOJANA PM-SYM age limit. NMMSS dates are checked only for the listed 2026-27 application window. YOJANA MATCH yes no no is a fictional PM-KISAN rehearsal, not an official eligibility decision.';
        else if (/^match\b/i.test(text)) reply = answerMatch(text);
        else if (text) {
          const result = await answers.chat({ question: text });
          reply = result.answer_text;
          if (result.citations?.length) reply += '\n' + result.citations.map(c => `Source: ${c.title}, ${c.locator} — ${c.url}`).join('\n');
        }
        else reply = 'This first test accepts text only. Send YOJANA START.';
        await socket.sendMessage(jid, { text: reply });
        console.log('Replied to one incoming message.');
      } catch (error) {
        console.error('Message failed:', error.message);
        await socket.sendMessage(jid, { text: 'The local answer service is unavailable. Please try again shortly.' }).catch(() => {});
      }
    }
  });
}

start().catch(error => { console.error(error.message); process.exitCode = 1; });
