# Data handoff

Contributor: Pulkit

Branch: `data/supabase`

Status: preliminary source audit; review and integration remain pending.

## Changes

- Added `corpus/SOURCE_REVIEW.md` with the requirements provenance, audit of three existing sources, source hashes, historical rule evidence, sample profiles and explicit uncertainty.
- Added `corpus/PILOT_CANDIDATES.md` with PMUY FAQ and 2020 PMFBY guideline metadata, snapshot hashes, selected passages, fictional scenarios and unresolved freshness issues. They are not added to the runtime index.
- No server contract, runtime corpus, database migration or access policy was changed. The server currently loads all passages directly; a manifest-only status change does not prevent unreviewed text from being retrieved.

## Checks

- `git status --short --branch`: started on a clean `data/supabase` checkout.
- `Get-FileHash corpus/docs/pmkisan-guidelines.pdf -Algorithm SHA256`: matched the hash embedded in the existing PDF passages.
- Bundled Python `pypdf` read the 12-page PDF; selected page 3 text was inspected and page 2–3 evidence compared with stored passages. Replacement characters and historical cutoff language require attention.
- Official PIB PM-KISAN release fetched successfully on 2026-10-31; its raw HTML hash differs from the existing passage's recorded snapshot hash. Source content was read, but older snapshot equivalence was not proven.
- Official PIB NMMSS release also downloaded successfully after the initial web-reader failure; its title, ministry, date and announced deadline were checked. Its HTML hash also differs from the recorded earlier hash; full snapshot equivalence remains unverified.
- Inspected PMUY FAQ questions 1, 2 and 6 and extracted PMFBY PDF pages 1, 13 and 15 using bundled `pypdf`; the PMFBY portal lists 2023 guidance and the PMUY site displays differing benefit amounts. Snapshot hashes and review limits are in `PILOT_CANDIDATES.md`; original candidate snapshots are only in local temporary storage.
- PS.pdf pages 10–11 were extracted using bundled `pypdf`. The PRD, registry and team instructions were read from the older repository's `codex/yojana-sahayak-prd-20261030` branch because they are not on this repository's current data branch.
- No app build or ingestion run was performed for this documentation-only audit; importer dependencies were not installed in this checkout.

## Pending coordination and work

- Charchit agreed to retain the existing shared data fields (confirmed in the latest PR #5 comment). The server-side approval gate, source version handling and integrated retrieval still need an owner review; this data branch does not alter server code.
- Reconcile the remaining PM-KISAN PIB hash mismatch; review current operative rules, exclusions and application guidance across PM-KISAN, PMUY, PM-SYM, PMMVY and PM-JAY; reach 10–20 distinct reviewed, reproducible public documents. The 86-URL registry is discovery material, not the corpus.
- Define reproducible review/ingestion checks and independently test the integrated journey. No Supabase scheme storage, RLS policy, or live deployment has been verified here.
- Keep all fixtures fictional and do not collect personal identifiers, private records or credentials.


## PMUY declaration extraction update (checked 2026-10-31)

- Resolved the linked declaration PDF's empty text-layer failure. The one-page official PDF is 46,167 bytes with SHA-256 `a2a346d9d4f2e283366031575c2950f7b51f2979f7408eb2e862175f016b96ac`, matching the captain-branch manifest. `pypdf` returned no text; page 1 was rendered with `pdftoppm` and declarations 1–11 were manually paraphrased and visually reviewed. The document is summarized in `corpus/PILOT_CANDIDATES.md`.
- The PMUY application page links this generic LPG connection form and its footer credits IOCL/BPCL/HPCL, but does not state this form's issuing body. Embedded metadata records file creation on 2015-01-06 20:55:14 +05:30; that is not a publication or effective date. Neither date is stated in the form. It remains excluded from PMUY eligibility retrieval because it is not the PMUY-specific deprivation declaration.

## GitHub coordination snapshot (checked 2026-10-31)

- Issue #2 remains open and assigned to Pulkit. PR #5 remains open and draft. The `data/supabase` manifest has three approved documents; the 10–20 source target is not complete on this branch.
- The captain's `captain/server-integration` branch records ten approved sources and one failed PMUY declaration source. PR #7 is open and ready for captain review, not merged. Two time-sensitive NMMSS sources expire after 2026-10-31 and must be rechecked before use from 2026-11-01. Do not treat the captain branch's source count as merged into this data branch.
- Tejas's issue #4 remains open. Tejas reports PR #7's tests/build pass, but paired-phone QA remains pending after a WhatsApp 401 and unavailable local Ollama model. The live-phone path is not verified.
- Pulkit's remaining data work includes reconciling sources after captain review, completing the 10–20 current-source target, finishing PM-KISAN/PMUY/PM-SYM application guidance and PMMVY/PM-JAY reviews, and agreeing shared fields with Charchit. This is not only waiting on captain/Tejas; no Supabase migration is currently justified.


## PMMVY and PM-JAY source audit (2026-10-31)

- Added `corpus/source-candidates/PMMVY_PMJAY_AUDIT.md` in commit `7074723`, with three PIB source summaries, URLs, dates, local snapshot hashes, locators and fictional cases. These remain quarantined; snapshots are on the reviewer’s machine and not committed, so they do not increase the branch's approved count.
- Cached official PMMVY pages conflict on the first-child antenatal-check condition and Odisha coverage. Direct downloads failed certificate verification; resolve the current version before using either statement in an answer. Four NHA PDF URLs returned HTML shells in this environment. An Urdu PIB PDF had an empty `pypdf` extraction on page 4; its cause and translation remain unchecked.
- Checked: Python `hashlib.sha256` matched all four downloaded PIB files to the recorded hashes; `pypdf` confirmed 10 pages and no extracted text on page 4 of the Urdu PDF; two retained NHA responses were verified as HTML, not PDF. `git show --check 7074723` passed. These were source checks, not app or ingestion tests.
- Next: obtain current, accessible official sources and shared reproducible snapshots, resolve conflicts and extraction failure, and agree corpus/rule fields with Charchit before integration. The captain branch has an approval/expiry gate; this data branch has not incorporated it. No Supabase migration is justified by this audit.


## Independent recheck and snapshot work (2026-10-31)

- Rechecked the live issue #2 and PR #5. Issue #2 remains open and assigned to Pulkit; PR #5 remains open and draft. Charchit's latest PR comment confirms he agreed to keep the existing shared fields. No Supabase migration or RLS change is needed for this evidence-only change.
- Rechecked the ten `approved` source URLs on the latest captain branch head `fe351b32d1474de0da73fdde9b296a4d4248ac91`: three accessible responses matched their manifest hashes (PMUY FAQ, PMUY application page and PM-SYM Ministry PDF); three mutable HTML responses differed (PM-KISAN instalments, NMMSS notice and NSP listing); four requests failed in this environment (PM-KISAN guidelines PDF, PM Vishwakarma booklet PDF, PM-KISAN home page and e-KYC PDF). A failed request is not proof the source changed. No captain source was imported or counted on the data branch from this check.
- Marked `nmms-2026-notice` as `needs_review` and removed its dated deadline passage from `corpus/passages.json`. The official PIB release states the 2026–27 student application deadline was 31 October 2026; a later official PIB workshop release repeats that date. The live NSP pages expose differing closing dates, including 31 October and 30 November, and do not provide a reproducible NMMSS-specific update resolving the conflict. The application deadline is time-sensitive and expires on 31 October; suppress it pending a fresh, NMMSS-specific portal check. Sources: [PIB extension notice](https://www.pib.gov.in/PressReleseDetailm.aspx?PRID=2317657&lang=1&reg=3), [PIB workshop release](https://www.pib.gov.in/PressReleseDetailm.aspx?PRID=2323830&lang=2&reg=48), [NSP scholarship listing](https://scholarships.gov.in/All-Scholarships).
- Added three complete extracted PIB article-body text snapshots in `corpus/source-candidates/pib-shared/snapshots/` for PM-JAY (2024), PMMVY (2026), and Ayushman Vay Vandana (2026), plus exact source metadata, source-response and text-snapshot hashes, locators, and a reproducible offline verifier. The [PIB copyright policy](https://www.pib.gov.in/content/132_2_Copyright-Policy.aspx?lang=1&reg=1) permits accurate attributed reproduction of PIB material while excluding third-party material; only article text is retained. The original HTML responses remain local-only. These candidates remain quarantined and do not increase the approved runtime count; PMMVY conditions and complete PM-JAY enrollment rules are unresolved.
- Updated the current NMMSS manifest state conservatively: 2 entries remain marked `approved`, but only the PM-KISAN PDF is an original complete source snapshot committed and independently hash-verified on this branch. The other PM-KISAN PIB record has a historical hash mismatch. Under the strict snapshot requirement, the verified count is **1**. The three new PIB article-body text snapshots are additional candidate evidence, not approved sources.
- Checks run: `node corpus/source-candidates/pib-shared/verify_snapshots.mjs` passed for all three snapshot hashes and excerpt hashes. The new candidate snapshots have their own SHA-256 and byte counts in `candidate-records.json`. The manifest status change alone is not an enforcement gate: the existing server loader reads `passages.json` directly, so disputed NMMSS text was removed from passages as well. No runtime integration, application build, ingestion, Supabase policy, or phone test was run.
- Three local commits are ahead of the live `data/supabase` head `198a32f`. The push attempt failed because Git Credential Manager could not persist credentials to Windows `wincredman` and Git had no username/token. No credentials were read, stored, or exposed by this work; the commits have not reached GitHub.
- Still incomplete: the 10–20 reviewed document target; current operative PM-KISAN, PMUY, PM-SYM, PMMVY and PM-JAY rules, exclusions, application documents/steps; reconcile the remaining current sources with captain's branch; test synthetic match/exclusion/unknown cases in the integrated application. Captain's sources are not counted as merged into this data branch. PR #5 stays draft; captain handles merging.
