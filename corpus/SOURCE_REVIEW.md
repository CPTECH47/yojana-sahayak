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

The existing `corpus/manifest.json` and `corpus/passages.json` are consumed by the current importer/server. No shared fields were changed in this review. Agree stable document IDs, source version/hash, publication and access dates, extraction/review status, locator, evidence IDs and rule expression/exception fields with Charchit before editing those contracts. Do not index or serve unreviewed material; the current server loader reads `passages.json` directly, so changing manifest status alone would not enforce this gate.

Next: validate the third source and at least 7 additional distinct useful official documents; inspect licensing/reuse and current applicability; produce reproducible snapshots, extraction and source-backed rules. Investigate [PMUY FAQ](https://www.pmuy.gov.in/faq.html) and official PMFBY guidance as candidates only; both require a current applicability review. No Supabase schema or RLS change is justified until the integration contract is agreed.
