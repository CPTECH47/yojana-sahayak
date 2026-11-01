import 'dotenv/config';
import makeWASocket, { DisconnectReason, downloadMediaMessage, fetchLatestWaWebVersion, useMultiFileAuthState } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import pino from 'pino';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { createAnswerService } from './answer-service.mjs';
import { createWhatsAppConversation } from './whatsapp-flow.mjs';
import { openLocalStore } from './local-store.mjs';
import { createDelivery } from './delivery.mjs';
import { scanReviewedUpdates, deliverReviewedAlerts } from './alerts.mjs';
import { transcribeVoice } from './voice.mjs';
import { createVoiceFlow } from './voice-flow.mjs';
import { createWhatsAppIngress } from './whatsapp-ingress.mjs';
import { createWhatsAppGuard } from './whatsapp-guard.mjs';
import { parseTestAllowlist } from './tester-allowlist.mjs';
import { installSafeSignalLogging } from './safe-signal-logging.mjs';
import { startSourceUpdates } from './source-update-runner.mjs';
import { messageBatchDiagnostic, ingressStatusDiagnostic } from './whatsapp-content.mjs';
import { createWhatsAppBatchGate } from './whatsapp-batches.mjs';

installSafeSignalLogging(console);
const diagnosticsEnabled=process.env.YOJANA_DIAGNOSTICS==='1';
const diagnostic=value=>{if(diagnosticsEnabled)console.log('WhatsApp diagnostic: '+JSON.stringify(value));};

const authDir = process.env.YOJANA_AUTH_DIR ? resolve(process.env.YOJANA_AUTH_DIR) : fileURLToPath(new URL('./.baileys-auth/', import.meta.url));
const authLock = openLocalStore(join(authDir,'.owner'));
const store = openLocalStore(resolve(process.env.YOJANA_STATE_DIR || '.runtime/whatsapp'));
const answers = createAnswerService();
const conversation = createWhatsAppConversation({ answers, store, multiScheme: process.env.YOJANA_NATURAL_FLOW !== '0' && process.env.YOJANA_MULTI_SCHEME !== '0' });
const voice = createVoiceFlow({ answers, transcribe:transcribeVoice, fallback:conversation.handle, answerQuestion:conversation.answerQuestion, profileStatement:conversation.handleProfileStatement, isProfileStatement:conversation.isProfileStatement, isQuestionnaireReply:conversation.acceptsBareQuestionnaireReply, selectedLanguage:conversation.selectedLanguage, choosingLanguage:conversation.choosingLanguage, diagnostic:event=>console.log('Voice status: '+event) });
const batchGate = createWhatsAppBatchGate({expectsReply:chat=>conversation.hasPendingPrompt(chat)||voice.hasPendingPrompt(chat)});
const pendingVoice = new Map();
let currentSocket, reconnectTimer, stopped=false, attempts=0;
const send=async(chat,text)=>{
  if(!currentSocket || stopped)throw Error('WhatsApp unavailable');
  await currentSocket.sendMessage(chat,{text});
};
const deliver=createDelivery({store,handle:async (chat,text)=>{
  if(text.startsWith('__VOICE_AUDIO__:')){
    const key=text.slice('__VOICE_AUDIO__:'.length);const audio=pendingVoice.get(key);pendingVoice.delete(key);
    return audio ? (await voice.handleAudio(chat,audio,conversation.hasActiveConversation(chat)) || 'Send YOJANA START to begin.') : 'Voice message unavailable. Please try again.';
  }
  return voice.handle(chat,text);
},send:async(chat,text)=>{
  await send(chat,text);
  batchGate.markReplySent(chat);
}});
const receive=createWhatsAppIngress({conversation,voice,store,deliver,send,pendingVoice,
  guard:createWhatsAppGuard({testNumbers:parseTestAllowlist(process.env.YOJANA_TEST_ALLOWLIST)}),
  maxVoiceSeconds:process.env.YOJANA_STT_PROVIDER==='sarvam'?30:60,
  downloadAudio:message=>downloadMediaMessage(message,'buffer',{}, {logger:pino({level:'silent'}),reuploadRequest:currentSocket?.updateMediaMessage}),
  log:message=>console.log(message)});
const alertTimer=setInterval(async()=>{
  try {
    scanReviewedUpdates({store,answers});
    await deliverReviewedAlerts({store,answers,send,enabled:process.env.YOJANA_TEST_ALERTS==='1'});
  }catch{console.error('Reviewed-update check failed; no automatic approval performed.');}
},5*60*1000);
const stopSourceUpdates=startSourceUpdates({log:message=>console.log(message)});
function stop(){stopped=true;clearTimeout(reconnectTimer);clearInterval(alertTimer);stopSourceUpdates();currentSocket?.end(new Error('Operator stopped'));store.close();authLock.close();process.exitCode=0;}
process.once('SIGINT',stop);process.once('SIGTERM',stop);

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestWaWebVersion();
  const socket = makeWASocket({ auth: state, version, logger: pino({ level: 'silent' }), printQRInTerminal: false });
  currentSocket=socket;
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
    if (connection === 'open') { attempts=0; console.log('WhatsApp connected. Ask a teammate to send YOJANA START in a direct chat.'); }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log(`WhatsApp disconnected (${code ?? 'unknown'}).`);
      currentSocket=null;
      if (!stopped && code !== DisconnectReason.loggedOut) {
        const delay=Math.min(60000,1000*2**Math.min(attempts++,6));
        clearTimeout(reconnectTimer);
        reconnectTimer=setTimeout(()=>start().catch(()=>console.error('Reconnect failed; restart once the network is available.')),delay);
      } else if(code === DisconnectReason.loggedOut) {console.error('WhatsApp unlinked; operator pairing is required. See docs/WHATSAPP_FLOW.md; do not share session files.');stop();}
    }
  });
  socket.ev.on('messages.upsert', async ({ type, messages }) => {
    if(diagnosticsEnabled)diagnostic(messageBatchDiagnostic(type,messages));
    const selectedMessages=batchGate.select(type,messages);
    if(diagnosticsEnabled && type==='append')diagnostic({stage:'batch_gate',recovered:selectedMessages.length});
    // Admit each event before awaits so a batch of messages cannot bypass the
    // one-request-per-chat guard and advance several questions unexpectedly.
    await Promise.all(selectedMessages.map(message=>receive(message).then(status=>{
      diagnostic(ingressStatusDiagnostic(status));
      return status;
    }).catch(()=>{
      diagnostic(ingressStatusDiagnostic('handler_failed'));
      console.error('WhatsApp message processing failed.');
    })));
  });
}

start().catch(() => { console.error('WhatsApp startup failed. Check connection and local pairing state.');stop();process.exitCode=1; });
