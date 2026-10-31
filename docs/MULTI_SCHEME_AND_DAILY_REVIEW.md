# Multiple schemes and daily official-source review

National schemes are the first scope requested by the user. The comparison experience serves Farmer, Student, Worker, Artisan and Family/other citizen. It uses the existing reviewed corpus, pinned facts and rule-evidence checks.

## WhatsApp use

1. Send `YOJANA START` and choose Hindi or English.
2. Send `YOJANA SCHEMES`, then choose one of the five roles.
3. Answer one condition at a time. The role orders the checks. Each scheme keeps its own answers, including conditions whose meaning differs between a family and an individual.
4. `1` means yes, `2` no, `3` back, `4` unsure and `5` cancel. A reported exclusion stops the remaining questions for that scheme. Skips stay unknown.
5. The final reply lists all available results, met/failed/unknown condition counts, missing questions and exact citations. `EDIT <question number>` corrects an answer, `NEXT` revisits a skip and `YOJANA START` restarts. `YOJANA CSC` opens the existing optional service-centre search.

The new command keeps the prior single-scheme and natural-profile journeys available. The comparison session stays in process memory and has not been connected to saved-profile alerts or SMS. It uses the same answer/recommendation service as WhatsApp and the HTTP API.

## Supported rules and ranking

PM-KISAN, PM-SYM and PMUY have reviewed preliminary matching conditions in this snapshot. All five roles can enter comparison. Farmers may also have worker or household needs, so those schemes are checked separately instead of inferring that farmer status satisfies another scheme. Students and artisans also receive an approved NMMSS or PM Vishwakarma information citation when available. Their dedicated eligibility rules still need review.

Results rank possible matches, then incomplete checks, then reported exclusions. Within a group the fraction of the selected reviewed conditions met orders the results. The output shows the counts and missing conditions. These describe evidence and answer coverage; they are not statistically calibrated probabilities of benefit approval. Missing or expired rule evidence removes a scheme from ranked results and reports it as unavailable.

The Agriculture Ministry's [30 July 2024 PIB overview](https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2039208&lang=2&reg=48) lists PM-KMY, PMFBY and other farming programmes. These are discovery leads. Current eligibility, exclusions, geographic/seasonal availability and application rules must be reviewed before adding their questionnaire rules. An older overview cannot establish that a current application window is open.

## API addition

The existing `POST /api/recommend` accepts an alternative `profiles` array with 1–10 distinct supported `scheme_id` objects and optional `language`. Example:

```json
{"language":"hi","profiles":[{"scheme_id":"pm-kisan","owns_cultivable_land":true},{"scheme_id":"pm-sym"},{"scheme_id":"pmuy"}]}
```

The response adds `condition_counts` per result, `unavailable_schemes`, `ranking_basis: reviewed_condition_coverage` and `official_decision: false`. The old single `profile` request and its response remain supported. Supplying both forms, duplicates or unsupported IDs is invalid. No corpus fact or eligibility outcome is taken from a model-generated probability.

## Daily cron job

The workflow `.github/workflows/source-monitor.yml` schedules `30 0 * * *` in UTC, which is **06:00 India time every day**. GitHub schedules may run late. It installs the existing ingestion requirements and runs:

```sh
python scripts/check_sources.py
```

Its registry covers all five roles using official PM-KISAN, PMFBY, PIB, scholarship, labour, artisan and PMUY pages, plus national discovery portals. It compares normalized extracted text and newly linked allowlisted scheme URLs against the previous observation. First run creates a baseline for review and does not label existing pages as newly launched schemes. Failed downloads retain the previous baseline. Empty or JavaScript-only extraction is marked failed and needs browser/manual review.

The report and review excerpts are under ignored `.runtime/source-monitor/report.json`; state is stored beside it. GitHub keeps the report as the `official-source-review` run artifact for 14 days and caches the small baseline for the next run. A cache miss starts a new baseline. No website snapshot, private profile, credential or WhatsApp message is uploaded by this job. It cannot approve or publish sources.

Scheduled workflows run from a repository's default branch. The team PR must reach that branch before this copy's daily schedule becomes active. A deployment copy can run the same workflow in the website repository, which the user owns. Successful fetching is observation, not a government endorsement or source approval. The configured seeds are a bounded discovery set, not exhaustive national coverage.

## Adding reviewed coverage

After a candidate is inspected, preserve the issuing authority, dates, URL, snapshot hash, readable passage and locator. Review applicable conditions/exclusions and bilingual wording. Publish through the existing importer, update rule pins and answer records, then add the scheme's question/rule definition and fictional match/exclusion/unknown cases. Build and phone-check the new journey before claiming coverage.
