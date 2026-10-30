# Server integration handoff

## Change summary

- Added a WhatsApp onboarding step: `YOJANA START` greets the user and offers quick text choices: reply `1` for Hindi or `2` for English. These two replies work without the prefix while awaiting a choice; language names and prefixed choices also work.
- Stores the language per direct-chat JID in memory for the lifetime of the running bot process. Each person can choose or switch independently. Restarting the process clears the choices.
- Shows the next-step menu in the selected language, passes the choice into `/api/chat` answer service calls, labels citations in Hindi or English, and localizes preliminary PM-KISAN match replies.
- Preserved the explicit `YOJANA ` prefix and added localized service-unavailable replies.

## Files changed

- `server/whatsapp-flow.mjs`, `server/whatsapp-flow.test.mjs`
- `server/whatsapp-prototype.mjs`, `server/yojana-answer.mjs`, `server/yojana-answer.test.mjs`
- `server/corpus.mjs`, `server/corpus.test.mjs`
- `corpus/manifest.json`, `corpus/passages.json`
- `README.md`, `PROJECT_BRIEF.md`, `docs/SOURCE_GOVERNANCE.md`, `docs/WHATSAPP_FLOW.md`, `.gitignore`

## Commands and results

- `npm.cmd test` — 15/15 passed.
- `npm.cmd run build` — passed.
- `git diff --check` — passed.

## Unfinished and unverified

- The updated `YOJANA START` and language-selection journey has not been tested on the paired WhatsApp phone.
- Live Qwen answers, message delivery, and opening cited links from WhatsApp remain unverified.
- Language choice is session-only and is not persisted to Supabase.
- The text route does not implement a multi-turn eligibility questionnaire; only selected PM-KISAN sample matching exists.

## API and handoff fields

- WhatsApp integration calls `answers.chat({ question, language })`, where language is `hi` or `en`.
- Answer citations retain `title`, `locator`, and `url`; no `/api/chat` or `/api/recommend` response fields changed in this update.
