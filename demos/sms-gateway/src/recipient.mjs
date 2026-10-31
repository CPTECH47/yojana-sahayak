// India is the default only for an unprefixed national mobile number.
// Explicit international numbers retain their country code; extensions/placeholders are rejected.
export function normalizeRecipient(input) {
  const text = String(input ?? '').trim();
  if (!text || !/^[+\d\s()-]+$/.test(text)) return null;
  let number = text.replace(/[\s()-]/g, '');
  if (/^[6-9]\d{9}$/.test(number)) number = '+91' + number;
  else if (/^0[6-9]\d{9}$/.test(number)) number = '+91' + number.slice(1);
  else if (/^91[6-9]\d{9}$/.test(number)) number = '+' + number;
  if (number.startsWith('+91')) return /^\+91[6-9]\d{9}$/.test(number) ? number : null;
  return /^\+[1-9]\d{7,14}$/.test(number) ? number : null;
}
