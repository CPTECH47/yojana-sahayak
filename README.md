# Yojana Sahayak

A student prototype for source-cited government-scheme questions and preliminary matching. It is independent of the Government of India. The official hackathon core is still in progress: the current corpus contains **3 of the required 10–20 documents**.

## What runs today

- React/Vite practice screen and Express health, chat and recommendation APIs.
- Three sourced pilot documents: PM-KISAN operational guidelines, a February 2026 Agriculture Ministry release, and an October 2026 Education Ministry release on NMMSS. Their URLs and extracted passages are in `corpus/`. The user's supplied government-link directory supplies the PM-KISAN and Education discovery portals, recorded as `directory_entry_url`. The two PIB releases are additional official documents, not direct links in that directory. Each new source must be checked before use.
- Local Qwen (`qwen3:4b`) drafts answers from retrieved passages; the server checks selected citation IDs and numeric claims before returning them. This is a limited safeguard, not a guarantee of factual correctness.
- The existing prefixed Baileys WhatsApp text route and a fictional PM-KISAN diagnostic command. Baileys is an unofficial WhatsApp Web integration; use a consenting test account and a dedicated number for a wider demo.

## Setup on Windows

1. Install Node.js 20.19+ and Ollama. Run `ollama pull qwen3:4b` if the model is missing.
2. Run `npm.cmd ci` and `npm.cmd run build`.
3. Start Ollama, then run `npm.cmd start`; open `http://localhost:3000/api/health`.
4. To test chat, POST JSON to `/api/chat`; to test fictional matching, POST JSON to `/api/recommend`. The API shapes are in [PROJECT_BRIEF.md](PROJECT_BRIEF.md). Run `npm.cmd test` for focused checks.
5. For a consenting WhatsApp test, run `node server/whatsapp-prototype.mjs` and follow the local pairing instructions. Send `YOJANA START` from a second account. Stop the process when the test ends. Never share `server/.baileys-auth/`.

To rebuild source passages, install `requirements-ingest.txt` in a Python environment and run `python scripts/ingest_sources.py`. Review new passages before using them for answers. Do not collect beneficiary identifiers or commit real conversations.

## Verified versus pending

The source importer, local build and selected API behavior have automated checks. Live WhatsApp text was reported and tested in the earlier prototype, but has not yet been retested from this new repository. Voice input/output, Punjabi quality, Supabase scheme storage, public deployment and the 10–20-document corpus remain pending. A potential match is not a government approval.
