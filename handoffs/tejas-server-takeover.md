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

The matching layer currently evaluates reviewed PM-KISAN, PM-SYM and PMUY conditions. Student and artisan journeys also surface approved NMMSS or PM Vishwakarma information citations when available. Their dedicated matching rules and newly researched farmer programmes are pending review. Result counts describe selected conditions met/failed/unknown rather than approval probabilities.

## Expanded-flow validation

- Full JavaScript suite passed 93/93; Python importer/monitor suite passed 7/7. Build and whitespace check passed.
- Real localhost HTTP smoke passed for ranked multi-profile recommendations (200), invalid schemes (400), a Hindi cited extractive answer with the model deliberately unavailable, and unsupported-scheme refusal. This did not exercise a real LLM.
- All five roles reached comparison through the normal conversation entry point in tests. Hindi controls, early exclusion, correction, BACK, skipped conditions and unavailable evidence are covered.
- A real source-observation run inspected nine configured seeds, then the added current-PIB-releases seed. Seven produced readable baselines for review. PMFBY downloads, NSP scholarship listing and the Labour homepage returned no usable extracted text and were marked `extraction_failed`. No approved source or rule was changed.
- The daily workflow schedules `30 0 * * *`, or 06:00 India time. It is active on main in `tejaspant09/yojana-sahayak-website`. The first cloud run completed its monitor tests and uploaded its report: https://github.com/tejaspant09/yojana-sahayak-website/actions/runs/41215272115 . It ended in failure because PM-KISAN raised SSLError and PM Vishwakarma timed out from the GitHub runner. Five other seeds gave readable baselines; the three locally unreadable seeds remained extraction failures. The report artifact and baseline cache were saved. This is a working schedule/report path with unresolved upstream access, not a claim that every source was checked successfully. The team-repository schedule starts after reaching its default branch.

No live WhatsApp process was replaced or restarted. Manual phone checks must identify the deployed revision, then test Hindi/English, `YOJANA SCHEMES`, every role, missing/failed conditions, correction and source/CSC links. Confirm speech accuracy separately. Comparison state is session-only and is not wired to stored profiles or SMS delivery.
