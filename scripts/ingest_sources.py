"""Fetch immutable candidates; publishing requires a separate, explicitly reviewed file.

No invocation without --publish may change the approved manifest or passages.
"""
from __future__ import annotations
import argparse
import hashlib
import io
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse, urljoin
import requests
import truststore
from bs4 import BeautifulSoup
from pypdf import PdfReader
truststore.inject_into_ssl()

ROOT = Path(__file__).resolve().parents[1]
FIELDS = ["id","document_id","scheme_id","title","authority","url","published_at","verified_at","snapshot_sha256","locator","text"]
HOSTS = {"pmkisan.gov.in","www.pib.gov.in","pib.gov.in","pmuy.gov.in","www.pmuy.gov.in",
         "my.msme.gov.in","labour.gov.in","www.labour.gov.in","scholarships.gov.in"}

def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))

def write(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)

def digest(p):
    value = json.dumps([p.get(key) for key in FIELDS], ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(value.encode()).hexdigest()

def fetch(url, session=None, maximum=20_000_000):
    session = session or requests.Session()
    for _ in range(6):
        parsed = urlparse(url)
        if parsed.scheme != "https" or parsed.hostname not in HOSTS or parsed.username or parsed.password or parsed.port not in (None,443):
            raise ValueError("Unapproved source or redirect")
        response = session.get(url, timeout=30, allow_redirects=False, stream=True,
                               headers={"User-Agent":"YojanaSahayakStudentPrototype/1.0"})
        try:
            if response.status_code in (301,302,303,307,308):
                url = urljoin(url, response.headers["Location"])
                continue
            response.raise_for_status()
            content = bytearray()
            for block in response.iter_content(65536):
                content.extend(block)
                if len(content) > maximum:
                    raise ValueError("Source exceeds download limit")
            return bytes(content), url
        finally:
            response.close()
    raise ValueError("Too many source redirects")

def extract(content, kind):
    if kind == "pdf":
        pages = PdfReader(io.BytesIO(content)).pages
        return [{"locator":f"PDF page {i}", "text":" ".join((page.extract_text() or "").split())}
                for i,page in enumerate(pages,1) if len((page.extract_text() or "").strip()) >= 40]
    soup = BeautifulSoup(content, "html.parser")
    for element in soup(["script","style","nav","footer","header"]):
        element.decompose()
    body = soup.select_one("#pibReleaseBody") or soup.select_one("main") or soup.select_one("article") or soup.body
    if body is None:
        return []
    # These are extraction locators, not reviewed facts. Tables remain visible for review.
    blocks = body.find_all(["p","li","tr","h1","h2","h3"])
    return [{"locator":f"HTML block {i}", "text":" ".join(item.get_text(" ",strip=True).split())}
            for i,item in enumerate(blocks,1) if len(item.get_text(" ",strip=True)) >= 40]

def candidate(source, folder):
    checked = datetime.now(timezone.utc).isoformat()
    try:
        content, final_url = fetch(source["url"])
        sha = hashlib.sha256(content).hexdigest()
        target = folder / source["id"] / sha
        snapshot = target / ("snapshot." + source["format"])
        snapshot.parent.mkdir(parents=True, exist_ok=True)
        snapshot.write_bytes(content)
        chunks = extract(content,source["format"])
        data = {"source_id":source["id"],"source_url":source["url"],"final_url":final_url,
                "checked_at":checked,"snapshot_sha256":sha,"snapshot_path":str(snapshot.resolve()),
                "previous_sha256":source.get("snapshot_sha256"),
                "status":"needs_review" if chunks else "failed",
                "extraction_status":"readable_unreviewed" if chunks else "empty_or_image_only",
                "extracted_blocks":chunks}
        write(target / "candidate.json",data)
        return target / "candidate.json"
    except Exception as error:
        # Preserve the last approved data even when a source is down.
        path = folder / source["id"] / "fetch-failure.json"
        write(path,{"source_id":source["id"],"status":"failed","checked_at":checked,
                    "error_type":type(error).__name__})
        return path

def publish(review, manifest_path, passages_path):
    manifest, corpus = read(manifest_path),read(passages_path)
    evidence = read(review["candidate_path"])
    source = next(s for s in manifest["sources"] if s["id"] == evidence["source_id"])
    if evidence.get("status") != "needs_review" or not review.get("reviewer") or review.get("approved") is not True:
        raise ValueError("Explicit reviewer approval of a readable candidate is required")
    if source.get("snapshot_sha256") != evidence.get("previous_sha256"):
        raise ValueError("Approved source changed since this candidate was fetched")
    snapshot = Path(evidence["snapshot_path"])
    if hashlib.sha256(snapshot.read_bytes()).hexdigest() != evidence["snapshot_sha256"]:
        raise ValueError("Candidate snapshot hash mismatch")
    if evidence["source_url"] != source["url"]:
        raise ValueError("Candidate URL mismatch")
    reviewed = review.get("reviewed_passages",[])
    if not reviewed or any(not item.get("text") or not item.get("locator") for item in reviewed):
        raise ValueError("Supply reviewed concise passages with exact locators; extraction is not automatic approval")
    if source.get("valid_until") and not review.get("valid_until"):
        raise ValueError("Time-sensitive sources require an explicitly reviewed expiry")
    records=[]
    for item in reviewed:
        record={key:source.get(key) for key in ("scheme_id","title","authority","url","published_at")}
        record.update(id=item["id"],document_id=source["id"],verified_at=evidence["checked_at"][:10],
                      snapshot_sha256=evidence["snapshot_sha256"],locator=item["locator"],text=item["text"])
        if not record["id"].startswith(source["id"] + ":") or any(p["id"] == record["id"] for p in records):
            raise ValueError("Passage IDs must be unique and scoped to the document")
        records.append(record)
    source.update(status="approved",snapshot_sha256=evidence["snapshot_sha256"],
                  verified_at=evidence["checked_at"][:10],reviewer=review["reviewer"],
                  passage_hashes={p["id"]:digest(p) for p in records})
    if review.get("valid_until"):
        datetime.strptime(review["valid_until"],"%Y-%m-%d")
        source["valid_until"]=review["valid_until"]
    corpus["passages"]=[p for p in corpus["passages"] if p["document_id"] != source["id"]] + records
    # During the two replacements the runtime hash gate fails closed.
    write(passages_path,corpus)
    write(manifest_path,manifest)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fetch", help="Source ID, or all")
    parser.add_argument("--publish", help="Path to a reviewer-authored approval JSON")
    args=parser.parse_args()
    manifest_path,passages_path=ROOT/"corpus/manifest.json",ROOT/"corpus/passages.json"
    if args.publish:
        publish(read(args.publish),manifest_path,passages_path)
        print("Published reviewed passages. Re-review answer records and rule pins before enabling changed facts.")
    elif args.fetch:
        sources=read(manifest_path)["sources"]
        selected=[s for s in sources if args.fetch == "all" or s["id"] == args.fetch]
        if not selected:
            parser.error("Unknown source ID")
        for source in selected:
            print(candidate(source,ROOT/"corpus/source_snapshots"))
    else:
        parser.print_help()
        print("No approved files changed. Use --fetch to create review candidates.")

if __name__ == "__main__":
    main()
