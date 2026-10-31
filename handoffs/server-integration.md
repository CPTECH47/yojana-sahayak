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

## Automatic CSC prompt after result — 31 October

- `server/whatsapp-flow.mjs` now asks for a PIN or town in each available final recommendation and when reopening a saved result. A five-minute pending prompt accepts the next direct reply; SKIP/CANCEL ends it, and START or other supported controls continue normally. The Maps search remains an unverified listing search and does not store the entered location in the profile.
- `server/whatsapp-flow.test.mjs` verifies the complete PMUY fictional flow, bare PIN response, generated map link and SKIP. `npm.cmd test`: 51/51 passed; `npm.cmd run build` and `git diff --check` passed. Real paired-phone test of this new sequence remains pending. No API contract changed.

## Voice language menu clarification — 31 October

- `server/voice-flow.mjs`, `server/whatsapp-flow.mjs` and `server/whatsapp-prototype.mjs`: at the language menu, recognized option 1 explicitly confirms Hindi and option 2 English, independently of the language detected in speech. If automatic detection is unsupported, empty, or does not recognize 1/2, retry that short menu recording with Hindi; if still unclear ask for a typed choice. Transcript and chosen option still require explicit confirmation; a changed menu invalidates the pending selection. This is a recognition experiment, not a claim of Hindi accuracy.
- `server/voice-flow.test.mjs`: exercises 1->Hindi, 2->English, retry, refusal and confirmation using synthetic mocked transcripts. `npm.cmd test`: 54/54 passed; `npm.cmd run build` passed; `git diff --check` passed. Real Hindi and English voice notes remain unverified after this change; retry can take extra time. No API fields changed.
- GitHub review: data branch `198a32f` continues a draft audit with unresolved corpus/reproducibility and rules; Tejas's separate `demo/local-sms` PR #9 at `c798204` has 8/8 simulator tests passed independently here, but no physical SMS test or Baileys integration. PR #7 remains open; no PR was merged.
- Live phone follow-up: the initial Hindi note triggered the Hindi retry, but the retry failed at the speech inference stage. Hindi voice selection is not verified; a typed 1/2 fallback was added. A synthetic English WAV forced to Hindi did execute locally, so the phone-specific inference failure is not yet explained.

## Optional Sarvam STT alternative — 31 October

- Added `server/sarvam-voice.mjs` and provider routing through `server/voice.mjs`. `YOJANA_STT_PROVIDER=sarvam` plus a private `SARVAM_API_KEY` selects Saaras v4; unset/default remains local. The existing Baileys text path and `/api/chat`/`/api/recommend` contracts are unchanged. Selected language is sent as `hi-IN` or `en-IN`; otherwise Sarvam detects it. The bot still confirms the transcript before questionnaire changes. Sarvam voice notes are limited to 30 seconds and the prompt discloses remote processing.
- `server/sarvam-voice.test.mjs` verifies request shape, response mapping and failures with a mocked API. Real Sarvam credentials, billing balance, phone transcription and latency have not been tested. The local real-phone failure remains unresolved; a synthetic WAV succeeded, so it is not yet proven to be solely a model accuracy issue. User needs a Sarvam account/key to test the alternative. No secrets were committed.

### Live Sarvam setup follow-up

- Charchit created a Sarvam account and configured its API key in the ignored local `.env`; no credential was committed or printed by the test command. The existing JavaScript `fetch` adapter is used, so no Sarvam SDK was installed.
- A single synthetic OGG clip passed through the real Saaras v4 API: response language `en`, transcript `One.`, wall time about 0.8 s. This validates the request shape and account access, not Hindi accuracy.
- The restarted Baileys process connected. During the paired-phone test it reported: audio received, audio downloaded, transcription started, transcription ready for confirmation, reply sent. The exact Hindi transcript and user confirmation are pending user feedback; do not claim recognition accuracy yet. No API contract changed.

### Paired-phone Hindi result and follow-up UX

- Charchit reported that he spoke “पीएम किसान योजना में सालाना कितने रुपये मिलते हैं?” and the Sarvam-backed bot displayed exactly that Hindi transcript before confirmation. This verifies one real Hindi phone note, not overall model accuracy or a completed cited answer. The Sarvam usage dashboard showed ₹0.07 total organisation spend after the synthetic clip and phone note combined; it did not separate their individual charges.
- `server/voice-flow.mjs` now lets a pending transcript be confirmed with bare `1`, discarded with bare `2`, or corrected with `YOJANA EDIT <correct sentence>` before confirmation. Edited Devanagari text is routed as Hindi unless a questionnaire language is already selected. `server/whatsapp-prototype.mjs` accepts bare `1`/`2` at this pending confirmation stage even outside a questionnaire. Existing `YOJANA CONFIRM` and `YOJANA CANCEL` remain valid. A fresh phone test of these new controls is pending; no API fields changed.
- Charchit then sent `YOJANA CONFIRM` for that accurate Hindi transcript and reported a cited PM-KISAN reply with the annual ₹6,000 amount and official portal link. This verifies one end-to-end voice-to-cited-text journey under the old confirmation command. The simpler `1`/`2`/`YOJANA EDIT` controls still need their own phone check. The bot was restarted after the new controls were committed and connected successfully.

## Stepwise questionnaire and CSC offer — 31 October

- Charchit's paired-phone screenshots showed a farmer NO answer caused an early result listing the remaining questions and PIN request in one long message. `server/whatsapp-flow.mjs` now asks every remaining scheme question one at a time even after a failing answer. Only after the final answer does it render the preliminary cited result. Skipped answers remain reachable with NEXT.
- The result now asks whether nearby service-centre help is wanted (1 YES / 2 NO). Only YES asks for a PIN or town in the next turn, then returns an unverified Google Maps search and official locator. `YOJANA CSC` remains available directly. This avoids asking for location before the person opts into that optional help. The reply does not store the location in the profile.
- Changed files: `server/whatsapp-flow.mjs`, `server/whatsapp-flow.test.mjs`, `docs/WHATSAPP_FLOW.md`, and this handoff. No `/api/chat` or `/api/recommend` fields changed. Pulkit's claimed commit `867dbcc` was not present locally or on GitHub at the time of this work; the remote `pulkit/whatsapp-stepwise` branch still pointed to `7882e47`, so no Pulkit code was merged or represented as reviewed. A fresh paired-phone run of the new sequence is still needed.
- After restart, the bot connected and processed the paired-phone START → English → Farmer → NO test messages. Charchit reported “now its solved” for the stepwise behavior. The exact phone reply was not pasted, so this is user-reported confirmation rather than a captured transcript. `npm.cmd test`: 59/59 passed; `npm.cmd run build`: passed; `git diff --check`: passed.

## Contextual text and voice questions, five-option role menu — 31 October

- Charchit requested that the role menu omit “Volunteer helping someone” and that free questions use what the current chat already knows. The menu now shows five roles; numeric 6 is invalid. A helper may still ask a direct scheme question or type the volunteer role name. The test account's WhatsApp Web session was used only for a documented bot test, then Charchit requested no further web-chat access; no more UI messages were sent.
- Observed before the fix: in the active Farmer/PM-KISAN chat, `YOJANA How much money does it provide each year?` returned “Please name a covered scheme.” The new `server/whatsapp-flow.mjs` passes the current or last explicitly named `scheme_id` to the existing reviewed answer service, and permits a named scheme question before the role menu. An explicit new scheme overrides the previous one. A completed fictional profile can answer the narrow “Am I eligible?” question with the existing cited preliminary rule check. No new facts are generated from profile data.
- `server/voice-flow.mjs` routes confirmed voice questions through the same conversation-aware answer function; questionnaire choices still require confirmation. Changed files: `server/whatsapp-flow.mjs`, `server/voice-flow.mjs`, `server/whatsapp-prototype.mjs`, tests, `docs/WHATSAPP_FLOW.md`, `docs/HARDENING.md`, and this handoff. No shared API fields changed. The live bot must be restarted for these changes; a new paired-phone test of contextual follow-ups is pending Charchit's manual check.
- Automated verification: `npm.cmd test` passed 64/64, `npm.cmd run build` passed, and `git diff --check` passed. Focused tests include a direct question before the role menu, a follow-up that omits the scheme name, an explicit switch to another scheme, a fictional personal eligibility follow-up with citations, and voice routing through the conversation context. A browser observation of the old running bot confirmed the gap: after Farmer was selected, a follow-up without the PM-KISAN name asked for a scheme name. Charchit requested manual WhatsApp testing from this point onward; no later web-chat actions were taken.
