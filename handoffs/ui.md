# UI handoff

- Owner: Tejas; branch: ui/main-journey.
- Added responsive Hindi/English sample-profile questionnaire, corrections, skip, preliminary results, sourced questions, sample/live mode, and error states.
- Files: client/main.jsx, client/style.css, index.html, handoffs/ui.md.
- Checks: npm ci, npm run build and git diff --check passed. Browser: answered and skipped sample questions; live recommendation displayed a missing field and two official source links; a fictional unsupported question returned a no-evidence response. Results screen inspected at 375x812.
- Unfinished: Hindi full journey, correction, error/retry, opening citations and an answerable RAG question need independent testing; Hallmark download and full review pending.
- Contract: POST /api/chat and /api/recommend as in PROJECT_BRIEF.md; citations use title, authority, url, locator, verified_at. Results are rendered as a list.
- Matching supports only PM-KISAN pilot fields. Charchit and Pulkit must agree additional scheme-specific question and rule fields before other schemes can be matched. Other schemes can be queried if present in the reviewed corpus.
- Sample mode is illustrative and does not assert real scheme facts. No Punjabi or audio controls.
- Owner clarification: WhatsApp via Baileys is the primary interface; this web branch is optional and should not be merged as the product interface without captain coordination.
- WhatsApp readiness check on this checkout: the text handler requires the YOJANA prefix, calls the shared chat service, and formats citations; it does not implement a conversational questionnaire or audio. No WhatsApp pairing or message delivery was tested in this check.
- Local API check: health reported 3 corpus documents; a fictional partial profile produced needs_information with three missing fields and source citations. Ollama was not on PATH and its local endpoint was unavailable; a PM-KISAN chat request returned model_unavailable. This check did not validate the latest captain branch.
- Captain/server follow-up: implement and test the WhatsApp conversation, local model setup, and broader-scheme matching after agreeing reviewed rules and interfaces with Pulkit. Obtain a consenting test account before an end-to-end WhatsApp test.
