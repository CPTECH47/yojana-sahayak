# UI handoff

- Owner: Tejas; branch: ui/main-journey.
- Added responsive Hindi/English sample-profile questionnaire, corrections, skip, preliminary results, sourced questions, sample/live mode, and error states.
- Files: client/main.jsx, client/style.css, index.html, handoffs/ui.md.
- Checks: npm ci, npm run build and git diff --check passed. Browser: answered and skipped sample questions; live recommendation displayed a missing field and two official source links; a fictional unsupported question returned a no-evidence response. Results screen inspected at 375x812.
- Unfinished: Hindi full journey, correction, error/retry, opening citations and an answerable RAG question need independent testing; Hallmark download and full review pending.
- Contract: POST /api/chat and /api/recommend as in PROJECT_BRIEF.md; citations use title, authority, url, locator, verified_at. Results are rendered as a list.
- Matching supports only PM-KISAN pilot fields. Charchit and Pulkit must agree additional scheme-specific question and rule fields before other schemes can be matched. Other schemes can be queried if present in the reviewed corpus.
- Sample mode is illustrative and does not assert real scheme facts. No Punjabi or audio controls.
