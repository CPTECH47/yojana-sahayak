# Server takeover - 31 October 2026

User authorised Tejas's chat to take over pending server work after the captain's usage limit. Baseline is captain/server-integration at fe351b32d1474de0da73fdde9b296a4d4248ac91.

## Profile and conversation fixes

The profile extractor now checks personal role clauses, Hindi word boundaries, negation, third-person references and conflicting role statements. For example, `मेरे पिता किसान हैं, मैं बेरोजगार हूँ` requires clarification instead of proposing farmer/daily income. Personal earnings are separated from relatives' earnings and expenses. Quoted model claims are checked against the containing clause and conflicting descriptions. Null model output retains the literal fallback.

Monthly income cannot be filled from a missing amount. Going back from the income-period prompt preserves already-confirmed scheme facts. User confirmation and the existing numbered flow remain the normal entry points.

Changed implementation files are `server/profile-extract.mjs` and `server/whatsapp-flow.mjs`; regression cases are in `server/profile-extract.test.mjs`.

## Checks for this stage

- `npm.cmd test` passed 87/87, including deterministic and mocked services.
- `npm.cmd run build` passed.
- Python importer tests passed 4/4 after installing requirements into ignored `.runtime/ingest-deps`. The first attempt using system Python failed because truststore was missing; no test failure was hidden.
- `npm.cmd run check:release` reported 10 usable documents and 12 answer records at 2026-10-31T15:14:42Z. This is a date-dependent automated gate, not an independent full source review.
- `git diff --check` passed.

Live Qwen extraction, actual Sarvam/Whisper audio, WhatsApp delivery and handset source-link opening have not been retested here. The captain's existing handoff requests manual phone checks. Use fictional profiles and record the deployed revision before testing. Literal extraction is deliberately bounded and may ask users to rephrase unsupported constructions.

## Follow-on request

The user requested national-scheme matching across multiple schemes and a daily official-source discovery job for all five roles. The extension adds `YOJANA SCHEMES`, shared question definitions, a ranked multi-profile form of `/api/recommend`, a discovery registry, source-observation script and daily GitHub workflow. Newly discovered information must be reviewed before it enters the answer corpus or eligibility rules. See `docs/MULTI_SCHEME_AND_DAILY_REVIEW.md` for contracts and source-review steps.

The final matching layer evaluates six pinned national schemes: PM-KISAN, PM-KMY, NMMSS fresh-Class-IX selection, PM-SYM, PM Vishwakarma and PMUY. This supersedes the earlier three-rule implementation. Result counts describe selected conditions met/failed/unknown rather than approval probabilities. Three additional official policy pages were fetched, hashed and compared against the cited sections; the manifest explicitly records assistant review and requires independent team review before release.

## Expanded-flow validation

- Final full JavaScript suite passed 100/100; Python importer/monitor suite passed 7/7. Build and whitespace check passed. Earlier 87/93 counts describe intermediate revisions only.
- Real localhost HTTP smoke passed for ranked multi-profile recommendations (200), invalid schemes (400), a Hindi cited extractive answer with the model deliberately unavailable, and unsupported-scheme refusal. This did not exercise a real LLM.
- All five roles reached comparison through the normal conversation entry point in tests. Hindi controls, early exclusion, correction, BACK, skipped conditions and unavailable evidence are covered.
- A real source-observation run inspected nine configured seeds, then the added current-PIB-releases seed. Seven produced readable baselines for review. PMFBY downloads, NSP scholarship listing and the Labour homepage returned no usable extracted text and were marked `extraction_failed`. No approved source or rule was changed.
- The daily workflow schedules `30 0 * * *`, or 06:00 India time. It is active on main in `tejaspant09/yojana-sahayak-website`. The first cloud run completed its monitor tests and uploaded its report: https://github.com/tejaspant09/yojana-sahayak-website/actions/runs/41215272115 . It ended in failure because PM-KISAN raised SSLError and PM Vishwakarma timed out from the GitHub runner. Five other seeds gave readable baselines; the three locally unreadable seeds remained extraction failures. The report artifact and baseline cache were saved. This is a working schedule/report path with unresolved upstream access, not a claim that every source was checked successfully. The team-repository schedule starts after reaching its default branch.

No live WhatsApp process was replaced or restarted. Manual phone checks must identify the deployed revision, then test Hindi/English, the default role menu and `YOJANA SCHEMES`, every role, missing/failed conditions, correction and source/CSC links. Confirm speech accuracy separately. The final comparison supports explicit SAVE and RESUME using the existing encrypted store and separate alert consent. It remains disconnected from SMS. Experimental test delivery is still off by default.

## Final five-role extension

The Baileys entry point enables multi-scheme comparison by default; `YOJANA_MULTI_SCHEME=0` preserves the earlier route. The conversation library keeps its compatibility default and tests explicitly cover the enabled entry point. Role-specific questions cover NMMSS, PM Vishwakarma and PM-KMY, preserving repaid MUDRA/PM SVANidhi exceptions and the separate NMMSS fresh-selection scope. RESULTS shows partial counts; factual questions do not consume answers. Six fictional profiles exercise positive, opposite-answer and unknown cases. No new speech controls, large model download or cloud dependency was added.

Changed files across the PR: `.env.example`, `PROJECT_BRIEF.md`, `.github/workflows/source-monitor.yml`; `corpus/{manifest,passages,answer-records,rule-evidence-lock,discovery-registry}.json`; `server/{profile-extract,whatsapp-flow,whatsapp-prototype,answer-service,corpus,scheme-questions,scheme-comparison,additional-scheme-rules}.mjs`; `server/{profile-extract,scheme-comparison,national-coverage,catalog,corpus}.test.mjs`; `server/fixtures/national-profiles.json`; `scripts/{ingest_sources,check_sources,test_check_sources}.py`; `docs/{MULTI_SCHEME_AND_DAILY_REVIEW,NATIONAL_ROLE_COVERAGE,SOURCE_GOVERNANCE}.md`; and this handoff. No `supabase/` or client implementation edits.

Final commands/results:

- `npm.cmd test`: 100 passed, 0 failed.
- `npm.cmd run build`: passed.
- Python unittest discovery with `.runtime/ingest-deps` prepended to sys.path: 7 passed. The private isolated requirements install is necessary on this laptop; system Python initially lacked truststore.
- `npm.cmd run check:release`: 13 usable documents, 18 pinned answer records, 6 schemes, gate passed at 2026-10-31T15:52:28Z. This does not verify phone/model operation.
- `node .runtime/http-national.mjs`: actual local HTTP returned six ranked cited results (200), rejected invalid language/both-profile requests (400), answered three Hindi policy questions with explicitly offline-model extractive fallback, and refused an unsupported scheme.
- Daily observer checked 13 seeds: 5 unchanged, 2 changed needing review, 3 new baselines needing review, 3 extraction failures; no local fetch failures. It did not change approved corpus. The earlier cloud run's upstream certificate/timeout failures remain unresolved.
- `git diff --check`: passed. Private snapshots/reviewer inputs and runtime test files are ignored.

Contract changes: six scheme IDs now work for single/bulk recommendations; added schemes carry localized `scope_note`. Bulk requests reject both profile forms, duplicate/unsupported IDs and unsupported languages. Exact fields, evidence hashes, dates, provenance and limitations are in `docs/NATIONAL_ROLE_COVERAGE.md`. The website deployment keeps its older approved catalogue until a separately reviewed export; its daily discovery registry can be updated independently.

Pending: independent team review of the three policy additions, manual phone/audio/source-opening checks after checkout/restart, additional schemes including PMFBY/state/season-specific rules, live SMS integration, and upstream cloud access failures. Do not interpret passing selected checks as an open application window, confirmed benefit or probability of approval. The new policy sources expire for re-review on 30 November; original disputed NMMSS calendar facts remain withheld.

## Continued monitor and local runtime checks

`scripts/check_sources.py` now retries temporary connection/time-out and 429/5xx errors once, preserves certificate verification, and writes a readable escaped Actions coverage summary with `--summary`. Certificate failures do not retry. The workflow uses Windows/native truststore and OS-specific cache keys. `scripts/test_check_sources.py` adds retry, certificate-refusal and partial-summary tests. The Python suite passed 10/10; no JavaScript implementation changed in this follow-up.

The published Windows workflow was actually executed: https://github.com/tejaspant09/yojana-sahayak-website/actions/runs/41218502839 . Six monitor tests passed, summary/report/cache were produced, and PM-KISAN fetched successfully with TLS verification. This resolves the earlier Ubuntu PM-KISAN certificate problem for the active scheduled runner. Nine seeds produced readable baselines. NSP returned ConnectionError, PM Vishwakarma returned ConnectTimeout, and PMFBY/Labour remained extraction_failed; the job stayed failed for partial transport coverage. This supersedes the earlier cloud coverage counts above and does not establish universal access.

An actual native-fetch localhost API check, with no mocked model and no outbound messages, returned health 200, readiness 503/model_available false, and an answered Hindi PM-KMY question with mode extractive and one real pinned citation. No Ollama command, model inventory or port 11434 listener is available on this laptop. Full model-selected and handset checks still require the configured model machine and consenting paired phone; no large model download or live bot replacement was performed. Runtime test scripts and cloud artifacts remain ignored.
