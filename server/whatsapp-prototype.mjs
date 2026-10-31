import 'dotenv/config';
import makeWASocket, { DisconnectReason, downloadMediaMessage, fetchLatestWaWebVersion, useMultiFileAuthState } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import pino from 'pino';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { demoCommand } from './yojana-answer.mjs';
import { createAnswerService } from './answer-service.mjs';
import { createWhatsAppConversation } from './whatsapp-flow.mjs';
import { openLocalStore } from './local-store.mjs';
import { createDelivery } from './delivery.mjs';
import { scanReviewedUpdates, deliverReviewedAlerts } from './alerts.mjs';
import { transcribeVoice } from './voice.mjs';
import { createVoiceFlow } from './voice-flow.mjs';
import { messageContent, messageText } from './whatsapp-content.mjs';
import { installSafeSignalLogging } from './safe-signal-logging.mjs';
import { startSourceUpdates } from './source-update-runner.mjs';

installSafeSignalLogging(console);

const authDir = process.env.YOJANA_AUTH_DIR ? resolve(process.env.YOJANA_AUTH_DIR) : fileURLToPath(new URL('./.baileys-auth/', import.meta.url));
const authLock = openLocalStore(join(authDir,'.owner'));
const store = openLocalStore(resolve(process.env.YOJANA_STATE_DIR || '.runtime/whatsapp'));
const answers = createAnswerService();
const conversation = createWhatsAppConversation({ answers, store });
const voice = createVoiceFlow({ answers, transcribe:transcribeVoice, fallback:conversation.handle, answerQuestion:conversation.answerQuestion, profileStatement:conversation.handleProfileStatement, isProfileStatement:conversation.isProfileStatement, isQuestionnaireReply:conversation.acceptsBareQuestionnaireReply, selectedLanguage:conversation.selectedLanguage, choosingLanguage:conversation.choosingLanguage, diagnostic:event=>console.log('Voice status: '+event) });
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
},send});
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
    if (type !== 'notify') return;
    for (const message of messages) {
      const jid = message.key.remoteJid;
      const id = message.key.id;
      if (message.key.fromMe || !jid || jid.endsWith('@g.us') || !id) continue;
      const rawText = messageText(message);
      const command = demoCommand(rawText);
      if(command?.trim().toLowerCase()==='voice') console.log('Voice status: request received');
      const content=messageContent(message);
      const audio=content?.audioMessage;
      if(audio) console.log('Voice status: audio received');
      let text;
      if(audio && (voice.acceptsAudio(jid) || conversation.hasActiveConversation(jid))){
        const length=Number(audio.fileLength), seconds=Number(audio.seconds);
          const maxSeconds=process.env.YOJANA_STT_PROVIDER==='sarvam'?30:60;
          if(!Number.isFinite(length) || length<1 || length>10*1024*1024 || !Number.isFinite(seconds) || seconds>maxSeconds){
            await socket.sendMessage(jid,{text:`Please send a voice question shorter than ${maxSeconds} seconds.`}); continue;
        }
        try {
          const bytes=await downloadMediaMessage(message,'buffer',{}, {logger:pino({level:'silent'}),reuploadRequest:socket.updateMediaMessage});
          if(!Buffer.isBuffer(bytes) || bytes.length>10*1024*1024)throw Error();
          console.log('Voice status: audio downloaded');
          const key=store.id(jid+':'+id);pendingVoice.set(key,bytes);text='__VOICE_AUDIO__:'+key;
        } catch {console.log('Voice status: audio download failed');await socket.sendMessage(jid,{text:'Voice download failed. Please try again or send a text question.'});continue;}
      } else {
        if (command === null && !conversation.acceptsBareQuestionnaireReply(jid, rawText) && !voice.acceptsPendingChoice(jid, rawText)) continue;
        text = command ?? rawText.trim();
      }
      if(text.length>1000)continue;
      try {
        const status=await deliver(jid,id,text);
        if(text.startsWith('__VOICE_AUDIO__:'))pendingVoice.delete(text.slice('__VOICE_AUDIO__:'.length));
        console.log('WhatsApp message processing: '+status);
      } catch (error) {
        console.error('WhatsApp message processing failed.');
      } finally {
        if(text.startsWith('__VOICE_AUDIO__:'))pendingVoice.delete(text.slice('__VOICE_AUDIO__:'.length));
      }
    }
  });
}

start().catch(() => { console.error('WhatsApp startup failed. Check connection and local pairing state.');stop();process.exitCode=1; });
