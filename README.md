# Yojana Sahayak

A WhatsApp-first assistant that helps people understand government schemes and explore which schemes may fit their situation. It answers in Hindi and English using reviewed public sources, explains preliminary questionnaire results, and links to the evidence. This is an independent student prototype, not an official government service.

## Problem statement

India has many welfare, scholarship, and agriculture schemes, but their eligibility rules can be difficult to find and understand. Yojana Sahayak turns public scheme documents into short, cited answers and uses a brief questionnaire to suggest possible matches.

## Solution

The assistant retrieves relevant passages from its reviewed scheme corpus before preparing an answer. Answers include a source and page or section locator. If the available sources do not support an answer, it says that the evidence is insufficient. A separate questionnaire checks a limited set of scheme conditions and clearly labels its results as preliminary.

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
- Local Qwen (`qwen3:4b`) for drafting chat answers from retrieved passages.

## Demo status and limitations

This repository contains a working local prototype; no public production URL is currently documented here. The WhatsApp questionnaire still needs a paired-phone retest after the latest welcome and reply changes. Local chat answers require Ollama and the `qwen3:4b` model. Recommendation checks are limited to selected reviewed conditions; they do not confirm government eligibility.

The corpus is an initial quality-controlled set, not comprehensive coverage of all Indian schemes. Student and artisan flows are information-only. Supabase scheme storage, public deployment, live CSC results, automatic nearest-centre lookup, voice, and scheduled source monitoring are not implemented or verified. The CSC link is a manual link-out; users select their state, district, or other area details on the official locator.

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

The server excludes unapproved or expired passages, requires evidence for generated answers, and rejects numeric claims not supported by the cited evidence. These checks reduce hallucination risk but cannot guarantee correctness. Users should verify consequential decisions with the issuing authority. The assistant must not request Aadhaar numbers, bank details, or other beneficiary identifiers.

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

## API overview

- `POST /api/chat` accepts a question and optional language or scheme ID. It returns an answer status, answer text, and citations.
- `POST /api/recommend` accepts a language and a profile containing scheme-specific questionnaire answers. It returns preliminary results, missing fields, reasons, citations, and `official_decision: false`.
- `GET /api/health` reports service health and the number of approved corpus documents.
- `GET /api/prep-status` checks the separate Supabase practice table when Supabase variables are configured.

See [PROJECT_BRIEF.md](PROJECT_BRIEF.md) for exact request and response fields.

## Configuration and repository hygiene

Keep credentials in local environment variables or the hosting provider’s secret settings. Never commit `.env`, Baileys session files, Supabase secret or service-role keys, or real user data. Browser code must not contain a Supabase secret key. `.env.example` contains placeholders only.

To rebuild source passages, install `requirements-ingest.txt` in a Python environment and run `python scripts/ingest_sources.py`. Recheck each source before approving an updated version; failed, unreviewed, superseded, or expired evidence must not be used for answers.

## Further documentation

- [Project brief and API contract](PROJECT_BRIEF.md)
- [WhatsApp journey and evidence safeguards](docs/WHATSAPP_FLOW.md)
- [Source review and update policy](docs/SOURCE_GOVERNANCE.md)
