import tempfile
import unittest
from pathlib import Path
from check_sources import check_sources, discovery_links


class SourceMonitorTests(unittest.TestCase):
    source = {'id': 'sample', 'title': 'Official source', 'roles': ['farmer'],
              'url': 'https://pmkisan.gov.in/', 'format': 'html'}

    def test_baseline_changes_and_new_links_never_approve_rules(self):
        content = b'<main><p>This is an official public statement long enough for extraction.</p></main>'
        def download(url):
            return content, url
        with tempfile.TemporaryDirectory() as folder:
            first = check_sources([self.source], folder, download)
            self.assertEqual(first['results'][0]['status'], 'baseline_needs_review')
            self.assertFalse(first['auto_approved'])
            self.assertEqual(first['results'][0]['discovered_links'], [])
            self.assertEqual(check_sources([self.source], folder, download)['results'][0]['status'], 'unchanged')
            content = b'<main><p>This changed official statement is long enough for a review.</p><a href="https://pmkisan.gov.in/new.pdf">Scheme guidelines</a></main>'
            changed = check_sources([self.source], folder, download)['results'][0]
            self.assertEqual(changed['status'], 'changed_needs_review')
            self.assertEqual(changed['discovered_links'], ['https://pmkisan.gov.in/new.pdf'])
            self.assertEqual(sorted(p.name for p in Path(folder).iterdir()), ['report.json', 'state.json'])

    def test_failed_download_preserves_last_baseline(self):
        with tempfile.TemporaryDirectory() as folder:
            check_sources([self.source], folder, lambda url: (b'<main><p>A sufficiently long public passage for the monitor baseline.</p></main>', url))
            before = (Path(folder) / 'state.json').read_bytes()
            def failure(url):
                raise TimeoutError()
            result = check_sources([self.source], folder, failure)
            self.assertEqual(result['results'][0]['status'], 'fetch_failed')
            self.assertEqual((Path(folder) / 'state.json').read_bytes(), before)

    def test_javascript_shells_and_private_links_are_not_evidence(self):
        with tempfile.TemporaryDirectory() as folder:
            result = check_sources([self.source], folder, lambda url: (b'<html><script>render()</script></html>', url))
            self.assertEqual(result['results'][0]['status'], 'extraction_failed')
        html = b'<a href="http://127.0.0.1/private">Scheme</a><a href="https://example.com/fake">Scheme</a>'
        self.assertEqual(discovery_links(html, self.source['url']), [])


if __name__ == '__main__':
    unittest.main()
