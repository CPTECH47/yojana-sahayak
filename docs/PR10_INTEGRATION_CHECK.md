# PR #10 source-monitor integration check

Checked locally on 31 October 2026 during captain-branch integration. This check covers the source observers; it does not verify WhatsApp delivery or approve scheme rules.

## Verified

- `python -m unittest discover -s scripts -p 'test_*.py'`: **13/13 passed** after the integration correction below. The intentionally invalid PDF fixture prints a parser warning; the test suite completes successfully.
- `scripts/check_sources.py` reads `corpus/discovery-registry.json`, stages a report and text-hash baselines under ignored `.runtime/source-monitor/`, and never writes approved corpus/rule files. Its retry handles transient transport errors, not TLS verification errors.
- `.github/workflows/source-monitor.yml` schedules the observer for 00:30 UTC, which is 06:00 India time, and permits manual dispatch. Scheduling in this repository requires the workflow to reach the default branch. Report upload and state caching run after an observation failure.
- `server/source-update-runner.mjs` invokes `scripts/source_updater.py` when due and every 12 hours while the WhatsApp process remains alive. The updater keeps immutable raw snapshots, extracted-text hashes and an unapproved candidate index under ignored `.runtime/source-discovery/`. The daily observer uses a separate directory, so their state files do not collide.
- Neither observer automatically publishes eligibility rules or marks candidate sources approved. Source-fetch failure preserves the last approved evidence.

## Remaining limits

- Integration correction: known approved URLs now use the importer's exact host policy, including Labour, MSME and NSP. New-link discovery keeps the narrower PIB/PMUY/PM-KISAN policy. A new test verifies that an approved Labour page is checked while an unreviewed Labour link is not followed. Coverage remains bounded to configured approved URLs and seed links.
- The cloud daily report is not automatically imported into the local bot's candidate index. The local bot displays only its local updater's under-review leads until a reviewed publication changes the approved corpus.
- Restarting the bot preserves the next due time from its last scan; an overdue scan runs on startup. The timer does not run on a stopped laptop/process. A hosted scheduler is needed for uninterrupted operation.
- The local updater reports aggregate failure counts; the daily observer records per-source failures. Neither establishes that a scheme is currently accepting applications.

## Commands

```powershell
python -m pip install -r requirements-ingest.txt
python -m unittest discover -s scripts -p 'test_*.py'
npm.cmd run sources:update
python scripts/check_sources.py --summary .runtime/source-monitor/summary.md
```

The one-time source scan and the cloud observer make network requests. Their results must be reported separately from the mocked automated tests above.
