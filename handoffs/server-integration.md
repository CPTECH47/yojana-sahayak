# Server integration handoff

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
