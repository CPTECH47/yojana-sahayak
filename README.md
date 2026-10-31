# Yojana Sahayak

A WhatsApp-first assistant that helps people understand government schemes and explore which schemes may fit their situation. It answers in Hindi and English using reviewed public sources, explains preliminary questionnaire results, and links to the evidence. This is an independent student prototype, not an official government service.

## Problem statement

India has many welfare, scholarship, and agriculture schemes, but their eligibility rules can be difficult to find and understand. Yojana Sahayak turns public scheme documents into short, cited answers and uses a brief questionnaire to suggest possible matches.

## Solution

The assistant retrieves relevant passages, asks the local model to select pinned answer records, and renders their reviewed text with exact evidence citations. It never renders free-form model prose. With the model offline it offers a labelled extractive fallback. Questions outside the bounded records clarify or abstain. Matching requires every pinned supporting rule passage.

The audit repairs live on `codex/project-hardening` pending captain review. Check out that branch explicitly for these changes. Read [the repair and rollout guide](docs/HARDENING.md) before running or releasing it.

## Demo journey

1. A user sends `YOJANA START` in a direct WhatsApp chat.
2. The bot welcomes them and asks them to choose Hindi (`1`) or English (`2`).
3. The user chooses a role and answers a few scheme-specific questions. Invalid answers are asked again; the user can go back, skip, or cancel.
4. The bot returns a preliminary result with a short reason and source links, or gives relevant information without claiming eligibility where reviewed rules are not available.
5. The user can ask a scheme question; the bot answers from retrieved evidence and cites its source.

Tapping a citation opens the official source. Some sources open as long PDF documents; the message includes the cited page so the user can locate the supporting section. Recommendation replies also offer the [official CSC locator](https://locator.csccloud.in/) for people seeking in-person help; users select their area there. The bot does not automatically find or verify the nearest centres.

## Current features

- Hindi and English language selection and a role-based WhatsApp text journey.
- Evidence-based answers from ten reviewed official documents and pages.
- Source citations with title, URL, and page or section locator. Additional review metadata is recorded in the corpus manifest.
- Insufficient-evidence responses instead of unsupported answers.
- Preliminary selected-condition checks for PM-KISAN, PMUY, and PM-SYM.
- Student and artisan information leads without unsupported eligibility claims.
- Express endpoints for chat, recommendations, health, and the Supabase practice read.
- Local Qwen (`qwen3:4b`) for selecting retrieved, pinned answer records.
- Explicit SAVE/RESUME profile consent, separate update consent and STOP/DELETE controls.
- A durable local update queue, per-chat ordering and duplicate detection. Update sending is off by default.

## Demo status and limitations

This repository contains a local prototype; no public production URL is documented here. The repaired flow needs a paired-phone retest. Real model selection requires Ollama and `qwen3:4b`; a labelled extractive fallback remains available without them. Matching checks selected conditions and does not confirm government eligibility. Run `npm run check:release` for the current evidence count: ten sources are usable on 31 October 2026, but two expire before 1 November unless reviewed again.

The corpus is an initial quality-controlled set, not comprehensive coverage of all Indian schemes. Student and artisan flows are information-only. Supabase scheme storage, public deployment, live CSC results, automatic nearest-centre lookup, and scheduled source monitoring are not implemented or verified. An opt-in local voice-question path has been added but still requires model installation and a real-phone test. The CSC link is a manual link-out; users select their state, district, or other area details on the official locator.

## Technology

| Area | Technology |
| --- | --- |
| WhatsApp connection | Node.js and Baileys |
| API | Express |
| Web reference interface | React and Vite |
| Answer generation | Local Ollama with Qwen 3 4B |
| Evidence | Reviewed public scheme documents and source manifest |
| Optional practice database check | Supabase |
| Checks | Node test runner and Vite production build |

## Sources and answer safety

The corpus records source URLs, authorities, verification dates, hashes, status, and page or section locators in `corpus/manifest.json` and `corpus/passages.json`. myScheme, India.gov.in, and data.gov.in are used for discovery and change detection; eligibility answers rely on approved evidence from the issuing ministry or official programme source.

The server excludes unapproved, expired or altered passages. A model can choose only supported fact IDs; the stored English/Hindi text supplies the final amount, period and conditions. The bounded records can still be incomplete or imperfectly selected, and source review remains necessary. Users should verify consequential decisions with the issuing authority. The assistant must not request Aadhaar numbers, bank details, or other beneficiary identifiers.

## Run locally on Windows

Requirements: Node.js 20.19 or newer, npm, and Ollama for generated chat answers.

```powershell
npm.cmd ci
npm.cmd run build
ollama pull qwen3:4b
```

Start Ollama, then start the app:

```powershell
npm.cmd start
```

Open `http://localhost:3000/api/health`. The API contract and request fields are documented in [PROJECT_BRIEF.md](PROJECT_BRIEF.md). Run the checks with:

```powershell
npm.cmd test
npm.cmd run build
```

## Run the WhatsApp prototype

Use a consenting test account. From the project root, run:

```powershell
node server/whatsapp-prototype.mjs
```

Follow the pairing instructions and keep the process running. After the terminal reports `WhatsApp connected`, send `YOJANA START` from a second WhatsApp account in a direct chat. The prefix is required to start and for standalone questions; replies inside an active questionnaire can be sent without it. Stop the process when testing ends. Never share or commit `server/.baileys-auth/`.

Baileys connects through WhatsApp Web and is not an official WhatsApp Business API integration. Use a dedicated demo number if one is available and tested.

## Website and experimental voice questions

After `npm.cmd run build` and `npm.cmd start`, open `http://127.0.0.1:3000/`. The scheme directory reads public reviewed facts from `/api/catalog`; unavailable or expired evidence is excluded. Its WhatsApp links open a prepared `YOJANA START` message to the configured prototype number; the visitor must press Send. The CSC locator remains a manual link.

The experimental voice flow requires Python, FFmpeg on the system PATH, and the optional local dependencies:

```powershell
python -m venv .runtime\voice-venv
.\.runtime\voice-venv\Scripts\python.exe -m pip install -r requirements-voice.txt
```

Restart the bot after installation. In an active direct chat, send a voice note without any voice command; `YOJANA VOICE` also works as an explicit prompt. The local faster-whisper `small` model is downloaded on first use; this can take time and needs internet for the model download. The bot presents the transcript for confirmation. Reply `1` or `YOJANA CONFIRM` to use it; reply `2` or `YOJANA CANCEL` to discard it and record again. To fix misheard words without recording again, send `YOJANA EDIT <correct sentence>` and then confirm. No voice answer is submitted until confirmed. The current path handles Hindi and English text answers only and does not create voice audio replies. Voice bytes are passed to the local worker in memory when the local provider is selected. Never send personal identifiers or financial details in recordings. Phone, language accuracy and latency must be verified on the actual device.

Optional alternative when local recognition fails: set `YOJANA_STT_PROVIDER=sarvam` and `SARVAM_API_KEY` in a private `.env` file, then restart the WhatsApp bot. The server sends each voice note to Sarvam Saaras v4 for transcription; this needs internet and uses Sarvam credits. Tell test users that audio is sent to Sarvam and do not request personal identifiers or financial details. The key stays on the server and is never committed. Sarvam REST accepts recordings up to 30 seconds; a longer voice note is rejected before upload. Text questions and the local provider remain available. The bot still asks the user to confirm the transcript before using it. A real English synthetic clip and one paired-phone Hindi question were correctly transcribed on 31 October; other voices, accents and questions remain unverified. Use `YOJANA_STT_PROVIDER=local` or remove the variable to return to local faster-whisper.

## API overview

- `POST /api/chat` accepts a question and optional language or scheme ID. It returns an answer status, answer text, and citations.
- `POST /api/recommend` accepts a language and a profile containing scheme-specific questionnaire answers. It returns preliminary results, missing fields, reasons, citations, and `official_decision: false`.
- `GET /api/catalog` returns public scheme names and pinned facts only when their supporting passages are approved and unexpired. The endpoint remains public when the API token is configured; rate limits still apply.
- `GET /api/health` reports service health and the number of approved corpus documents.
- `GET /api/prep-status` checks the separate Supabase practice table when Supabase variables are configured.

See [PROJECT_BRIEF.md](PROJECT_BRIEF.md) for exact request and response fields.

## Configuration and repository hygiene

Keep credentials in local environment variables or the hosting provider’s secret settings. Never commit `.env`, Baileys session files, Supabase secret or service-role keys, or real user data. Browser code must not contain a Supabase secret key. `.env.example` contains placeholders only.

To fetch review candidates, install `requirements-ingest.txt` in a Python environment and use `python scripts/ingest_sources.py --fetch SOURCE_ID`. No-argument invocation only prints help. A separate reviewer-authored approval file is required to publish. See [the repair guide](docs/HARDENING.md) for pinning, private state, alert controls, API authentication and release checks.

## Further documentation

- [Project brief and API contract](PROJECT_BRIEF.md)
- [WhatsApp journey and evidence safeguards](docs/WHATSAPP_FLOW.md)
- [Source review and update policy](docs/SOURCE_GOVERNANCE.md)
