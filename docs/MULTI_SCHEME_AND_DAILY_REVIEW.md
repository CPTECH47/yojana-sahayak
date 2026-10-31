# Multiple schemes and daily official-source review

National schemes are the first scope requested by the user. The comparison experience serves Farmer, Student, Worker, Artisan and Family/other citizen. It uses the existing reviewed corpus, pinned facts and rule-evidence checks.

## WhatsApp use

1. Send `YOJANA START` and choose Hindi or English.
2. Choose one of the five roles. The Baileys entry point enables multi-scheme comparison by default (`YOJANA_MULTI_SCHEME=1`). `YOJANA SCHEMES` also opens it explicitly; `YOJANA_MULTI_SCHEME=0` retains the earlier single-scheme menu route.
3. Answer one condition at a time. The role orders the checks. Each scheme keeps its own answers, including conditions whose meaning differs between a family and an individual.
4. `1` means yes, `2` no, `3` back, `4` unsure and `5` cancel. A reported exclusion stops the remaining questions for that scheme. Skips stay unknown.
5. `RESULTS` shows the current comparison without answering every remaining question. Results list met/failed/unknown counts, missing questions and exact citations. `EDIT <question number>` corrects an answer, `NEXT` revisits a skip or continues, and `YOJANA START` restarts. Ask a source-backed question at any turn without consuming an answer. `YOJANA CSC` opens the existing optional service-centre search.

Without SAVE, comparison answers stay in process memory. After viewing results, SAVE explicitly consents to 30-day retention in the existing encrypted local store; RESUME restores the comparison and rechecks evidence. ALERTS ON is separate consent, STOP disables alerts and DELETE erases retained profiles. Existing reviewed-update checks can evaluate the saved scheme profiles; experimental delivery remains disabled by default. SMS has not been connected to this journey. Text descriptions still require confirmation; the multi-scheme route asks its own rule questions rather than automatically copying extracted facts across schemes.

## Supported rules and ranking

Six national schemes have pinned preliminary matching conditions: PM-KISAN, PM-KMY, NMMSS, PM-SYM, PM Vishwakarma and PMUY. Farmers start with PM-KISAN and PM-KMY; students start with fresh-Class-IX NMMSS; workers with PM-SYM; artisans with PM Vishwakarma; families with PMUY. Further worker, household or landholding checks are separate and do not infer eligibility from occupation. NMMSS renewal and test-entry assessment are outside this initial check. See [NATIONAL_ROLE_COVERAGE.md](NATIONAL_ROLE_COVERAGE.md) for source checks and API fields.

Results rank possible matches, then incomplete checks, then reported exclusions. Within a group the fraction of the selected reviewed conditions met orders the results. The output shows the counts and missing conditions. These describe evidence and answer coverage; they are not statistically calibrated probabilities of benefit approval. Missing or expired rule evidence removes a scheme from ranked results and reports it as unavailable.

The Agriculture Ministry's [30 July 2024 PIB overview](https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2039208&lang=2&reg=48) lists further farming programmes. PM-KMY now uses a separately checked September 2026 ministry backgrounder. PMFBY remains discovery-only: geographic/seasonal availability and current rules must be reviewed before adding matching. A policy overview cannot establish an open application window.

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

The workflow uses a Windows runner with native truststore verification, matching this laptop's working fetch environment. Cache keys include the runner OS. Temporary connection/time-out or 429/5xx failures receive one retry; certificate errors do not. `--summary <path>` appends an escaped, readable coverage table; the workflow passes GitHub's step-summary file. Fetch failures still fail the job, while report upload and baseline preservation run afterward.

The tested Windows run fetched PM-KISAN successfully without disabling TLS: [run 41218502839](https://github.com/tejaspant09/yojana-sahayak-website/actions/runs/41218502839). Nine of thirteen seeds were readable. NSP had a connection error, the PM Vishwakarma portal timed out, and PMFBY/Labour returned no usable extracted text. Policy documents for students and artisans remained readable. These are partial observations, not complete source coverage.

Scheduled workflows run from a repository's default branch. The team PR must reach that branch before this copy's daily schedule becomes active. A deployment copy can run the same workflow in the website repository, which the user owns. Successful fetching is observation, not a government endorsement or source approval. The configured seeds are a bounded discovery set, not exhaustive national coverage.

## Adding reviewed coverage

After a candidate is inspected, preserve the issuing authority, dates, URL, snapshot hash, readable passage and locator. Review applicable conditions/exclusions and bilingual wording. Publish through the existing importer, update rule pins and answer records, then add the scheme's question/rule definition and fictional match/exclusion/unknown cases. Build and phone-check the new journey before claiming coverage.
