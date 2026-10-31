import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from ingest_sources import candidate, extract, publish, read, write, fetch

class ImportTests(unittest.TestCase):
    def test_html_adapters_and_failed_pdf(self):
        for markup in (b'<main><p>Official public information with a readable passage for review.</p></main>',
                       b'<div id="pibReleaseBody"><p>Official public information with a readable passage for review.</p></div>'):
            self.assertTrue(extract(markup,"html"))
        with self.assertRaises(Exception):
            extract(b"not a PDF","pdf")

    def test_redirect_checked_before_following(self):
        class Response:
            status_code=302
            headers={"Location":"http://127.0.0.1/private"}
            def close(self): pass
        class Session:
            calls=0
            def get(self,*args,**kwargs):
                self.calls+=1
                self.asserted=kwargs["allow_redirects"]
                return Response()
        session=Session()
        with self.assertRaises(ValueError):
            fetch("https://pmuy.gov.in/faq.html",session)
        self.assertEqual(session.calls,1)
        self.assertFalse(session.asserted)

    def test_candidate_does_not_publish_and_failed_fetch_keeps_source(self):
        with tempfile.TemporaryDirectory(prefix="yojana-import-") as folder:
            root=Path(folder)
            source={"id":"test-source","url":"https://pmuy.gov.in/faq.html","format":"html","status":"approved","snapshot_sha256":"old"}
            before=json.dumps(source)
            with patch("ingest_sources.fetch",return_value=(b"<main><p>A sufficiently long government source passage for an independent reviewer.</p></main>",source["url"])):
                path=candidate(source,root)
            item=read(path)
            self.assertEqual(item["status"],"needs_review")
            self.assertEqual(json.dumps(source),before)
            with patch("ingest_sources.fetch",side_effect=RuntimeError("offline")):
                failed=read(candidate(source,root))
            self.assertEqual(failed["status"],"failed")
            self.assertEqual(source["snapshot_sha256"],"old")

    def test_publish_requires_reviewer_snapshot_and_explicit_reviewed_passages(self):
        with tempfile.TemporaryDirectory(prefix="yojana-review-") as folder:
            root=Path(folder);snapshot=root/"snapshot.html";snapshot.write_bytes(b"review snapshot")
            sha=hashlib.sha256(snapshot.read_bytes()).hexdigest()
            source={"id":"example","scheme_id":"pmuy","title":"Example","authority":"Example authority","url":"https://pmuy.gov.in/faq.html","status":"approved","snapshot_sha256":"old"}
            manifest=root/"manifest.json";passages=root/"passages.json";path=root/"candidate.json"
            write(manifest,{"sources":[source]});write(passages,{"passages":[]})
            write(path,{"source_id":"example","source_url":source["url"],"status":"needs_review","previous_sha256":"old","snapshot_sha256":sha,"snapshot_path":str(snapshot),"checked_at":"2026-10-31T10:00:00Z"})
            review={"candidate_path":str(path),"approved":True,"reviewer":"fictional-reviewer","reviewed_passages":[{"id":"example:1","locator":"section 1","text":"Reviewed summary"}]}
            with self.assertRaises(ValueError):
                publish({**review,"reviewer":""},manifest,passages)
            self.assertEqual(read(passages)["passages"],[])
            publish(review,manifest,passages)
            updated=read(manifest)["sources"][0]
            self.assertEqual(updated["snapshot_sha256"],sha)
            self.assertIn("example:1",updated["passage_hashes"])
            with self.assertRaises(ValueError):
                publish(review,manifest,passages)

if __name__=="__main__":
    unittest.main()
