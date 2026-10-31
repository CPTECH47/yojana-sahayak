# Source review and change-detection policy

## Evidence layer and discovery layer

The answer service uses reviewed, versioned official documents as its trusted evidence layer. myScheme, India.gov.in and data.gov.in can help discover schemes, official pages and changes; portal listings alone do not become answer evidence or establish eligibility. One scheme may need several documents (for example, current guidelines, an amendment, an FAQ, and a state or season notice), so the 10–20 target counts actual documents, not schemes or URLs.

For each candidate, keep a local source snapshot where permitted and record its issuing body, exact URL, publication date if stated, access date, SHA-256, extraction result and page/section locator. Do not commit full web pages or documents when their terms reserve reproduction rights; store concise original summaries and metadata instead. Record human-reviewed eligibility conditions, exclusions and unresolved applicability. Keep fictional test profiles separate from source facts.

## Review states

Use these manifest states:

- `discovered`: URL found, not downloaded
- `downloaded`: source snapshot saved and hashed
- `extracted`: readable text and locators produced
- `needs_review`: content or rules await human review
- `approved`: reviewed and allowed into retrieval
- `superseded`: older approved version retained for history, excluded from retrieval
- `failed`: fetch or extraction failed; not usable evidence

The answer service must retrieve passages only from documents with `status: approved`. Candidate material must not silently enter the answer index. A source with `valid_until` is removed automatically after that date and must be rechecked before it can answer again.

On the repair branch, manifest passage_hashes bind passage content and metadata to the reviewed snapshot. Expiry is evaluated in Asia/Kolkata. The importer writes candidates only until a reviewer explicitly publishes concise passages. Updated rules and bilingual answer records require separate pin review. See docs/HARDENING.md for the exact fetch/review/publish procedure and current release gate.

## Twelve-hour source monitoring

- The running WhatsApp process starts a scan when due and repeats it every 12 hours. `npm.cmd run sources:update` runs one scan. Install the pinned Python packages in `requirements-ingest.txt` and set `YOJANA_PYTHON` if `python` is not the desired interpreter. The timer does not run while the host process is stopped.
- `scripts/source_updater.py` checks approved official URLs for hash changes and follows relevant links from a bounded set of official discovery pages. Seeds are a starting set, not comprehensive coverage of myScheme, India.gov.in or every ministry. A source that is absent from these pages will not be discovered automatically.
- The updater writes immutable snapshots and `needs_review` records under ignored `.runtime/source-discovery/`. It does not modify `corpus/manifest.json`, `corpus/passages.json`, rule pins or answer records. It deduplicates by URL, raw snapshot hash and extracted text hash so layout-only HTML changes do not repeatedly create candidates. Changed pages remain candidates; the previous approved snapshot is preserved.
- The bot may show a new official page as an explicitly labelled *under-review information lead*, with its official URL. It may not answer factual eligibility, benefits, document or application questions from the candidate. Approval still requires source, date, passage, rule and conflict review.
- Recheck deadlines or application status against the official portal when asked; clearly date the result and tell applicants to verify before acting.
- Never auto-approve or automatically replace eligibility rules. Approval requires review of the relevant passage, authority, effective date, scope and conflicts.

## Current state

The current snapshot has ten reviewed official documents/pages across PM-KISAN, NMMSS, PMUY, PM Vishwakarma and PM-SYM. The NMMSS application-calendar sources expire after 2026-10-31. The linked PMUY declaration PDF was excluded because text extraction returned no readable text. A 12-hour scanner now prepares local candidates while the WhatsApp host runs; there is still no automatic approval, complete scheme feed, or full published snapshot version history. The manifest approval/expiry gate is enforced by `server/corpus.mjs`.

## Discovery sources supplied for the project

- [myScheme](https://www.myscheme.gov.in/) helps discover schemes and related official pages using citizen details.
- [India.gov.in scheme directory](https://www.india.gov.in/my-government/schemes) helps discover scheme pages by ministry/category.
- [data.gov.in](https://www.data.gov.in/) helps discover datasets. A dataset is not eligibility guidance; check its publisher, update date, and methodology before using it.

These portals may alert the team to new or changed material. The chatbot must cite the issuing ministry/programme source for an answer. A portal summary alone cannot approve a rule or establish personal eligibility.
