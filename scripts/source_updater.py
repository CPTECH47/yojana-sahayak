"""Check official sources and discover scheme candidates; never approve rules.

Run once with ``python scripts/source_updater.py``. The WhatsApp process schedules
it every 12 hours while that process is running. Runtime snapshots stay ignored.
"""
from __future__ import annotations
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse, urlunparse
from bs4 import BeautifulSoup
from ingest_sources import ROOT, HOSTS, extract, fetch, read, write

OUT = ROOT / ".runtime/source-discovery"
INDEX = OUT / "candidates.json"
STATE = OUT / "state.json"
SEEDS = [
    # A direct official source confirms that the first run has a second farmer lead.
    "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2304549&lang=1&reg=48",
    "https://www.pib.gov.in/",
    "https://pmuy.gov.in/",
]
KEYWORDS = re.compile(r"scheme|yojana|scholarship|insurance|pension|guideline|farmer|crop|योजना|बीमा|किसान|छात्रवृत्ति", re.I)
SCHEME_TITLE = re.compile(r"scheme|yojana|scholarship|PMFBY|PMUY|PM-KISAN|PMMVY|PM-JAY|pension scheme|योजना|छात्रवृत्ति", re.I)
ROLE_WORDS = re.compile(r"farmer|agricultur|crop|student|scholar|worker|labou?r|artisan|craft|woman|women|household|family|किसान|छात्र|श्रमिक|महिला", re.I)

def official(url: str) -> bool:
    try:
        p = urlparse(url)
        return p.scheme == "https" and p.hostname in {
            "www.pib.gov.in", "pib.gov.in", "pmuy.gov.in", "www.pmuy.gov.in",
            "pmkisan.gov.in", "www.pmkisan.gov.in",
        } and not p.username and not p.password and p.port in (None, 443)
    except ValueError:
        return False

def approved_official(url: str) -> bool:
    """Known approved URLs use the importer's exact host policy.

    Discovery links retain the narrower programme-host policy above.
    """
    try:
        p = urlparse(url)
        return (p.scheme == "https" and p.hostname in HOSTS
                and not p.username and not p.password and p.port in (None, 443))
    except ValueError:
        return False

def links(content: bytes, base: str) -> list[tuple[str, str]]:
    soup = BeautifulSoup(content, "html.parser")
    found = {}
    for anchor in soup.select("a[href]"):
        title = " ".join(anchor.get_text(" ", strip=True).split())[:160]
        href = anchor.get("href", "")
        if not title or not KEYWORDS.search(title + " " + href):
            continue
        url = urljoin(base, href)
        parsed = urlparse(url)
        url = urlunparse(parsed._replace(fragment=""))
        if official(url) and url != base and not re.search(r"\.(?:jpg|png|zip|mp4)(?:$|\?)", url, re.I):
            found[url] = title
    return list(found.items())

def title_and_summary(content: bytes, url: str, kind: str, link_title: str, chunks=None) -> tuple[str, str]:
    chunks = chunks if chunks is not None else extract(content, kind)
    if kind == "html":
        soup = BeautifulSoup(content, "html.parser")
        heading = soup.select_one("#pibReleaseBody h1, main h1, article h1, h1")
        title = heading.get_text(" ", strip=True)[:160] if heading else link_title
    else:
        title = link_title
    relevant = [row["text"] for row in chunks if ROLE_WORDS.search(row["text"])]
    summary = " ".join((relevant or [row["text"] for row in chunks])[:2])[:700]
    return title or link_title, summary

def scheme_id(title: str, url: str, summary: str = "") -> str:
    match = re.search(r"\b(PMFBY|PMUY|PM-KISAN|PM-SYM|NMMSS|PMMVY|PM-JAY)\b", title + " " + summary, re.I)
    if match:
        return match.group(1).lower()
    return "discovered-" + hashlib.sha256(url.encode()).hexdigest()[:12]

def scan(*, fetcher=fetch, now=None, seeds=SEEDS, manifest=None, maximum_new=12):
    now = now or datetime.now(timezone.utc)
    manifest = manifest or read(ROOT / "corpus/manifest.json")
    previous = read(STATE) if STATE.exists() else {"hashes": {}}
    index = read(INDEX) if INDEX.exists() else {"items": []}
    items = {item["url"]: item for item in index.get("items", []) if item.get("kind") != "new_source" or SCHEME_TITLE.search(item.get("title", ""))}
    for item in items.values():
        if item.get("kind") == "new_source":
            item["scheme_id"] = scheme_id(item["title"], item["url"], item.get("summary", ""))
    approved = {source["url"]: source for source in manifest["sources"] if source.get("status") == "approved"}
    discovered = {}
    checked = 0
    failures = 0
    for seed in seeds:
        if not official(seed):
            continue
        try:
            content, final_url = fetcher(seed)
            checked += 1
            if "PressReleasePage.aspx" in seed:
                discovered[final_url] = "Pradhan Mantri Fasal Bima Yojana (PMFBY)"
            if not seed.lower().endswith(".pdf"):
                discovered.update(links(content, final_url))
        except Exception:
            failures += 1
    # Check approved documents as well as a small, bounded set of new links.
    queue = [(url, source["title"], True) for url, source in approved.items()]
    queue += [(url, title, False) for url, title in list(discovered.items())[:maximum_new] if url not in approved]
    hashes = dict(previous.get("hashes", {}))
    semantic_hashes = dict(previous.get("semantic_hashes", {}))
    added = 0
    for url, link_title, known in queue:
        allowed = approved_official if known else official
        if not allowed(url):
            continue
        try:
            content, final_url = fetcher(url)
            if not allowed(final_url):
                raise ValueError("Redirected outside trusted hosts")
            checked += 1
            sha = hashlib.sha256(content).hexdigest()
            kind = "pdf" if urlparse(final_url).path.lower().endswith(".pdf") else "html"
            if hashes.get(url) == sha:
                continue
            chunks = extract(content, kind)
            semantic = hashlib.sha256(json.dumps([(row["locator"],row["text"]) for row in chunks],ensure_ascii=False).encode()).hexdigest()
            hashes[url] = sha
            if semantic_hashes.get(url) == semantic:
                continue
            semantic_hashes[url] = semantic
            if known and approved[url].get("snapshot_sha256") == sha:
                continue
            title, summary = title_and_summary(content, final_url, kind, link_title, chunks)
            if not summary or (not known and not SCHEME_TITLE.search(title)):
                continue
            source_id = hashlib.sha256(url.encode()).hexdigest()[:16]
            target = OUT / "snapshots" / source_id / sha / ("snapshot." + kind)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
            items[url] = {"id": source_id, "url": url, "title": title, "scheme_id": approved[url]["scheme_id"] if known else scheme_id(title, url, summary),
                          "summary": summary, "status": "needs_review", "kind": "changed_source" if known else "new_source",
                          "snapshot_sha256": sha, "snapshot_path": str(target.resolve()), "discovered_at": now.isoformat()}
            added += 1
        except Exception:
            failures += 1
    write(INDEX, {"checked_at": now.isoformat(), "items": sorted(items.values(), key=lambda item: item["discovered_at"], reverse=True)[:200]})
    write(STATE, {"checked_at": now.isoformat(), "hashes": hashes, "semantic_hashes": semantic_hashes})
    return {"checked": checked, "new_or_changed": added, "failures": failures, "candidate_total": len(items)}

if __name__ == "__main__":
    print(json.dumps(scan()))
