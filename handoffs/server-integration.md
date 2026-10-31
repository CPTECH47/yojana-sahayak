# Server integration handoff

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
