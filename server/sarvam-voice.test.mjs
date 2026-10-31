import test from 'node:test';
import assert from 'node:assert/strict';
import { transcribeSarvam } from './sarvam-voice.mjs';

test('Sarvam adapter sends only audio and configured language, then normalizes Hindi response', async () => {
  let requested;
  const fetchImpl = async (url, options) => {
    requested = { url, options };
    return { ok: true, json: async () => ({ transcript: 'पीएम किसान में कितना मिलता है?', language_code: 'hi-IN', language_probability: 0.95 }) };
  };
  const result = await transcribeSarvam(Buffer.from('fictional audio'), { language: 'hi', apiKey: 'test-only-key', fetchImpl });
  assert.equal(result.language, 'hi');
  assert.equal(result.text, 'पीएम किसान में कितना मिलता है?');
  assert.equal(requested.url, 'https://api.sarvam.ai/speech-to-text');
  assert.equal(requested.options.body.get('language_code'), 'hi-IN');
  assert.equal(requested.options.body.get('model'), 'saaras:v4');
  assert.equal(requested.options.headers['api-subscription-key'], 'test-only-key');
});

test('Sarvam adapter refuses missing key, upstream failure and unsupported language', async () => {
  await assert.rejects(() => transcribeSarvam(Buffer.from('audio'), { apiKey: '' }), /key unavailable/);
  await assert.rejects(() => transcribeSarvam(Buffer.from('audio'), { apiKey: 'x', fetchImpl: async () => ({ ok: false, status: 402 }) }), /HTTP 402/);
  await assert.rejects(() => transcribeSarvam(Buffer.from('audio'), { apiKey: 'x', fetchImpl: async () => ({ ok: true, json: async () => ({ transcript: 'bonjour', language_code: 'fr-FR' }) }) }), /unsupported detected language/);
});
