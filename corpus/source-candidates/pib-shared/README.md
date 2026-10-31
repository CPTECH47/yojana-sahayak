# PIB source snapshots for PM-JAY and PMMVY review

Contributor: Pulkit. Checked 2026-10-31. These three documents remain **quarantined**: the source passages are readable and the text snapshots are committed, but scheme-level review and runtime approval are still pending. They add zero to the approved manifest count.

Each `snapshots/*.txt` file contains the complete extracted article body, with publication text and paragraph breaks. The exact original HTML responses were checked locally but are not stored in Git because they include website markup/assets. Their byte counts and SHA-256 hashes are recorded in `candidate-records.json`; the clean text snapshot has its own byte count and SHA-256. A reviewer can verify the committed text snapshots offline with:

```powershell
node corpus/source-candidates/pib-shared/verify_snapshots.mjs
```

The [PIB copyright policy](https://www.pib.gov.in/content/132_2_Copyright-Policy.aspx?lang=1&reg=1) permits accurate attributed reproduction of PIB material and excludes third-party material. The stored snapshots contain the article text only, not photographs or unrelated page assets. A local extraction script is provided for reviewers who have the original response files; it verifies each raw response hash before extracting the article body. A changed response is a failed check, not permission to update the snapshot automatically.

## Documents

| Exact title | Issuing body | Published | Locator and reviewed scope |
|---|---|---|---|
| Cabinet approves health coverage to all senior citizens of the age 70 years and above irrespective of income under Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (AB PM-JAY) | Government of India Cabinet / Press Information Bureau | 2024-09-11 | Opening paragraphs; the 70+ route and its stated income scope only. Not a complete current enrollment guide. |
| Advancing Universal and Inclusive Senior Care: Ayushman Vay Vandana Marks Two Years of Transforming Healthcare for Elderly Citizens | Ministry of Health and Family Welfare / Press Information Bureau | 2026-10-29 | Opening paragraphs; 70+ coverage summary only. Not a full set of scheme conditions. |
| Pradhan Mantri Matru Vandana Yojana Strengthens Maternal Health and Early Childhood Care | Ministry of Women and Child Development / Press Information Bureau | 2026-06-09 | Opening paragraphs; stated benefit summary only. ANC and state-coverage conflicts remain unresolved elsewhere in the audit. |

The press release source URLs, raw-response hashes, article snapshot hashes, access dates, and excerpt hashes are in `candidate-records.json`. Candidate excerpts under this directory are discovery/evidence notes, not approved answer passages. Do not infer complete PM-JAY or PMMVY eligibility from these releases.
