# Server integration handoff

## Website and experimental voice

- Added a bilingual, mobile-friendly scheme directory at `/` and a WhatsApp link using the owner's expressly approved personal number. The link opens a prepared message; the user sends it manually. Existing practice React entrypoint remains in `client/main.jsx`.
- Added public, rate-limited `GET /api/catalog`. It exposes names and pinned bilingual facts only for passages returned by the approved, unexpired source filter; it is the only API exempted from a configured API token. Frontend uses exact source titles, locators and links. The bot and website link to the official CSC locator; no verified nearest-centre lookup was found. See `docs/MAP_RESEARCH.md`.
- `YOJANA VOICE` starts an opt-in voice question. A local faster-whisper worker detects Hindi/English and asks the user to confirm the transcript; only then is it passed to the existing evidence-bound answer service. Audio responses and other languages remain unimplemented. The package and `small` model were installed locally. A synthetic English OGG test completed in about 3.9 seconds but misheard PM-KISAN as "PMK son", demonstrating why confirmation matters. Real Hindi/English voice accuracy, latency and live WhatsApp delivery still require verification. Incoming audio is not automatically accepted on the owner's personal number.
- Added an explicit insufficient-evidence response for PAN-specific questions until scheme-specific evidence is reviewed. This guard does not prove every other answer is correct.
- Pulkit's `data/supabase` branch at `b92c63d` has quarantined PMMVY and PM-JAY research with unresolved source conflicts; these have not been added to the public catalogue or eligibility rules.
- Files: `client/scheme-site.jsx`, `client/scheme-site.css`, `index.html`, `server/index.js`, `server/catalog.test.mjs`, `server/voice*.mjs`, `server/whatsapp-prototype.mjs`, `server/answer-service.mjs`, `server/hardening.test.mjs`, `scripts/transcribe_voice.py`, `requirements-voice.txt`, `README.md`, `docs/WHATSAPP_FLOW.md`, `docs/MAP_RESEARCH.md`.
- `npm.cmd test`: 41 passed; `npm.cmd run build`: passed. Hallmark render sweep: zero FAIL, one explicitly waived poster-spacing reflex; actual phone and speech model tests remain pending.

## Integration of Tejas's PR #7

- Integrated the hardening branch with the newer captain changes: retained bullet results, missing-question guidance, PMUY document link, and the 401 re-link instructions while adopting evidence locks, pinned answers, consent controls and message delivery safeguards from PR #7.
- Updated the API contract and operation notes in `PROJECT_BRIEF.md` and `docs/HARDENING.md`. The chat response adds `mode` and `fact_ids`; recommendations can return `insufficient_evidence` without results when required evidence is unavailable. `/api/ready` reports separate model and corpus readiness.
- Verified: 37 JavaScript tests, 4 isolated Python importer tests, production build and release gate on 31 October 2026 passed. The gate showed 10 usable documents. Two NMMSS records expire before 1 November and must be reviewed before claiming the minimum count afterwards.
- A real paired-phone retest, actual model performance and a teammate check of the integrated journey remain outstanding. PR #7 must not be treated as live deployment proof.

## Latest update: skipped answers and WhatsApp 401

- Recommendation results now list skipped questions separately from failed checks and tell users how to restart with corrected answers. No alternative scheme or guaranteed path to eligibility is claimed.
- The WhatsApp process explains the logged-out 401 and points to the re-linking instructions in `docs/WHATSAPP_FLOW.md`. Tejas reported the 401; a re-pair and live phone retest remain outstanding. Session files have not been changed.
- Changed `server/whatsapp-flow.mjs`, `server/whatsapp-flow.test.mjs`, `server/whatsapp-prototype.mjs`, and `docs/WHATSAPP_FLOW.md`. API fields remain unchanged.
- `npm.cmd test`: 22 passed; `npm.cmd run build` and `git diff --check`: passed. No live WhatsApp or model test was performed for this update.

## Latest update: result guidance

- WhatsApp recommendation results use bullets, explain the reported failed checks, offer a fresh check if an answer was incorrect, and direct users to official sources for full rules and documents. PMUY links to its official document list; other document lists remain to be reviewed. The bot does not promise that a person can become eligible by changing their circumstances.
- The PM-KISAN profession question names the listed professions and requires registration and current practice. API consumers must use that meaning for `practising_registered_professional`.
- Changed `server/whatsapp-flow.mjs`, `server/answer-service.mjs`, the WhatsApp flow tests, `PROJECT_BRIEF.md`, and `docs/TEAM_CHECKINS.md`. Pulkit and Tejas have concrete source-review and WhatsApp QA tasks in that team note.
- `npm.cmd test`: 21 passed; `npm.cmd run build`: passed; `git diff --check`: passed. Paired-phone delivery and the official locator interaction need live verification.

## Change summary

- `YOJANA START` now returns a clearer bilingual welcome and language selector: “For Hindi, press 1” and “For English, press 2.”
- Once language is selected, users can reply with just a role number, YES/NO, BACK, SKIP, or CANCEL while the questionnaire is active. The prefix remains required to start and for standalone scheme questions.
- Invalid answers repeat the same question in the selected language. Farmers, families, and workers receive short questionnaires for selected PM-KISAN, PMUY, and PM-SYM rules. Student and artisan paths provide official information without claiming eligibility.
- Answers stay in per-chat process memory and are cleared after completion or restart. The bot does not ask for Aadhaar or bank details.

## Files changed

- `server/whatsapp-flow.mjs`, `server/whatsapp-flow.test.mjs`
- `server/whatsapp-prototype.mjs`, `server/yojana-answer.mjs`, `server/yojana-answer.test.mjs`
- `server/answer-service.mjs`, `server/answer-service.test.mjs`
- `README.md`, `PROJECT_BRIEF.md`, `docs/WHATSAPP_FLOW.md`
- `server/corpus.mjs`, `server/corpus.test.mjs`
- `corpus/manifest.json`, `corpus/passages.json`
- `README.md`, `PROJECT_BRIEF.md`, `docs/SOURCE_GOVERNANCE.md`, `docs/WHATSAPP_FLOW.md`, `.gitignore`

## Commands and results

- `npm.cmd test` — 20/20 passed.
- `npm.cmd run build` — passed.
- `git diff --check` — passed.

## Unfinished and unverified

- The updated welcome and multi-turn questionnaire have not yet been retested on the paired WhatsApp phone.
- Live Qwen answers, message delivery, and opening cited links from WhatsApp remain unverified.
- Language choice is session-only and is not persisted to Supabase.
- Checks cover selected conditions only; they are preliminary and are not government eligibility decisions.

## API and handoff fields

- WhatsApp integration calls `answers.chat({ question, language })`, where language is `hi` or `en`.
- Answer citations retain `title`, `locator`, and `url`; no `/api/chat` or `/api/recommend` response fields changed in this update.

## 31 October: voice and website audit follow-up

- Voice: accept notes within an active bot conversation without a VOICE command; transcription still requires confirmation. A real phone note reached confirmation, but Whisper small misheard PM-KISAN as “PMG sound”; do not present voice accuracy as solved. The larger turbo model is downloading and has not been benchmarked or enabled. Phone processing time was not measured.
- Privacy: suppress known libsignal diagnostics that can expose session material. A previous diagnostic printed session material in tool output; relink the device after testing. Never commit linked-device state or recordings.
- Website: quarantine the two disputed scholarship deadline records until data review; refresh catalogue every minute and on return/online, fail closed on refresh errors, offer retry and official links, remember language, improve Hindi labels, clarify the WhatsApp handoff, centralize the configured WhatsApp redirect, and return 404 for missing assets. PDF page fragments are used only where the locator explicitly identifies a PDF page.
- Files: `client/scheme-site.jsx`, `index.html`, `scripts/transcribe_voice.py`, `server/index.js`, `server/verified-facts.mjs`, `server/catalog.test.mjs`, `server/voice*.mjs`, `server/whatsapp*.mjs`, `server/safe-signal-logging*.mjs`.
- Checks: `npm.cmd test` 45/45 passed; `npm.cmd run build` passed; `git diff --check` passed. The phone test reached a transcription confirmation, but the recognized scheme was incorrect. Do not claim the full voice-to-cited-answer flow has passed on a phone.
- Remaining: Pulkit must review the current NSP deadline and PMUY Hindi application guidance; Tejas must verify mobile presentation, browser failure/refresh cases, source links, WhatsApp, and accessibility. Automatic freshness behavior has not been manually tested by withdrawing a source in a real browser. Turbo, GPU execution, Hindi/English accuracy and latency are unverified. No public deployment was tested.
- API: `GET /api/catalog` includes `generated_at`, `refresh_after_ms`, `schemes`, `records` and `Cache-Control: no-store`; chat/recommend contracts unchanged. `/start-whatsapp` redirects to `YOJANA_WHATSAPP_NUMBER` (digits with country code) or the explicitly approved demo number.

## Voice menu choices — 31 October

- `server/voice-flow.mjs` now maps confirmed spoken Hindi and English numbers one through six to the active questionnaire; typed replies and direct voice-question confirmation remain unchanged. Short spoken yes/no still follows the same confirmation step. Transcription is still local Whisper small and accuracy is not guaranteed.
- `node --test server/voice-flow.test.mjs`: 5/5 passed, including mocked transcripts passing into the real language and role conversation. `npm.cmd test`: 46/46 passed before the final additional integration test; `npm.cmd run build` passed; `git diff --check` passed.
- Unfinished: real WhatsApp phone test for recognized number choices, Hindi/English recognition accuracy and latency. An unclear recording must be cancelled and retried or typed. No API fields changed.

## Voice language hint experiment — 31 October

- `scripts/transcribe_voice.py`, `server/voice.mjs`, `server/voice-flow.mjs`, `server/whatsapp-flow.mjs`, `server/whatsapp-prototype.mjs`: use the explicitly selected Hindi or English as a local transcription hint while a role/questionnaire choice is active. Free questions continue automatic detection. Confirmation remains required. A user must first type the language to avoid guessing it from an isolated word.
- Local synthetic English speech: small 4.1 s and turbo 12.7 s, both returned `1` (single sample, CPU including model load; no general accuracy claim). Larger turbo model loaded locally but actual Hindi single-word auto-detection returned unsupported language. Hindi hints and live questionnaire accuracy remain unverified.
- `npm.cmd test`: 48/48 passed; `npm.cmd run build` and `git diff --check` passed. Model selection is an environment override `YOJANA_WHISPER_MODEL=turbo`, not a changed default; no API fields changed. The source-corpus assignment remains incomplete in draft PR #5.

## CSC Maps search — 31 October

- `server/whatsapp-flow.mjs` adds `YOJANA CSC`, then accepts a six-digit PIN or town in the active direct chat, validates and encodes it into a Google Maps search link, and provides the official CSC locator with a notice that map listings are unverified. The input is not added to the saved profile; the pending prompt expires after five minutes. `server/whatsapp-flow.test.mjs` checks invalid PINs, Unicode town encoding, cancellation and preservation of the existing questionnaire.
- `npm.cmd test`: 50/50 passed. `npm.cmd run build`: passed. `git diff --check`: passed. Phone and actual Maps result quality remain unverified. No API fields changed.
