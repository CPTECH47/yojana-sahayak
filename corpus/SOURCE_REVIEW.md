# Source review and preliminary rule evidence

Contributor: Pulkit

Review date: 2026-10-31

Status: preliminary evidence review; not authorization to publish new rules or alter the server contract.

## Inputs and scope

The official PS.pdf pages 10–11 require 10–20 actual public documents, Hindi/English retrieval with named citations, and a questionnaire. The canonical PRD and the 86-URL discovery registry were read from `CPTECH47/MindForge-hackathon-30`, branch `codex/yojana-sahayak-prd-20261030`, paths `docs/yojana_sahayak/PRD.md` and `docs/yojana_sahayak/source_registry.json`. The registry is a candidate directory, not a collection of approved facts. `AGENTS.md` was read from the same branch. These files are absent from this repository's current data branch; coordinate their authoritative location with the captain.

## Existing source audit

| Source | Evidence reviewed | Result and limits |
|---|---|---|
| PM-KISAN Operational Guidelines, revised 29 March 2020; Ministry of Agriculture and Farmers Welfare; [official PDF](https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf) | Existing `corpus/docs/pmkisan-guidelines.pdf`: SHA-256 `ae82cac83f61a5fa5049387a7c13e00c6d55cef0e9163deb5497dc86c86d697f`, matching the existing passage records. The PDF has 12 pages; extracted pages 2–3 were checked against the existing page-labeled passages. | Readable extract confirmed for the selected pages. Official search indexed the same titled PDF; direct web fetch failed in this session. The historical guideline's page 3 contains a five-year cutoff and exceptions: verify current amendments before using it as current eligibility policy. Some PDF text extraction contains replacement characters; review affected passages before publication. |
| PM-KISAN Instalments; Ministry of Agriculture and Farmers Welfare / PIB; 10 February 2026; [official release](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2225989&lang=1&reg=1) | Accessed 31 October 2026. Article body describes cultivable landholding, exclusions, annual benefit and Aadhaar-linked payment. Current downloaded HTML SHA-256 `3bac38a5cb46d5c9b5e870d73a2795d66cb9458e0ced808cf3fd079f9b756ca5`. | The current HTML hash differs from existing passage hash `f116e5e84f265875400a34de3168a9257d366b4c386ca5569ecb467d14444224`. Dynamic page markup may change, but content equivalence has **not** been established. Preserve and compare both snapshots or re-ingest and review with the server owner; this release is not a complete eligibility rulebook. |
| NMMSS scholarship deadline extension; Ministry of Education / PIB; 1 October 2026; [release](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2317657&lang=1&reg=3) | Accessed 31 October 2026 after the web-reader fetch failed; a direct download confirmed the issuing ministry, title and date. Current HTML SHA-256 `9c822fc3fa4c3301e65beacd66a3bada778e7ee58e151d810b3d1b0bc0d2e395`; article body states the 2026–27 deadline was extended to 31 October 2026. | Existing passage hash `4f925111bf523ac1251435ca89075ac33d192add939ab0395ee82230f5dd4f28` differs; original HTML snapshot is not tracked, and full equivalence remains unverified. A dated announcement does not establish whether applications are currently open. Existing runtime loads passages without consulting manifest status; server owner must review this risk. |

Only the PDF snapshot was matched byte-for-byte against the existing corpus. Both PIB releases are independently readable, but their earlier snapshots cannot yet be verified. No claim is made that all three existing sources are current or fully reviewed.

## Preliminary PM-KISAN conditions

The 2020 guideline, page 2, sections 3 and 4.1, describes a landholder farmer family, cultivable land and institutional-landholder exclusions. Page 3, section 4.1(b)(v)–(vi), describes income-tax payers in the last assessment year and named professionals who are registered and practising. These are historical source-backed interpretations, not complete current rules or an official decision. Other exclusions, land-record requirements, exceptions, dates and later amendments must be reviewed before a full eligibility decision. Refer to `pmkisan-guidelines:2` and `pmkisan-guidelines:3` only after server-side citation review.

Fictional checks for the existing selected-rule rehearsal:

| Sample profile | Expected selected-rule outcome | Limit |
|---|---|---|
| Landholding family; no income tax in the last assessment year; no listed registered professional practising | Possible match on selected checks | Other exclusions and current land-record rules remain unknown. |
| Landholding family; income tax paid in the last assessment year | Selected exclusion applies | Confirm family scope and current rule before use. |
| Landholding answer unknown; other selected answers negative | More information needed | Unknown must not be converted to false. |

## Contract and publication gate

Charchit confirmed in PR #5 that the team will retain the existing shared data fields. This review makes no shared-contract or server change. The current server loader reads `passages.json` directly and does not enforce `manifest.json` review status; disputed or candidate material must therefore remain outside passages until reviewed.

Next: verify and add enough distinct useful official documents to reach the 10–20 target; inspect reuse and current applicability; produce reproducible snapshots, extraction and source-backed rules. Investigate [PMUY FAQ](https://www.pmuy.gov.in/faq.html) and official PMFBY guidance as candidates only; both require a current applicability review. No Supabase schema or RLS change is currently justified by the agreed integration.

## NMMSS deadline recheck and PIB text snapshots (2026-10-31)

- The [1 October PIB extension notice](https://www.pib.gov.in/PressReleseDetailm.aspx?PRID=2317657&lang=1&reg=3) and [14 October PIB workshop release](https://www.pib.gov.in/PressReleseDetailm.aspx?PRID=2323830&lang=2&reg=48) both state 31 October 2026 as the NMMSS 2026–27 student application deadline. The NSP listing is inconsistent across page captures (dates include 31 October and 30 November; the opened page footer says last updated June 2026), and the 30 November result was not tied to NMMSS in a reproducible current listing. These captures do not resolve the scheme-specific deadline. Since the PIB deadline expires today, do not keep this date answerable after 31 October; refresh the NMMSS-specific NSP record and quarantine the passage until then. `nmms-2026-notice` is now `needs_review`, and its dated deadline passage was removed from `passages.json`.
- Added three quarantined full article-body text snapshots under `corpus/source-candidates/pib-shared/snapshots/`. Exact titles, issuing bodies, source URLs, publication/access dates, locators, local-only raw response hashes, committed text snapshot hashes and excerpt hashes are recorded in `candidate-records.json`. The committed snapshots were verified by `node corpus/source-candidates/pib-shared/verify_snapshots.mjs`. They are not yet approved answer sources: the PM-JAY releases do not contain full enrollment rules, and PMMVY condition/state conflicts remain unresolved.
- The canonical LF text snapshot hashes are: PM-JAY `5eda7a918ed1b043fdc88562a747607f75211e9160cad72d37bfa78f1ac1b236`; Ayushman Vay Vandana `151e5262740bec8060c46ca1c828f139509d1fbb4efa01de3fa627ccba54c85f`; PMMVY `6d2c6be8f05a99a8293882925a515df7bbc97f68fd8ddb67afdfcbc14642af42`. The extractor normalizes source line endings and the folder's `.gitattributes` preserves LF for cross-platform verification.
- Live GitHub state check: issue #2 remains open and assigned to Pulkit; PR #5 remains draft. Charchit's latest PR comment agrees to retain the existing shared data fields. No shared contract or Supabase migration changed.
- Count remains short of the 10–20 approved-document requirement. There are 2 manifest entries still marked `approved`; only 1 complete original source snapshot is committed and independently verified on this branch. The second PM-KISAN HTML item's old snapshot hash is unresolved; the newly extracted PIB text snapshots remain candidates. Do not report candidate URLs or the captain branch's unmerged sources as approved data-branch documents.
- Synchronized to `data/supabase` head `198a32f06e1f3be34f6aa6f09464abe3648bb482` and pushed the source work through `ebd0b89` using Pulkit's signed-in Windows account. The earlier sandbox account could not persist credentials to Windows `wincredman`. No force push or merge was attempted.
