// Test phone numbers belong in the ignored server environment, not source code.
export function parseTestAllowlist(value=''){
  const numbers=String(value).split(',').map(number=>number.trim()).filter(Boolean);
  if(numbers.some(number=>!/^\+?[1-9]\d{7,14}$/u.test(number)))throw new Error('YOJANA_TEST_ALLOWLIST must contain comma-separated international phone numbers');
  return new Set(numbers.map(number=>number.replace(/^\+/u,'')));
}

function phoneFromJid(jid){
  return typeof jid==='string'?/^([1-9]\d{7,14})(?:_\d+)?(?::\d+)?@(?:s\.whatsapp\.net|c\.us)$/u.exec(jid)?.[1]||null:null;
}

export function isAllowlistedTestUser(numbers,chat,senderJid){
  // On LID-addressed direct messages, senderPn is transport metadata supplied
  // by Baileys. Never infer identity from message text, names or profile fields.
  const phone=phoneFromJid(chat) || (typeof chat==='string' && chat.endsWith('@lid')?phoneFromJid(senderJid):null);
  return phone!==null && numbers.has(phone);
}
