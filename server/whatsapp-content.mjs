import { normalizeMessageContent, proto } from '@whiskeysockets/baileys';
import { demoCommand } from './yojana-answer.mjs';

// WhatsApp may wrap disappearing or view-once messages inside another message.
export function messageContent(message) {
  return normalizeMessageContent(message?.message) || {};
}

export function messageText(message) {
  const content=messageContent(message);
  return content.conversation ?? content.extendedTextMessage?.text ?? '';
}

// Optional transport diagnostics contain only fixed categories and counts.
// Never include keys, addresses, stub parameters, transcripts or message bodies.
export function messageBatchDiagnostic(type,messages) {
  const rows=Array.isArray(messages)?messages:[];
  const result={stage:'upsert',type:type==='notify'||type==='append'?type:'other',total:rows.length,
    own:0,direct:0,group:0,text:0,audio:0,ciphertext:0,start:0};
  for(const message of rows){
    if(message?.key?.fromMe===true)result.own++;
    const jid=message?.key?.remoteJid;
    if(typeof jid==='string'){
      if(jid.endsWith('@g.us'))result.group++;
      else if(jid.endsWith('@s.whatsapp.net')||jid.endsWith('@lid'))result.direct++;
    }
    if(message?.messageStubType===proto.WebMessageInfo.StubType.CIPHERTEXT)result.ciphertext++;
    try{
      const content=messageContent(message);
      if(content.audioMessage)result.audio++;
      const text=messageText(message);
      if(typeof text==='string'&&text.trim()){
        result.text++;
        if(demoCommand(text)?.toLowerCase()==='start')result.start++;
      }
    }catch{/* Diagnostics must not change message processing on malformed content. */}
  }
  return result;
}

const diagnosticStatuses=new Set(['ignored','duplicate','busy','service_busy','rate_limited','voice_rate_limited',
  'invalid_request','invalid_text','invalid_audio','download_failed','sent','uncertain','handler_failed']);
export function ingressStatusDiagnostic(status){
  return {stage:'ingress',status:diagnosticStatuses.has(status)?status:'other'};
}
