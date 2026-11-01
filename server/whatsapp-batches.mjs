import { proto } from '@whiskeysockets/baileys';
import { messageContent, messageText } from './whatsapp-content.mjs';

const promptRetentionMs=24*60*60*1000;

function timestampMilliseconds(value){
  let seconds=value;
  try{
    if(value&&typeof value==='object'&&typeof value.toNumber==='function')seconds=value.toNumber();
  }catch{return null;}
  if(typeof seconds!=='number'||!Number.isSafeInteger(seconds)||seconds<=0
    ||seconds>Math.floor(Number.MAX_SAFE_INTEGER/1000))return null;
  return seconds*1000;
}

// Baileys may label a mixed batch with its first message's append type.
// Recover only fresh answers to prompts sent by this process, never history.
export function createWhatsAppBatchGate({now=Date.now,expectsReply,maximumAgeMs=60000,maximumChats=2000}={}){
  if(typeof now!=='function'||typeof expectsReply!=='function')throw new TypeError('Batch gate requires clock and pending-reply callback');
  if(!Number.isFinite(maximumAgeMs)||maximumAgeMs<=0||!Number.isSafeInteger(maximumChats)||maximumChats<=0)
    throw new TypeError('Batch gate limits must be positive');
  const prompts=new Map();
  function prune(at){
    for(const [chat,sentAt] of prompts)if(at-sentAt>=promptRetentionMs)prompts.delete(chat);
  }
  function clock(){
    try{
      const at=now();
      return typeof at==='number'&&Number.isSafeInteger(at)&&at>=0?at:null;
    }catch{return null;}
  }
  function markReplySent(chat){
    const at=clock();
    if(typeof chat!=='string'||!chat||at===null)return false;
    prune(at);
    // Refresh insertion order so capacity evicts the oldest successful prompt.
    prompts.delete(chat);
    if(prompts.size>=maximumChats)prompts.delete(prompts.keys().next().value);
    prompts.set(chat,at);
    return true;
  }
  function select(type,messages){
    if(!Array.isArray(messages))return [];
    const at=clock();
    if(at!==null)prune(at);
    if(type==='notify')return messages;
    if(type!=='append'||at===null)return [];
    return messages.filter(message=>{
      try{
        const key=message?.key,chat=key?.remoteJid;
        if(key?.fromMe||typeof key?.id!=='string'||!key.id.trim()
          ||typeof chat!=='string'||!/^[^@\s]+@(s\.whatsapp\.net|lid)$/u.test(chat)
          ||message.messageStubType===proto.WebMessageInfo.StubType.CIPHERTEXT)return false;
        const sentAt=prompts.get(chat),timestamp=timestampMilliseconds(message.messageTimestamp);
        if(sentAt===undefined||timestamp===null||timestamp<Math.floor(sentAt/1000)*1000
          ||timestamp>at+2000||at-timestamp>maximumAgeMs)return false;
        const content=messageContent(message),text=messageText(message);
        const readableText=typeof text==='string'&&Boolean(text.trim());
        const readableAudio=Boolean(content.audioMessage&&typeof content.audioMessage==='object');
        return (readableText||readableAudio)&&expectsReply(chat,message)===true;
      }catch{return false;}
    });
  }
  return {markReplySent,select};
}
