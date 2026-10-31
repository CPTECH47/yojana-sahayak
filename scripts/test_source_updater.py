import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch
import source_updater as updater

HOME = "https://www.pib.gov.in/"
RELEASE = "https://www.pib.gov.in/PressReleasePage.aspx?PRID=1234567"
PAGE = b'<main><a href="/PressReleasePage.aspx?PRID=1234567">New Farmer Insurance Scheme</a></main>'
ARTICLE = b'<main><h1>New Farmer Insurance Scheme</h1><p>This new scheme provides information for farmers and farming families. The scheme details must be checked with the issuing ministry before applying.</p></main>'

class UpdaterTests(unittest.TestCase):
    def test_links_accept_only_official_relevant_pages(self):
        body = PAGE + b'<a href="https://evil.example/steal">Farmer Scheme</a><a href="/about">About</a>'
        self.assertEqual(updater.links(body, HOME), [(RELEASE, "New Farmer Insurance Scheme")])
        self.assertFalse(updater.official("http://www.pib.gov.in/PressReleasePage.aspx"))

    def test_approved_labour_source_checked_without_expanding_discovery_hosts(self):
        labour = "https://www.labour.gov.in/approved-policy"
        new_labour = "https://www.labour.gov.in/unreviewed-policy"
        body = PAGE + b'<a href="https://www.labour.gov.in/unreviewed-policy">New Worker Pension Scheme</a>'
        self.assertNotIn(new_labour, [url for url, _ in updater.links(body, HOME)])
        self.assertTrue(updater.approved_official(labour))
        self.assertFalse(updater.official(labour))
        self.assertFalse(updater.approved_official("https://www.labour.gov.in:444/policy"))
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            fetched = []
            def fetcher(url):
                fetched.append(url)
                return (body if url == HOME else ARTICLE), url
            manifest = {"sources": [{"url": labour, "title": "Approved Labour Policy", "id": "labour-note",
                                    "scheme_id": "pm-sym", "status": "approved", "snapshot_sha256": "0" * 64}]}
            with patch.object(updater, "OUT", base), patch.object(updater, "INDEX", base / "candidates.json"), patch.object(updater, "STATE", base / "state.json"):
                result = updater.scan(fetcher=fetcher, seeds=[HOME], manifest=manifest)
                items = json.loads((base / "candidates.json").read_text(encoding="utf-8"))["items"]
            self.assertIn(labour, fetched)
            self.assertNotIn(new_labour, fetched)
            self.assertEqual(result["failures"], 0)
            self.assertEqual(next(item for item in items if item["url"] == labour)["kind"], "changed_source")

    def test_scan_adds_candidate_without_approving_and_deduplicates(self):
        with tempfile.TemporaryDirectory() as directory:
            base=Path(directory)
            decoration=[b'']
            def fetcher(url):
                return (PAGE if url==HOME else ARTICLE + decoration[0]),url
            with patch.object(updater,"OUT",base),patch.object(updater,"INDEX",base/"candidates.json"),patch.object(updater,"STATE",base/"state.json"):
                manifest={"sources":[]}
                first=updater.scan(fetcher=fetcher,seeds=[HOME],manifest=manifest,now=datetime(2026,10,31,tzinfo=timezone.utc))
                decoration[0]=b'<script>layout-only-change</script>'
                second=updater.scan(fetcher=fetcher,seeds=[HOME],manifest=manifest,now=datetime(2026,11,1,tzinfo=timezone.utc))
                items=json.loads((base/"candidates.json").read_text(encoding="utf-8"))["items"]
                self.assertEqual(first["new_or_changed"],1)
                self.assertEqual(second["new_or_changed"],0)
                self.assertEqual(items[0]["status"],"needs_review")
                self.assertEqual(items[0]["url"],RELEASE)
                self.assertTrue(Path(items[0]["snapshot_path"]).exists())
                self.assertEqual(manifest,{"sources":[]})

if __name__ == "__main__":
    unittest.main()
