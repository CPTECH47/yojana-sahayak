"""Build quarantined, short PIB evidence excerpts from three local HTML snapshots.

Usage: python build_excerpts.py --input DIR --output DIR
The input directory is local and not tracked. Expected raw hashes are enforced.
"""

import argparse
import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import Path


SOURCES = [
    {
        "id": "pib-pmjay-cabinet-2024",
        "file": "pib-pmjay-announcement-2024.html",
        "sha256": "c3123d1272bd29fcd1a75a01e8a1ddc54ead41b2bed6cd28768af1638d6a0e44",
        "title": "Cabinet approves health coverage to all senior citizens of the age 70 years and above irrespective of income under Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (AB PM-JAY)",
        "authority": "Government of India Cabinet / Press Information Bureau",
        "url": "https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2053881&lang=2&reg=48",
        "published_at": "2024-09-11",
        "locator": "opening paragraph",
        "excerpt": "senior citizens aged 70 years and above irrespective of income",
    },
    {
        "id": "pib-vay-vandana-2026",
        "file": "pib-vay-vandana-2026.html",
        "sha256": "e4687a9f9a83f5606892d37b83486a9bc3c4e72f30763f4a28169e69f352ec1d",
        "title": "Advancing Universal and Inclusive Senior Care: Ayushman Vay Vandana Marks Two Years of Transforming Healthcare for Elderly Citizens",
        "authority": "Ministry of Health and Family Welfare / Press Information Bureau",
        "url": "https://www.pib.gov.in/PressReleseDetailm.aspx?PRID=2330009&lang=2&reg=48",
        "published_at": "2026-10-29",
        "locator": "headline subheading",
        "excerpt": "Senior Citizens Aged 70 Years and Above Empowered with Dignified, Cashless Healthcare Coverage",
    },
    {
        "id": "pib-pmmvy-2026",
        "file": "pib-pmmvy-2026.html",
        "sha256": "7e11a4b26ece81d4b165b0d73edcf711b0ca00dd22e55dab0e11e43b6e94dbe6",
        "title": "Pradhan Mantri Matru Vandana Yojana Strengthens Maternal Health and Early Childhood Care",
        "authority": "Ministry of Women and Child Development / Press Information Bureau",
        "url": "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2270668&lang=1&reg=6",
        "published_at": "2026-06-09",
        "locator": "opening article paragraphs, benefits",
        "excerpt": "eligible beneficiaries receive ₹5,000 in two instalments for the first living child",
    },
]


class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.hidden = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.hidden += 1
        elif tag in ("p", "div", "li", "h1", "h2", "h3", "br", "td", "th"):
            self.parts.append(" ")

    def handle_endtag(self, tag):
        if tag in ("script", "style") and self.hidden:
            self.hidden -= 1
        elif tag in ("p", "div", "li", "h1", "h2", "h3", "td", "th"):
            self.parts.append(" ")

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    records_path = args.output / "candidate-records.json"
    existing = json.loads(records_path.read_text(encoding="utf-8")) if records_path.exists() else {"candidates": []}
    by_id = {item["id"]: item for item in existing.get("candidates", [])}
    for source in SOURCES:
        raw = (args.input / source["file"]).read_bytes()
        if digest(raw) != source["sha256"]:
            raise ValueError(f"Raw snapshot hash changed: {source['file']}")
        extractor = TextExtractor()
        extractor.feed(raw.decode("utf-8", errors="replace"))
        text = re.sub(r"\s+", " ", "".join(extractor.parts))
        excerpt = source["excerpt"]
        if excerpt not in text:
            raise ValueError(f"Excerpt missing from {source['file']}")
        contents = (
            "QUARANTINED PIB SOURCE EXCERPT — review required\n"
            f"Source: {source['url']}\n"
            f"Issuing body: {source['authority']}\n"
            f"Published: {source['published_at']}; accessed: 2026-10-31\n"
            f"Locator: {source['locator']}\n"
            f"Short excerpt: {excerpt}\n"
            "This excerpt is incomplete and must not determine eligibility.\n"
        ).encode("utf-8")
        output_name = source["id"] + ".txt"
        (args.output / output_name).write_bytes(contents)
        record = by_id.get(source["id"], {})
        record.update({
            "id": source["id"], "status": "needs_review",
            "title": source["title"], "authority": source["authority"],
            "url": source["url"], "published_at": source["published_at"],
            "accessed_at": "2026-10-31", "locator": source["locator"],
            "raw_filename": source["file"], "raw_sha256": source["sha256"],
            "raw_bytes": len(raw), "raw_snapshot_in_git": False,
            "excerpt_filename": output_name, "excerpt_sha256": digest(contents),
            "copyright_policy": "https://www.pib.gov.in/content/132_2_Copyright-Policy.aspx?lang=1&reg=1",
        })
        by_id[source["id"]] = record
    records_path.write_text(
        json.dumps({"candidates": list(by_id.values())}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8", newline="\n",
    )
    print(f"Built {len(records)} quarantined excerpts")


if __name__ == "__main__":
    main()
