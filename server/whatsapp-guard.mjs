// Admission runs before media download, transcription or conversation/model work.
// It deduplicates WhatsApp event IDs, never a person's answer text.
import { isAllowlistedTestUser } from './tester-allowlist.mjs';
export function createWhatsAppGuard({
  now=Date.now,maximumChats=2000,maximumActive=4,textCapacity=8,textPerMinute=30,
  voiceCapacity=2,voicePerMinute=6,idRetentionMs=10*60*1000,maximumIds=128,
  idleMs=10*60*1000,noticeCooldownMs=15000,
  testNumbers=new Set(),
}={}){
  for(const value of [maximumChats,maximumActive,textCapacity,textPerMinute,voiceCapacity,voicePerMinute,idRetentionMs,maximumIds,idleMs,noticeCooldownMs]){
    if(!Number.isFinite(value)||value<=0)throw new TypeError('Guard limits must be positive finite numbers');
  }
  const chats=new Map();
  const allowedNumbers=new Set(testNumbers);
  let active=0;
  const noRelease=()=>{};
  const bucket=(capacity,at)=>({tokens:capacity,at});
  const refill=(value,capacity,rate,at)=>{
    value.tokens=Math.min(capacity,value.tokens+Math.max(0,at-value.at)*rate/60000);
    value.at=Math.max(value.at,at);
  };
  function denied(state,reason,retryAfterSeconds,at){
    const notice=Boolean(state && at-state.lastNotice>=noticeCooldownMs);
    if(notice)state.lastNotice=at;
    return {allowed:false,reason,retryAfterSeconds,notice,release:noRelease};
  }
  function prune(at){
    for(const [chat,state] of chats){
      if(!state.busy && at-state.lastSeen>=idleMs){chats.delete(chat);continue;}
      for(const [id,seenAt] of state.ids)if(at-seenAt>=idRetentionMs)state.ids.delete(id);
    }
  }
  function acquire(chat,id,{voice=false,senderJid}={}){
    const at=now();
    prune(at);
    if(typeof chat!=='string'||!chat||typeof id!=='string'||!id)return denied(null,'invalid_request',0,at);
    let state=chats.get(chat);
    if(!state){
      if(chats.size>=maximumChats)return denied(null,'service_busy',5,at);
      state={busy:false,lastSeen:at,lastNotice:-Infinity,ids:new Map(),text:bucket(textCapacity,at),voice:bucket(voiceCapacity,at)};
      chats.set(chat,state);
    }
    state.lastSeen=at;
    if(state.ids.has(id))return {allowed:false,reason:'duplicate',retryAfterSeconds:0,notice:false,release:noRelease};
    // Remember even a rejected event so reconnect replay cannot repeat notices.
    if(state.ids.size>=maximumIds)state.ids.delete(state.ids.keys().next().value);
    state.ids.set(id,at);
    if(state.busy)return denied(state,'busy',1,at);
    if(active>=maximumActive)return denied(state,'service_busy',5,at);
    if(!isAllowlistedTestUser(allowedNumbers,chat,senderJid)){
      refill(state.text,textCapacity,textPerMinute,at);
      refill(state.voice,voiceCapacity,voicePerMinute,at);
      if(state.text.tokens<1)return denied(state,'rate_limited',Math.ceil((1-state.text.tokens)*60/textPerMinute),at);
      if(voice && state.voice.tokens<1)return denied(state,'voice_rate_limited',Math.ceil((1-state.voice.tokens)*60/voicePerMinute),at);
      state.text.tokens-=1;
      if(voice)state.voice.tokens-=1;
    }
    state.busy=true;
    active++;
    let released=false;
    return {allowed:true,reason:'allowed',retryAfterSeconds:0,notice:false,release(){
      if(released)return;
      released=true;state.busy=false;state.lastSeen=now();active--;
    }};
  }
  return {acquire,stats:()=>({chats:chats.size,active,ids:[...chats.values()].reduce((count,state)=>count+state.ids.size,0)})};
}
