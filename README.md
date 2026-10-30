# Yojana Sahayak

A student prototype for source-cited government-scheme questions and preliminary matching. It is independent of the Government of India. The corpus now contains **10 reviewed official documents/pages**, with source dates, hashes and passage locators recorded in `corpus/manifest.json` and `corpus/passages.json`.

## What runs today

- React/Vite practice screen and Express health, chat and recommendation APIs.
- Reviewed sources cover PM-KISAN (farmers), NMMSS (students), PMUY (families), PM Vishwakarma (artisans) and PM-SYM (unorganised workers). Each evidence passage has a source URL, authority, verification date, hash and page/section locator. Dated application windows expire automatically from retrieval; the NMMSS 2026-27 dates are valid only through 2026-10-31 unless rechecked.
- myScheme, India.gov.in and data.gov.in are **discovery and change-detection sources**, not proof of eligibility. Answers use only approved passages from the issuing ministry or official programme portal. Raw web snapshots are excluded from Git; hashes and short reviewed paraphrases are recorded so the public repo does not redistribute whole portal pages or large documents.
- Local Qwen (`qwen3:4b`) drafts answers only from retrieved passages. The server rejects answers without evidence IDs, unknown or expired sources, and numeric claims absent from the cited text. Unsupported questions receive an insufficient-evidence reply. These checks reduce hallucinations but do not prove every sentence is correct; users receive citations and must confirm consequential decisions with the issuing authority.
- The existing prefixed Baileys WhatsApp text route and a fictional PM-KISAN diagnostic command. Baileys is an unofficial WhatsApp Web integration; use a consenting test account and a dedicated number for a wider demo.

## Setup on Windows

1. Install Node.js 20.19+ and Ollama. Run `ollama pull qwen3:4b` if the model is missing.
2. Run `npm.cmd ci` and `npm.cmd run build`.
3. Start Ollama, then run `npm.cmd start`; open `http://localhost:3000/api/health`.
4. To test chat, POST JSON to `/api/chat`; to test fictional matching, POST JSON to `/api/recommend`. The API shapes are in [PROJECT_BRIEF.md](PROJECT_BRIEF.md). Run `npm.cmd test` for focused checks.
5. For a consenting WhatsApp test, run `node server/whatsapp-prototype.mjs` and follow the local pairing instructions. Send `YOJANA START` from a second account. Stop the process when the test ends. Never share `server/.baileys-auth/`.

To rebuild source passages, install `requirements-ingest.txt` in a Python environment and run `python scripts/ingest_sources.py`. Recheck current pages before changing a source status to `approved`; `needs_review`, `failed`, `superseded`, and expired sources are excluded from retrieval. Do not collect Aadhaar, bank details, other beneficiary identifiers, or real conversations in the prototype.

## Team coordination

Current owners and the eight-minute update format are in [docs/TEAM_CHECKINS.md](docs/TEAM_CHECKINS.md). Source review and change-detection policy is in [docs/SOURCE_GOVERNANCE.md](docs/SOURCE_GOVERNANCE.md).

## WhatsApp user journey

After language selection, the WhatsApp bot asks whether the user is a farmer, student, worker, artisan, family member, or volunteer. It asks only the checked conditions needed for preliminary PM-KISAN, PMUY, or PM-SYM matching; student and artisan paths provide information without claiming eligibility. Invalid answers are requested again; users can go back, skip, or cancel. Answers remain in session memory and the bot does not request Aadhaar or bank details. It does not make official eligibility decisions. See [the WhatsApp flow and evidence safeguards](docs/WHATSAPP_FLOW.md).

## Verified versus pending

The source importer, local build and selected API behavior have automated checks. The updated questionnaire still needs a paired-phone test; do not claim live delivery or model responses until observed. Voice input/output, Punjabi quality, Supabase scheme storage, public deployment and scheduled change monitoring remain pending. A potential match is not a government approval.
