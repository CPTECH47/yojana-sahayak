// The owner explicitly selected this public demo contact for restart links.
export const restartUrl = 'https://api.whatsapp.com/send/?phone=918273104167&text=YOJANA+START&type=phone_number&app_absent=0';

export function withRestartLink(text) {
  if (typeof text !== 'string' || !/\bYOJANA START\b/u.test(text) || text.includes(restartUrl)) return text;
  // WhatsApp text has no Markdown anchor labels. Keep the command and expose
  // the real URL; click-to-chat prefills a draft and never sends it for the user.
  return `${text}\n\nफिर शुरू करें / Restart: ${restartUrl}\nलिंक खोलें, फिर भेजें दबाएँ। / Open the link, then tap Send.`;
}
