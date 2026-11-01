import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { transcribeSarvam } from './sarvam-voice.mjs';

const script = fileURLToPath(new URL('../scripts/transcribe_voice.py', import.meta.url));
const root = fileURLToPath(new URL('../', import.meta.url));
const localPython = join(root, '.runtime', 'voice-venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');

// Audio is piped to the local worker rather than written to the repository.
export function transcribeVoice(audio, { python = process.env.YOJANA_VOICE_PYTHON || (existsSync(localPython) ? localPython : 'python'), timeoutMs = 120000, language } = {}) {
  if (process.env.YOJANA_STT_PROVIDER === 'sarvam') return transcribeSarvam(audio, { language });
  if (!Buffer.isBuffer(audio) || !audio.length || audio.length > 10 * 1024 * 1024) return Promise.reject(new Error('Invalid audio'));
  return new Promise((resolve, reject) => {
    const env={...process.env};
    delete env.YOJANA_VOICE_LANGUAGE;
    if (['hi','en'].includes(language)) env.YOJANA_VOICE_LANGUAGE=language;
    const child = spawn(python, [script], { stdio:['pipe','pipe','pipe'], windowsHide:true, env });
    let output = '', diagnostics = '', settled = false;
    const timer = setTimeout(() => { child.kill(); finish(new Error('Voice transcription timed out')); }, timeoutMs);
    function finish(error, value) { if (settled) return; settled=true; clearTimeout(timer); error ? reject(error) : resolve(value); }
    child.stdout.on('data', chunk => { output += chunk.toString('utf8'); if (output.length > 8192) { child.kill(); finish(new Error('Invalid transcription')); } });
    child.stderr.on('data', chunk => { if(diagnostics.length<8192) diagnostics += chunk.toString('utf8').slice(0,8192); });
    child.on('error', error => finish(error));
    child.on('close', code => {
      if (code !== 0) {
        const stage = /VOICE_STAGE=(input|model|decode|inference)/.exec(diagnostics)?.[1];
        const kind = /VOICE_TYPE=(RuntimeError|ValueError|TypeError|OSError|AttributeError|ModuleNotFoundError|ImportError|IndexError)/.exec(diagnostics)?.[1];
        if (stage && kind) console.log(`Voice status: worker ${stage} exception ${kind}`);
        return finish(new Error(stage ? `voice worker ${stage} failed` : 'Voice transcription unavailable'));
      }
      try {
        const result=JSON.parse(output);
        if (typeof result.text !== 'string' || !result.text.trim() || result.text.length > 1000) return finish(new Error('empty or invalid transcript'));
        if (!['hi','en'].includes(result.language)) return finish(new Error('unsupported detected language'));
        if (!Number.isFinite(result.confidence)) return finish(new Error('invalid worker response'));
        finish(null, { text:result.text.trim(), language:result.language, languageUncertain:result.confidence < 0.7 });
      } catch { finish(new Error('invalid worker response')); }
    });
    child.stdin.on('error', () => {});
    child.stdin.end(audio);
  });
}
