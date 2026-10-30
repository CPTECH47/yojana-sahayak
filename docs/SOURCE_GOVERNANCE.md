# Source review and change-detection policy

## Evidence layer and discovery layer

The answer service uses reviewed, versioned official documents as its trusted evidence layer. myScheme, India.gov.in and data.gov.in can help discover schemes, official pages and changes; portal listings alone do not become answer evidence or establish eligibility. One scheme may need several documents (for example, current guidelines, an amendment, an FAQ, and a state or season notice), so the 10–20 target counts actual documents, not schemes or URLs.

For each candidate, preserve the source bytes or a stable snapshot and record its issuing body, exact URL, publication date if stated, access date, SHA-256, extraction result and page/section locator. Record human-reviewed eligibility conditions, exclusions and unresolved applicability. Keep fictional test profiles separate from source facts.

## Review states

Use these manifest states:

- `discovered`: URL found, not downloaded
- `downloaded`: source snapshot saved and hashed
- `extracted`: readable text and locators produced
- `needs_review`: content or rules await human review
- `approved`: reviewed and allowed into retrieval
- `superseded`: older approved version retained for history, excluded from retrieval
- `failed`: fetch or extraction failed; not usable evidence

The answer service must retrieve passages only from documents with `status: approved`. Candidate material must not silently enter the answer index.

## Change monitoring (planned, not currently running)

- Check high-priority official source pages about every 30 minutes and lower-priority discovery pages daily, when an updater is implemented.
- Use ETag/Last-Modified when supplied and a content hash fallback. A layout-only or transient fetch change should create a candidate for comparison, not erase the last approved snapshot.
- Save new versions as candidates, compare extracted text with the last version, and identify changed rule passages for human review.
- Recheck deadlines or application status against the official portal when asked; clearly date the result and tell applicants to verify before acting.
- Never auto-approve or automatically replace eligibility rules. Approval requires review of the relevant passage, authority, effective date, scope and conflicts.

## Current state

The pilot has three approved document IDs. It does not yet include a scheduled updater, automatic change notifications, snapshot version history, or a complete 10–20 document corpus. The manifest gate is enforced by `server/corpus.mjs`; verify any future import before a document is marked approved.
