# Project repair handoff

Owner: Tejas's coding agent, on codex/project-hardening, based on captain 2004fde. The user explicitly requested fixes across the audited areas. Captain review and integration are required.

Changes: pinned retrieved answer records replace free-form model text; missing/changed rule evidence blocks matching; approved passages bind to metadata/content/snapshot; importer stages changes for a reviewer; questionnaire supports direct questions, early exclusion, explicit missing answers and correction; optional consent-based encrypted profile retention and update queue; durable duplicate detection and per-chat ordering; API localhost default, token requirement for external bind, request limits and model readiness.

Files span server/, scripts/, reviewed record metadata in corpus/, configuration, CI and documentation. No existing application facts were live-reverified, no expiry was extended, no Supabase schema was invented, and no private pairing state or real user transcript is part of this branch.

Commands/results: npm test passed 35/35 JavaScript tests; .runtime/venv/Scripts/python.exe -m unittest discover -s scripts -p test_*.py passed 4/4 importer tests; npm run build and git diff --check passed. Live localhost HTTP smoke on port 3011 returned a pinned PM-KISAN extractive answer and correct model-unavailable readiness. A controlled 31 October release check passes the ten-document gate; 1 November deliberately returns exit 1 with eight documents until source review. Local tests use fictional data and mock selectors/senders. A later paired-phone run must record exact messages and observed replies separately.

Contract changes: /api/chat en/hi only, mode model_selected or extractive and fact_ids; /api/recommend insufficient_evidence with empty results when rule evidence is unavailable; /api/ready exposes model and corpus checks. The message interface adds SAVE, RESUME, ALERTS ON/OFF, STOP, DELETE, EDIT n, NEXT and ROLE. Public test-alert sending is disabled by default.

Remaining external work: captain merge/release, current source review when NMMSS evidence expires, real model performance, paired-phone retest, live citation target checks and an approved production messaging transport. Six roles do not promise six complete eligibility engines or nationwide matching. This branch does not promise an unlimited WhatsApp connection or universally error-free answers.
