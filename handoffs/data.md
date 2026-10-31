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

- Charchit: agree source/manifest and rule fields, publication status enforcement, source version handling and a shared corpus location. Confirm current eligibility and historical exceptions before rules are used.
- Obtain the original PIB snapshots or reconcile both HTML hash differences; review the NMMSS release's complete extraction and verify 10–20 actual distinct useful documents. The 86-URL registry is discovery material, not the corpus.
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

## Independent continuation — 31 October 2026

- Starting heads: `data/supabase` 9d4053be417abf749e4ab831eb50f47ccf74d36e; `captain/server-integration` b1c2542aafe14804b68eac72016c3392e85b5c07; `main` 0531e3746905c2f077947acb098835c53a25408a. PR #5 remains draft and issue #2 open. No branch was merged.
- Exact branch manifest count: 3 entries labelled approved, of which only the PM-KISAN PDF's original snapshot is committed and independently hash-verified here; original PIB HTML snapshots have unresolved hash differences and are not reproducible from this branch. Under the requested strict snapshot standard the confirmed full-snapshot count is 1, not 3. Captain branch separately lists 10 approved/1 failed; two approved NMMSS entries expire 31 October and are withheld from its answers due to a discrepancy. No captain documents were imported.
- Added `corpus/source-candidates/pib-recheck/`: independently re-fetched and hashed three attributed PIB article excerpts covering PM-JAY and PMMVY, with source titles, authorities, dates, locators and fictional scenarios. They are extracts, not complete document snapshots, and all remain `needs_review`; they add zero to the approved count. Raw fetch hashes and preserved excerpt hashes are in candidate-records.json. Re-fetches can change raw HTML due to dynamic site content.
- The current NSP listing on 31 October displays an NMMSS student deadline different from the historical notice; retain the captain's quarantine pending independent current-source approval. Do not extend validity automatically. PMMVY ANC and state conflicts and PM-JAY full eligibility, exclusions, application and document requirements remain unresolved.
- Checks: `python corpus/source-candidates/pib-recheck/recheck.py` re-fetched and compared three paragraph excerpts; SHA-256 of each committed excerpt matched candidate-records.json; `git diff --check` passed. PS.pdf pp.10–11 extracted with Git's pdftotext; canonical PRD, source registry and branch handoffs inspected. No runtime integration, Supabase, public deployment or paired-phone test is claimed.
- Next: obtain agreement on shared manifest/passage/rule/status fields before modifying them; obtain and independently review 10–20 reproducible full snapshots and sourced rules/checklists across the requested schemes, reconcile captain versions, and test fictional matches, exclusions and unknowns. No schema migration is warranted yet.
