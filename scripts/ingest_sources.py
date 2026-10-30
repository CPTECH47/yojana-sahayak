"""Build a small, inspectable corpus from reviewed public source documents.

This is a development importer. A source is listed in manifest.json only after
its authority and use in this pilot have been reviewed by a person.
"""

from __future__ import annotations

import hashlib
import json
from datetime import date
from pathlib import Path

import truststore
truststore.inject_into_ssl()

import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "corpus" / "manifest.json"
OUT = ROOT / "corpus" / "passages.json"
DOCS = ROOT / "corpus" / "docs"


def clean(value: str) -> str:
    return " ".join(value.split())


def main() -> None:
    sources = json.loads(MANIFEST.read_text(encoding="utf-8"))["sources"]
    passages = []
    for source in sources:
        if source.get("status") != "approved":
            continue
        response = requests.get(source["url"], timeout=30, headers={"User-Agent": "YojanaSahayakStudentPrototype/1.0"})
        response.raise_for_status()
        if not response.url.startswith(("https://www.pib.gov.in/", "https://pmkisan.gov.in/")):
            raise ValueError(f"Unexpected redirect for {source['id']}: {response.url}")
        content = response.content
        suffix = "pdf" if source["format"] == "pdf" else "html"
        snapshot = DOCS / f"{source['id']}.{suffix}"
        snapshot.write_bytes(content)
        digest = hashlib.sha256(content).hexdigest()
        if suffix == "pdf":
            reader = PdfReader(snapshot)
            chunks = [(f"page {n}", clean(page.extract_text() or "")) for n, page in enumerate(reader.pages, 1)]
        else:
            soup = BeautifulSoup(content, "html.parser")
            body = soup.select_one("#pibReleaseBody")
            if body is None:
                raise ValueError(f"No PIB article body for {source['id']}")
            chunks = [("article body", clean(body.get_text(" ", strip=True)))]
        useful = [(locator, body) for locator, body in chunks if len(body) >= 80]
        if not useful:
            raise ValueError(f"Empty extraction for {source['id']}")
        for n, (locator, body) in enumerate(useful, 1):
            passages.append({
                "id": f"{source['id']}:{n}",
                "document_id": source["id"],
                "scheme_id": source["scheme_id"],
                "title": source["title"],
                "authority": source["authority"],
                "url": source["url"],
                "published_at": source["published_at"],
                "verified_at": date.today().isoformat(),
                "snapshot_sha256": digest,
                "locator": locator,
                "text": body,
            })
        print(f"{source['id']}: {len(useful)} passages, sha256 {digest[:12]}")
    OUT.write_text(json.dumps({"passages": passages}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(passages)} passages from {len(sources)} listed sources")


if __name__ == "__main__":
    main()
