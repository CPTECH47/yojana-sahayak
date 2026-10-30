# Data handoff

Contributor: Pulkit

Branch: `data/supabase`

Status: preliminary source audit; review and integration remain pending.

## Changes

- Added `corpus/SOURCE_REVIEW.md` with the requirements provenance, audit of three existing sources, source hashes, historical rule evidence, sample profiles and explicit uncertainty.
- No server contract, runtime corpus, database migration or access policy was changed. The server currently loads all passages directly; a manifest-only status change does not prevent unreviewed text from being retrieved.

## Checks

- `git status --short --branch`: started on a clean `data/supabase` checkout.
- `Get-FileHash corpus/docs/pmkisan-guidelines.pdf -Algorithm SHA256`: matched the hash embedded in the existing PDF passages.
- Bundled Python `pypdf` read the 12-page PDF; selected page 3 text was inspected and page 2–3 evidence compared with stored passages. Replacement characters and historical cutoff language require attention.
- Official PIB PM-KISAN release fetched successfully on 2026-10-31; its raw HTML hash differs from the existing passage's recorded snapshot hash. Source content was read, but older snapshot equivalence was not proven.
- Official PIB NMMSS release also downloaded successfully after the initial web-reader failure; its title, ministry, date and announced deadline were checked. Its HTML hash also differs from the recorded earlier hash; full snapshot equivalence remains unverified.
- PS.pdf pages 10–11 were extracted using bundled `pypdf`. The PRD, registry and team instructions were read from the older repository's `codex/yojana-sahayak-prd-20261030` branch because they are not on this repository's current data branch.
- No app build or ingestion run was performed for this documentation-only audit; importer dependencies were not installed in this checkout.

## Pending coordination and work

- Charchit: agree source/manifest and rule fields, publication status enforcement, source version handling and a shared corpus location. Confirm current eligibility and historical exceptions before rules are used.
- Obtain the original PIB snapshots or reconcile both HTML hash differences; review the NMMSS release's complete extraction and verify 10–20 actual distinct useful documents. The 86-URL registry is discovery material, not the corpus.
- Define reproducible review/ingestion checks and independently test the integrated journey. No Supabase scheme storage, RLS policy, or live deployment has been verified here.
- Keep all fixtures fictional and do not collect personal identifiers, private records or credentials.
