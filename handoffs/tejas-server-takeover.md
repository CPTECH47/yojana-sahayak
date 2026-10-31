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

The user requested national-scheme matching across multiple schemes and a daily official-source discovery job. This extension is being developed separately from the profile-fix commit. Newly discovered information must be reviewed before it enters the answer corpus or eligibility rules.
