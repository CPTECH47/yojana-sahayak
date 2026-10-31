import { messageContent, messageText } from './whatsapp-content.mjs';
import { demoCommand } from './yojana-answer.mjs';
import { createWhatsAppGuard } from './whatsapp-guard.mjs';

function rejectionText(decision,language){
  const seconds=decision.retryAfterSeconds;
  const hi=decision.reason==='busy'
    ? 'आपका पिछला संदेश अभी संसाधित हो रहा है। जवाब आने तक रुकें, फिर अगला संदेश भेजें।'
    : decision.reason==='voice_rate_limited'
      ? `अभी बहुत से आवाज़ वाले संदेश आए हैं। ${seconds} सेकंड बाद रिकॉर्ड करें, या जवाब लिखकर भेजें।`
      : decision.reason==='service_busy'
        ? 'बॉट अभी व्यस्त है। थोड़ी देर बाद अपना संदेश फिर भेजें।'
        : `बहुत तेजी से संदेश आए हैं। ${seconds} सेकंड बाद अगला संदेश भेजें। आपकी जाँच सुरक्षित है।`;
  const en=decision.reason==='busy'
    ? 'I am processing your previous message. Wait for its reply, then send your next message.'
    : decision.reason==='voice_rate_limited'
      ? `Too many voice notes just now. Record again in ${seconds} seconds, or type your answer.`
      : decision.reason==='service_busy'
        ? 'The bot is busy. Please resend your message shortly.'
        : `Messages arrived too quickly. Send your next message in ${seconds} seconds. Your check is still here.`;
  return language==='hi'?hi:language==='en'?en:en+'\n'+hi;
}

// Admission is synchronous and precedes all media downloads and backend calls.
// Rejected messages are never placed in the state machine's delivery queue.
export function createWhatsAppIngress({conversation,voice,store,deliver,downloadAudio,send,guard=createWhatsAppGuard(),maxVoiceSeconds=30,pendingVoice=new Map(),log=()=>{}}){
  return async function receive(message){
    const jid=message.key?.remoteJid,id=message.key?.id;
    if(message.key?.fromMe||!jid||jid.endsWith('@g.us')||!id)return 'ignored';
    const rawText=messageText(message),command=demoCommand(rawText);
    const audio=messageContent(message)?.audioMessage;
    const acceptsAudio=Boolean(audio&&(voice.acceptsAudio(jid)||conversation.hasActiveConversation(jid)));
    if(!acceptsAudio && command===null && !conversation.acceptsBareQuestionnaireReply(jid,rawText) && !voice.acceptsPendingChoice(jid,rawText))return 'ignored';
    // Retained delivery records survive process restarts; check before download.
    if(store.get('messages',store.id(jid+':'+id)))return 'duplicate';
    const decision=guard.acquire(jid,id,{voice:acceptsAudio,senderJid:message.key?.senderPn});
    if(!decision.allowed){
      if(decision.notice){try{await send(jid,rejectionText(decision,conversation.selectedLanguage(jid)));}catch{/* No backend retry. */}}
      return decision.reason;
    }
    let voiceKey;
    try {
      let text;
      if(acceptsAudio){
        const length=Number(audio.fileLength),seconds=Number(audio.seconds);
        if(!Number.isFinite(length)||length<1||length>10*1024*1024||!Number.isFinite(seconds)||seconds<0||seconds>maxVoiceSeconds){
          await send(jid,`Please send a voice note shorter than ${maxVoiceSeconds} seconds. / छोटा आवाज़ वाला संदेश भेजें।`);
          return 'invalid_audio';
        }
        let bytes;
        try {bytes=await downloadAudio(message);}catch{
          await send(jid,'Voice download failed. Please try again or type your question. / आवाज़ डाउनलोड नहीं हुई। दोबारा भेजें या सवाल लिखें।');
          return 'download_failed';
        }
        if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>10*1024*1024){
          await send(jid,'The recording could not be read. Please record again or type your question. / रिकॉर्डिंग नहीं पढ़ी गई। दोबारा रिकॉर्ड करें या सवाल लिखें।');
          return 'invalid_audio';
        }
        log('Voice status: audio downloaded');
        voiceKey=store.id(jid+':'+id);pendingVoice.set(voiceKey,bytes);text='__VOICE_AUDIO__:'+voiceKey;
      }else text=command??rawText.trim();
      if(!text.trim()||text.length>1000)return 'invalid_text';
      const status=await deliver(jid,id,text);
      log('WhatsApp message processing: '+status);
      return status;
    }finally{
      if(voiceKey)pendingVoice.delete(voiceKey);
      decision.release();
    }
  };
}
