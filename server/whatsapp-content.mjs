import { normalizeMessageContent } from '@whiskeysockets/baileys';

// WhatsApp may wrap disappearing or view-once messages inside another message.
export function messageContent(message) {
  return normalizeMessageContent(message?.message) || {};
}

export function messageText(message) {
  const content=messageContent(message);
  return content.conversation ?? content.extendedTextMessage?.text ?? '';
}
