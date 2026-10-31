# Website audit for Charchit and Pulkit

Reviewed on 31 October 2026 (Asia/Kolkata). Baseline: `captain/server-integration` commit `483f8225baae185e88322bdf995acf278b41a99b`, served locally at `http://127.0.0.1:3000/`.

Scope: the full website entry point, frontend component and stylesheet, public catalogue route, approved-record filtering, source metadata, WhatsApp links, CSC links and static-file routing. This is an audit handoff, with no production UI, server or corpus edits.

## Highest-priority findings

### F01 — P1: NMMSS snapshot disagrees with the current cited portal

- The website API currently serves two NMMSS records. `nsp-scholarships-2026:1` says student applications end on 31 October 2026. The adjacent ministry notice also describes that older deadline.
- A live check of the [official NSP listing](https://scholarships.gov.in/All-Scholarships), under Department of School Education & Literacy / National Means Cum Merit Scholarship, now lists student applications through **15 November 2026**. Institute verification is listed through 30 November and district/state/ministry verification through 15 December. These are observations for source review, not newly approved application advice.
- This discrepancy was independently observed through web extraction and a direct HTTPS GET of the portal's NMMSS block. HTTP 200 alone was not used to establish the dates.
- Code/evidence: `corpus/answer-records.json`, records `nmms-2026-notice:1` and `nsp-scholarships-2026:1`; `corpus/manifest.json`; `client/scheme-site.jsx:27`.
- Impact: a student can see a superseded deadline even while the source remains approved and within its configured validity day. English presents the old extension as current; Hindi explicitly describes a dated announcement, but still does not show the latest listing.
- Owner/action: Pulkit re-fetches and reviews the changed official source; Charchit integrates the approved new snapshot, passages and record pins. Until reviewed, suppress or clearly flag the disputed deadline. Do not merely extend `valid_until` or substitute an unreviewed date.
- Acceptance: the reviewed current listing and displayed dates agree in both languages, and the historical notice is explicitly labelled historical or removed from current application guidance.

### F02 — P1: an already open page never revalidates withdrawn or expired facts

- `client/scheme-site.jsx:23` fetches once with an empty dependency list. No timer, visibility refresh or record expiry check exists.
- `server/index.js:43` exposes only source title, locator and URL; the browser receives no `verified_at`, `valid_until` or catalogue version. The API response also has no explicit Cache-Control policy.
- Reproduction: open the site before a source expires and leave it open, or remove approval while the page remains open. Its React catalogue remains the old object until a full reload.
- Date-controlled API probe: 31 October -> 14 records, including 2 NMMSS records; 1 November -> 12 records, including 0 NMMSS records. The server gate works for a fresh request. The client never makes that fresh request on its own. Date change was injected into the local source loader; no system clock or corpus dates were changed.
- Action: return freshness/version metadata, revalidate on return to the page and at relevant expiries, remove stale facts while revalidation fails, and choose explicit HTTP caching rules. Approval withdrawal also needs a bounded refresh interval.
- Acceptance: expiry/withdrawal removes the displayed fact without a manual reload; a failed refresh does not silently retain it as current.

## Other actionable findings

### F03 — P2: catalogue failures have no recovery path

- `client/scheme-site.jsx:23,27`: the fetch has no timeout, no retry control and no online/reconnect retry. A stalled response can leave Loading indefinitely; an error leaves only a later-try message. Official scheme-source links disappear with the catalogue.
- Reproduce with a delayed, rejected or 503 `/api/catalog` response. This outcome follows directly from the fetch/render branches; browser network injection was unavailable during this audit.
- Add a bounded request timeout, a localized retry button and trusted official-portal fallback links. Validate `records` as an array before calling `.filter()` so an unexpected JSON shape does not blank the page.
- Acceptance: delayed/failed/malformed responses produce an actionable localized state, with no invented scheme facts.

### F04 — P2: no-evidence cards instruct users to visit a portal without providing its link

- The empty-corpus HTTP fixture returns 5 scheme names and 0 records. The frontend still renders its five hard-coded rows; each expanded row contains `c.missing` only. That message says to check the official portal, but there is no portal link in that branch (`client/scheme-site.jsx:27`).
- After the configured NMMSS expiry, that row has the same dead end. The `<noscript>` links in `index.html` do not help a normal JavaScript-enabled user.
- Add approved portal metadata and a clearly labelled information-unavailable fallback link, without implying applications are open or the user is eligible.

### F05 — P2: language choice is lost and Hindi translation is incomplete

- `client/scheme-site.jsx:21` initializes English on every load. Refreshing or returning to a newly opened page loses a Hindi selection. No URL or stored language preference is read.
- Scheme names in `info` have only English names, including the long scholarship title. `Back to top`, `Main navigation` and `Language` remain English when the document language switches to Hindi. Source titles/locators are also English; retain those exact citation titles but add understandable Hindi labels where needed.
- Preserve the language preference; translate site controls and scheme display names while retaining familiar acronyms and exact official citation metadata. Validate the Hindi application guidance too: the PMUY English record mentions distributor/online routes while its Hindi record currently lists documents without those routes.

### F06 — P2: the scheme-to-WhatsApp handoff drops the selected context

- Every WhatsApp CTA uses the single constant at `client/scheme-site.jsx:5`: `YOJANA START`. Choosing a scheme or Hindi does not alter it. Expanded scheme details have no scheme-specific ask action.
- The How it works wording implies choosing a scheme then asking about it, but the site does not pass that choice to the bot. This is code-confirmed; no WhatsApp message was sent in this audit.
- Agree the supported handoff command with Charchit before adding it. Either preserve language/scheme through a tested command, or state clearly that users must choose them again in WhatsApp. Add an obvious action within the chosen scheme if that is the intended journey.

### F07 — P3: PDF links do not open the cited page

- `client/scheme-site.jsx:27` uses the raw source URL for every citation. The catalogue contains PM-SYM citations for PDF pages 3 and 4 and MSME citations for PDF pages 36-37, but their URLs contain no page fragment.
- Users must navigate a long document manually. Add a reviewed numeric PDF page target (actual PDF page, not printed page) and a supported `#page=` fragment; keep the readable locator and the original URL available. Actual viewer behavior remains a manual check.

### F08 — P3: missing assets return the SPA HTML with HTTP 200

- HTTP reproduction: `GET /assets/audit-missing.js` -> `200`, `Content-Type: text/html; charset=utf-8`.
- `server/index.js:110-115` sends `index.html` for every non-API miss. Missing script/style requests should be real 404s; returning HTML causes a browser MIME/module error and masks the missing resource in monitoring.
- Restrict the SPA fallback to application navigation routes and return 404 for missing assets. Test a stale deployment chunk request as well as a normal page route.

## Coverage and rollout decisions

- New schemes do not appear automatically. The UI loops over `Object.entries(info)` instead of the API's `schemes` array (`client/scheme-site.jsx:6,27`). Even a newly reviewed backend scheme needs a frontend metadata change. Use an agreed catalogue metadata contract if automatic reviewed-scheme expansion is required. This is a coverage gap, not a claim that the present five-scheme pilot promises universal coverage.
- The demo WhatsApp destination is hard-coded in both `client/scheme-site.jsx:5` and `index.html:12`. Use one configured, approved public-demo destination and verify that both JS and no-JS links agree before deployment. This review does not establish whether a dedicated public number or owner consent has been arranged.
- The CSS downloads three Google font families. Fallback fonts exist, so a font outage is not proven to break the page. Actual slow-network/Hindi font rendering still needs a visual check; consider local fonts for the rural connectivity target.

## Checks and evidence

Reproduce the local API/date/empty-corpus/asset probes with `node scripts/qa/website-audit.mjs` after installing the repository dependencies and building the website. The diagnostic prints observations; a successful script exit is not an assertion that the reported defects are fixed. It binds only ephemeral localhost ports and edits no source approvals or dates.

| Check | Observation |
| --- | --- |
| `npm.cmd test` at 483f822 | 41/41 passed, including catalogue, source gates, questionnaire and voice unit tests |
| Production build | Passed when starting this exact preview; audit made no runtime source changes |
| `GET /api/catalog` | 200, 5 scheme descriptors, 14 records, no explicit Cache-Control |
| Catalogue with zero available passages | 5 scheme descriptors, 0 records |
| Controlled 31 Oct / 1 Nov API requests | NMMSS record count 2 / 0; total record count 14 / 12 |
| `GET /assets/audit-missing.js` | 200 HTML, should be an asset 404 |
| Eight distinct cited source URLs and both CSC URLs | All ten returned HTTP 200; PDF endpoints advertised application/pdf |
| Live NSP content | NMMSS deadline differs from the stored website record; see F01 |

The ten successful link requests covered PM-KISAN home/eKYC PDF, PMUY FAQ/new-connection page, the Labour PDF, MSME booklet PDF, PIB release, NSP listing, `https://locator.csccloud.in/` and `https://findmycsc.nic.in/csc/`. A successful GET does not prove a CSC service works, a map lookup succeeds, or every scheme fact is current. Only the NSP date discrepancy and PMUY page structure received an additional content check in this audit; the other scheme rules were not re-approved.

## Explicit limits

- Full frontend source, stylesheet and index markup were reviewed. Mobile layout, zoom, keyboard/screen-reader behavior and visual contrast were NOT verified in a working browser session. The in-app browser repeatedly returned `browser.user is unavailable`; the native Chrome fallback could not obtain a stable active window. No screenshots or visual-pass claims are included.
- Site client error/timeout/refresh cases are code findings, not claimed injected-browser test runs. API/date/empty-source/static-asset observations were executed against local servers.
- No live WhatsApp sends, delivery tests, login or pairing, real-model benchmark, voice recording, CSC form submission or public deployment occurred.
- No personal chat screenshots, account credentials, private identifiers or beneficiary data are included. The local 401 observed earlier applies to that local attempted session and is not evidence that the user's currently responding bot is offline.

## Suggested handoff

- **Charchit:** prioritize F01 with Pulkit and F02, then agree F03-F06 fixes and the WhatsApp handoff contract. Keep experimental voice status separate from website readiness.
- **Pulkit:** review and publish the updated official NMMSS evidence through source governance; preserve historical provenance rather than changing expiry alone.
- **Tejas/Mansi:** after fixes, perform the actual mobile, Hindi/English, failure-state, citation-page and consenting WhatsApp checks on the agreed running commit. Record exact observed output and remaining failures in issue #4.

This handoff reports defects and review gaps; it does not mark the site or Tejas's real-device QA complete.
