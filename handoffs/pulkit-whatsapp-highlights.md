# Sourced WhatsApp result highlights

Contributor: Pulkit. Implemented 1 November 2026 and rebased onto captain commit `ceb94ac`.

Both the comparison and legacy single-scheme flows display up to two numbered-source bullets for benefits and important conditions. Text comes unchanged from existing bilingual pinned answer records; current approved passage, expiry and hash checks apply again before display. Rule citations stay grouped, and missing, altered or unavailable highlight evidence is omitted. Excluded results do not show benefit highlights.

Changed files: `server/result-evidence.mjs`, `server/result-evidence.test.mjs`, `server/scheme-comparison.mjs`, `server/scheme-comparison.test.mjs`, `server/whatsapp-flow.mjs`, `server/whatsapp-flow.test.mjs`, `docs/MULTI_SCHEME_AND_DAILY_REVIEW.md`, `docs/WHATSAPP_FLOW.md`, and this handoff. No source, matching rule, public API or shared schema changes.

Checks on Windows: `npm.cmd test` passed 145/145 after running under the normal Windows account; `npm.cmd run build` and `git diff --check` passed. A first full suite run in the restricted sandbox failed to start some localhost/storage tests and was interrupted; the normal-account run passed them. The new tests cover the six fictional scheme profiles in Hindi/English, matching each highlighted record to its numbered source, and withholding missing, altered or expired evidence.

Existing assistant-reviewed policy additions still need independent team review before public release. The changed messages have not been tested on a paired WhatsApp phone; no live bot was restarted for this change. Check for any newer captain commits before integration.
