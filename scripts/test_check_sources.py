import tempfile
import unittest
from pathlib import Path
from check_sources import check_sources, discovery_links, write_summary
import requests


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

    def test_transient_timeout_retries_once_without_approving_a_source(self):
        attempts = []
        def download(url):
            attempts.append(url)
            if len(attempts) == 1:
                raise requests.exceptions.ConnectTimeout()
            return b'<main><p>This public statement has enough readable text to observe safely.</p></main>', url
        with tempfile.TemporaryDirectory() as folder:
            result = check_sources([self.source], folder, download, pause=lambda seconds: None)
        self.assertEqual(len(attempts), 2)
        self.assertEqual(result['results'][0]['attempts'], 2)
        self.assertFalse(result['auto_approved'])

    def test_certificate_errors_do_not_retry_or_replace_the_baseline(self):
        attempts = []
        def download(url):
            attempts.append(url)
            raise requests.exceptions.SSLError('certificate verification failed')
        with tempfile.TemporaryDirectory() as folder:
            result = check_sources([self.source], folder, download, pause=lambda seconds: self.fail('TLS must not retry'))
        self.assertEqual(len(attempts), 1)
        self.assertEqual(result['results'][0]['error_type'], 'SSLError')
        self.assertEqual(result['results'][0]['status'], 'fetch_failed')

    def test_summary_marks_partial_coverage_and_does_not_create_private_links(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / 'summary.md'
            report = {'checked_at': 'sample', 'results': [{**self.source, 'title': '<script> | sample', 'url': 'http://127.0.0.1/private', 'status': 'fetch_failed', 'error_type': 'TimeoutError'}]}
            write_summary(report, target)
            text = target.read_text(encoding='utf-8')
        self.assertIn('Coverage is incomplete', text)
        self.assertIn('0/1', text)
        self.assertNotIn('](http://127.0.0.1', text)
        self.assertNotIn('<script>', text)


if __name__ == '__main__':
    unittest.main()
