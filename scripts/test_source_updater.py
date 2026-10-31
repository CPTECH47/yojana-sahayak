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
