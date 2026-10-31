# Captain branch source reconciliation

Contributor: Pulkit. Checked 2026-10-31 against `origin/captain/server-integration` commit `eda870d7ed4de872dd37a6c680247ad07de5afad`. This is a structural audit, not approval of eligibility rules or proof that all evidence is current.

## Inventory

The captain manifest lists ten `approved` sources and one `failed` source. The data-branch manifest lists three approved entries. These branch counts must not be added together: three document IDs overlap. The captain's reviewed set covers PM-KISAN, NMMSS, PMUY, PM Vishwakarma and PM-SYM; it does not yet establish complete coverage of women/child or health schemes.

| Captain document ID | Manifest status | Passage count | Date limit or review concern |
| --- | --- | ---: | --- |
| `pmkisan-guidelines` | approved | 12 | Historical 2020 rules; review later amendments. |
| `pmkisan-instalments-2026` | approved | 2 | Local HTML hash differs from captain's recorded snapshot. |
| `nmms-2026-notice` | approved | 7 | `valid_until` 2026-10-31; local HTML hash differs. |
| `pmuy-faq` | approved | 2 | Confirm current FAQ/version and full conditions. |
| `pmuy-new-connection` | approved | 2 | Current requirements and declaration scope need review. |
| `pmvishwakarma-scheme-booklet-2025` | approved | 2 | Check current operative guidelines and exceptions. |
| `pm-sym-ministry-note-2025` | approved | 3 | Confirm current pension exclusions and contribution terms. |
| `nsp-scholarships-2026` | approved | 1 | `valid_until` 2026-10-31; live listing, not full eligibility rules. |
| `pmkisan-home-2026` | approved | 2 | Mutable portal page; recheck current status. |
| `pmkisan-ekyc-methods` | approved | 1 | Source publication date not stated. |
| `pmuy-declaration-form-2026` | failed | 0 | Generic connection form; see `corpus/PILOT_CANDIDATES.md` for visual review and unknown issuer/effective date. |

## Snapshot comparison

At the cited captain commit, `git ls-tree -r --name-only origin/captain/server-integration corpus/docs corpus/source_snapshots` lists only `corpus/docs/pmkisan-guidelines.pdf`; other source snapshots are not tracked in those paths. Absence from Git does not show whether the captain has them privately. The local data checkout contains two ignored PIB HTML snapshots. Their SHA-256 values were compared directly with the captain manifest:

| Source | Local snapshot SHA-256 | Captain manifest SHA-256 | Result |
| --- | --- | --- | --- |
| PM-KISAN guideline PDF | `ae82cac83f61a5fa5049387a7c13e00c6d55cef0e9163deb5497dc86c86d697f` | `ae82cac83f61a5fa5049387a7c13e00c6d55cef0e9163deb5497dc86c86d697f` | Bytes match. |
| PM-KISAN PIB release | `3bac38a5cb46d5c9b5e870d73a2795d66cb9458e0ced808cf3fd079f9b756ca5` | `674d03739d492c3082744d4d9feb09dda034564567b97998e1625b3f5a2ecd4e` | Differ; article equivalence not established. |
| NMMSS PIB notice | `9c822fc3fa4c3301e65beacd66a3bada778e7ee58e151d810b3d1b0bc0d2e395` | `ea1c7097530e3ec5f84a7a7f4a572e99b8d6c1c57e0f28850867b05d56067105` | Differ; article equivalence not established. |

HTML markup may change between requests. Do not equate the versions on that basis alone: obtain the captain's exact snapshots where permitted, compare the article bodies and relevant passages, and rerun the agreed importer/review process. Do not change hashes or approve a new snapshot merely to make them match.

## Checks and remaining work

- Parsed the captain manifest and passages from commit `eda870d` with Python. The 34 listed passages have nonempty `text` and `locator` fields. This is a structural check, not a check of the locator against the source or passage truth.
- Recomputed the 34 passage digests in Node using the field order and JSON encoding in `server/corpus.mjs`; all match their manifest pins and their title, authority and snapshot-hash metadata. This verifies consistency with the pins, not that the original documents have been independently reviewed.
- Used Python `hashlib.sha256` on the three existing local snapshots. One matched the captain manifest; two did not.
- The 2026-10-31 NMMSS deadline entries must not be extended without a new official review. Obtain an up-to-date notice or replacement and check the release gate.
- Compare the remaining captain snapshot bytes and cited passages, agree the shared evidence/rule contract with Charchit, and keep unreviewed versions out of retrieval. This file does not change the manifest, passages or runtime.
