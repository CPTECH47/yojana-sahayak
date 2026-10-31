"""Read one audio message from stdin and return a local transcription as JSON."""
import json
import os
import subprocess
import sys

import numpy as np
from faster_whisper import WhisperModel

stage = 'input'
try:
    data = sys.stdin.buffer.read(10 * 1024 * 1024 + 1)
    if not data or len(data) > 10 * 1024 * 1024:
        raise ValueError('Invalid audio size')
    stage = 'model'
    model = WhisperModel(os.environ.get('YOJANA_WHISPER_MODEL', 'small'), device='cpu', compute_type='int8')
    stage = 'decode'
    decoded = subprocess.run(
        [os.environ.get('YOJANA_FFMPEG', 'ffmpeg'), '-v', 'error', '-i', 'pipe:0', '-t', '61', '-f', 'f32le', '-ac', '1', '-ar', '16000', 'pipe:1'],
        input=data, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, check=True, timeout=30,
    ).stdout
    audio = np.frombuffer(decoded, dtype='<f4')
    if not audio.size or audio.size > 61 * 16000:
        raise ValueError('Invalid audio duration')
    stage = 'inference'
    segments, info = model.transcribe(audio, beam_size=3, vad_filter=True)
    text = ' '.join(segment.text.strip() for segment in segments).strip()
    print(json.dumps({'text': text, 'language': info.language, 'confidence': info.language_probability}, ensure_ascii=False))
except Exception as error:
    # Only the fixed stage is reported; never print audio or recognised words.
    print('VOICE_STAGE=' + stage + ' VOICE_TYPE=' + type(error).__name__, file=sys.stderr)
    sys.exit(1)
