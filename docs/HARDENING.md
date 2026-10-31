# Repair and rollout guide

This branch repairs the audited pilot. It is based on captain commit 2004fde. The captain must review and merge it before the default branch is called current. Until then, check out `codex/project-hardening` explicitly; a default clone of main still gets the older pilot.

## Answers and evidence

The runtime retrieves passages, then asks the local model to select IDs of pinned answer records. It renders the stored English/Hindi text and exact evidence metadata, never model-written prose. Fourteen records currently cover selected benefits, conditions, documents and application information across the five pilot schemes. Questions outside those records clarify or abstain. If the model is offline, the first relevant retrieved record is labelled `mode: extractive`; a real model-selected answer uses `mode: model_selected`. This bounded approach reduces fabricated facts but does not establish complete coverage or perfect relevance.

The repair preserves the existing source snapshots and summaries; it does not claim to have reverified them live. Each approved passage is now pinned by content/metadata digest and original snapshot hash in the manifest. Changed text, scheme, URL, authority or hash fails the runtime check. Rule evidence and bilingual answer records have independent pins: an updated source cannot silently approve a changed rule or a stale translation.

## Fetch, review, publish

```powershell
python -m venv .runtime/venv
.runtime/venv/Scripts/python.exe -m pip install -r requirements-ingest.txt
.runtime/venv/Scripts/python.exe scripts/ingest_sources.py --fetch pmuy-faq
```

Fetching creates immutable snapshots and unreviewed extracted blocks under ignored `corpus/source_snapshots/`. It supports the currently listed official domains, checks redirects before following them, bounds download size, and leaves the approved corpus alone on failure. New domains require an explicit allowlist change. PDF pages and HTML blocks remain review locators, not automatically accepted facts.

A reviewer opens the source and writes an approval JSON containing `candidate_path`, `reviewer`, `approved: true`, and `reviewed_passages: [{id, locator, text}]`. Each ID begins with the document ID and a colon. A time-sensitive source also needs an explicitly reviewed `valid_until`. Only then:

```powershell
.runtime/venv/Scripts/python.exe scripts/ingest_sources.py --publish path/to/review.json
```

Publishing verifies the candidate snapshot and previous version, replaces that source's reviewed passages and approval pins, and rejects stale reviews. After source review, separately review affected `corpus/answer-records.json` translations and `corpus/rule-evidence-lock.json` rules before changing their pins. Never bulk-update pins merely to make a test pass. Snapshot hashes identify files; they do not replace a human check of authority, applicability and factual support.

## WhatsApp and profile commands

Run the bot from one worktree only. Keep one absolute `YOJANA_AUTH_DIR` and one `YOJANA_STATE_DIR` across restarts. Never copy authentication state while a process is running. Both directories are private and must stay outside served or shared directories. The bot loads .env and takes exclusive process locks; it stops on logout instead of claiming an unlimited session. Network reconnects use bounded backoff. An actual Baileys logout/decryption failure still requires diagnosis, and may require operator relinking.

Users may ask a scheme question while choosing a role or answering questions. A checked exclusion ends further mandatory questioning. The result names missing answers and supports `EDIT 1` (question number), `NEXT` for an unknown condition, and `ROLE` to check another role. Multiple completed scheme profiles can coexist. Student, artisan and volunteer paths explain their limited coverage rather than inventing matching rules.

- `SAVE` separately consents to retaining a completed fictional profile for 30 days.
- `RESUME` restores a saved profile after a process restart and re-evaluates current evidence.
- `ALERTS ON` separately consents to relevant reviewed updates; it requires SAVE.
- `STOP` or `ALERTS OFF` withdraws alert consent and cancels queued notifications.
- `DELETE` erases the saved profile, recipient and queued alerts.

Without SAVE, profile answers remain in process memory. Idle unsaved conversations are cleared after 24 hours and capacity is bounded; there is no application 15-minute logout timer. Saving a profile does not guarantee a permanently connected WhatsApp account. Persistent state uses AES-256-GCM; the key stays in the same private local state directory. Anyone with access to that directory and key can decrypt it. On Windows, protect the directory with your user's filesystem permissions and do not sync it to a public/shared drive.

Only fictional eligibility data should be used for the hackathon. Operational WhatsApp IDs are HMAC-keyed in indexes and recipient IDs are retained encrypted only when update sending needs them. Message deduplication stores keyed IDs/statuses rather than message bodies for seven days, with a bounded admission limit. An uncertain send is not automatically replayed; the tester can send a new message.

## Reviewed-update alerts

Every five minutes while the bot is running, it checks the already-reviewed local corpus for changed versions. A source fetch alone cannot trigger publication. The first scan establishes a baseline; later reviewed changes queue at most one notification per profile/scheme/version. Only saved, opted-in profiles with a current matching or missing-information result and valid rule evidence qualify. Before delivery, consent, source version and matching are checked again.

Delivery is off by default. For a consenting paired test account only, `YOJANA_TEST_ALERTS=1` enables the experimental Baileys sender. STOP still applies. Do not enable public proactive messaging through this switch: use an approved production transport and implement its current consent/template/window requirements. The queue does not claim automatic discovery of all new government schemes. A scheduled website fetch/reviewer workflow and additional scheme rules remain operator responsibilities.

## API and release checks

The API binds to 127.0.0.1 by default. A different HOST requires API_ACCESS_TOKEN, sent as a Bearer token by an authorised caller. Keep the token out of browser bundles. Requests are rate-limited and model work admission is bounded; bad JSON and invalid bodies return JSON errors.

- `GET /api/health`: process/corpus liveness.
- `GET /api/ready`: independent corpus count and actual configured-model availability; 503 when the minimum corpus or model is missing. Extractive fallback availability is reported separately.
- `POST /api/chat`: supports en/hi; adds mode and fact_ids. Unsupported languages are rejected. No model prose reaches the user.
- `POST /api/recommend`: may return insufficient_evidence and an empty results list when any pinned rule evidence is unavailable.

```powershell
npm.cmd test
.runtime/venv/Scripts/python.exe -m unittest discover -s scripts -p test_*.py
npm.cmd run build
npm.cmd run check:release
```

The corpus gate is time-dependent in Asia/Kolkata. A controlled 31 October 2026 check sees ten usable documents; 1 November sees eight because two NMMSS documents expire. This is a blocked release condition until the source owner reviews replacements or renewed source evidence. Do not remove expiry to meet the count.

Before the captain merges/releases: run the checks on a fresh checkout, verify a real Hindi and English question against sources with the configured model, then use the consenting paired phone to check START, language, correction, skip, resume after restart, STOP, unsupported questions and citation opening. Local/mock tests do not prove phone delivery or production readiness.
