// Optional speech recognition for consenting demo users. Audio is sent to Sarvam only
// when YOJANA_STT_PROVIDER=sarvam is explicitly configured on the server.
export async function transcribeSarvam(audio, { language, apiKey = process.env.SARVAM_API_KEY, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error('Sarvam API key unavailable');
  if (!Buffer.isBuffer(audio) || !audio.length || audio.length > 10 * 1024 * 1024) throw new Error('Invalid audio');

  const form = new FormData();
  form.append('file', new Blob([audio], { type: 'audio/ogg' }), 'voice.ogg');
  form.append('model', 'saaras:v4');
  form.append('mode', 'transcribe');
  form.append('language_code', language === 'hi' ? 'hi-IN' : language === 'en' ? 'en-IN' : 'unknown');
  form.append('keyterms', JSON.stringify(['PM-KISAN', 'PMUY', 'PM-SYM', 'PMMVY', 'PM-JAY']));

  let response;
  try {
    response = await fetchImpl('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: { 'api-subscription-key': apiKey },
      body: form,
      signal: AbortSignal.timeout(45000),
    });
  } catch {
    throw new Error('Sarvam transcription unavailable');
  }
  // Never include upstream response bodies: they may contain user speech or account details.
  if (!response.ok) throw new Error(`Sarvam transcription HTTP ${response.status}`);
  let result;
  try { result = await response.json(); } catch { throw new Error('Invalid Sarvam response'); }
  const detected = result.language_code?.split('-')[0];
  if (typeof result.transcript !== 'string' || !result.transcript.trim() || result.transcript.length > 1000) throw new Error('empty or invalid transcript');
  if (!['hi', 'en'].includes(detected)) throw new Error('unsupported detected language');
  return {
    text: result.transcript.trim(),
    language: detected,
    languageUncertain: typeof result.language_probability === 'number' && result.language_probability < 0.7,
  };
}
