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
