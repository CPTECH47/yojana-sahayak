"""Stage daily official-source observations. Never modify approved corpus files."""
import argparse
import hashlib
import json
import re
import html
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse, urldefrag, quote

import requests
from bs4 import BeautifulSoup
from ingest_sources import ROOT, HOSTS, extract, fetch, read, write


def discovery_links(content, base):
    links = set()
    soup = BeautifulSoup(content, 'html.parser')
    for anchor in soup.select('a[href]'):
        label = anchor.get_text(' ', strip=True)
        url = urldefrag(urljoin(base, anchor['href']))[0]
        parsed = urlparse(url)
        if (parsed.scheme == 'https' and parsed.hostname in HOSTS
                and not parsed.username and not parsed.password
                and parsed.port in (None, 443)
                and re.search(r'scheme|yojana|guideline|scholarship|pension|notification|योजना|छात्रवृत्ति', label, re.I)):
            links.add(url)
    return sorted(links)[:50]


def download_with_retry(url, downloader, pause=time.sleep):
    for attempt in (1, 2):
        try:
            return downloader(url), attempt
        except Exception as error:
            # Certificate failures require diagnosis, never bypass or blind retry.
            if isinstance(error, requests.exceptions.SSLError):
                raise
            status = getattr(getattr(error, 'response', None), 'status_code', 0)
            retryable = isinstance(error, (requests.exceptions.Timeout, requests.exceptions.ConnectionError, TimeoutError)) or status == 429 or 500 <= status < 600
            if attempt == 2 or not retryable:
                raise
            pause(1)


def check_sources(sources, output, downloader=fetch, pause=time.sleep):
    if len(sources) > 30 or any(not re.fullmatch(r'[a-z0-9-]{1,80}', s['id']) for s in sources):
        raise ValueError('Use at most 30 sources with safe identifiers')
    if len({source['id'] for source in sources}) != len(sources):
        raise ValueError('Source IDs must be unique')
    output = Path(output)
    state_path = output / 'state.json'
    previous = read(state_path) if state_path.exists() else {'sources': {}}
    if not isinstance(previous.get('sources'), dict):
        raise ValueError('Invalid previous monitor state')
    state = dict(previous['sources'])
    checked = datetime.now(timezone.utc).isoformat()
    results = []
    for source in sources:
        result = {key: source[key] for key in ('id', 'title', 'url', 'roles')}
        result['checked_at'] = checked
        try:
            (content, final_url), attempts = download_with_retry(source['url'], downloader, pause)
            result['attempts'] = attempts
            blocks = extract(content, source['format'])
            result.update(final_url=final_url, snapshot_sha256=hashlib.sha256(content).hexdigest())
            if not blocks:
                result.update(status='extraction_failed', review_required=True)
                results.append(result)
                continue
            text = '\n'.join(block['text'] for block in blocks)
            digest = hashlib.sha256(text.encode('utf-8')).hexdigest()
            links = discovery_links(content, final_url) if source['format'] == 'html' else []
            old = previous['sources'].get(source['id'])
            if old and old.get('url') != source['url']:
                old = None
            status = 'baseline_needs_review' if not old else 'changed_needs_review' if old['text_sha256'] != digest else 'unchanged'
            new_links = sorted(set(links) - set(old['links'])) if old else []
            result.update(status=status, text_sha256=digest, review_required=status != 'unchanged' or bool(new_links),
                          discovered_links=new_links, baseline_links=links if not old else [],
                          passages_for_review=[{'locator': b['locator'], 'excerpt': b['text'][:350]} for b in blocks[:3]])
            state[source['id']] = {'url': source['url'], 'text_sha256': digest, 'links': links}
        except Exception as error:
            result.update(status='fetch_failed', review_required=True, error_type=type(error).__name__)
        results.append(result)
    report = {'checked_at': checked, 'scope': 'configured national official-source seeds',
              'auto_approved': False, 'results': results}
    write(output / 'report.json', report)
    write(state_path, {'sources': state})
    return report


def write_summary(report, path):
    results = report['results']
    readable = sum(r['status'] not in ('fetch_failed', 'extraction_failed') for r in results)
    def cell(value):
        return html.escape(str(value)).replace('\\', '\\\\').replace('[', '\\[').replace(']', '\\]').replace('|', '&#124;').replace('\n', ' ').replace('\r', ' ')
    lines = ['## Official-source observations', '',
             f"Checked {cell(report['checked_at'])}. Readable: **{readable}/{len(results)}**.",
             'New or changed material requires review. This report does not approve facts or establish eligibility.', '',
             '| Source | Roles | Observation |', '| --- | --- | --- |']
    for result in results:
        url = result['url']
        parsed = urlparse(url)
        if parsed.scheme == 'https' and parsed.hostname in HOSTS and not parsed.username and not parsed.password and parsed.port in (None, 443):
            source = f"[{cell(result['title'])}]({quote(url, safe=':/?&=%#')})"
        else:
            source = cell(result['title'])
        note = result['status'] + (f" ({result['error_type']})" if result.get('error_type') else '')
        lines.append(f"| {source} | {cell(', '.join(result['roles']))} | {cell(note)} |")
    if readable != len(results):
        lines.extend(['', '**Coverage is incomplete.** Inspect failed sources and retain the last approved evidence.'])
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with Path(path).open('a', encoding='utf-8') as stream:
        stream.write('\n'.join(lines) + '\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--registry', type=Path, default=ROOT / 'corpus/discovery-registry.json')
    parser.add_argument('--output', type=Path, default=ROOT / '.runtime/source-monitor')
    parser.add_argument('--summary', type=Path, help='Append a readable summary to this file; GitHub sets GITHUB_STEP_SUMMARY')
    args = parser.parse_args()
    report = check_sources(read(args.registry)['sources'], args.output,
                           downloader=lambda url: fetch(url, timeout=12))
    if args.summary:
        write_summary(report, args.summary)
    counts = {}
    for result in report['results']:
        counts[result['status']] = counts.get(result['status'], 0) + 1
    print(json.dumps({'report': str(args.output / 'report.json'), 'counts': counts, 'auto_approved': False}))
    # An unreadable page is a completed observation requiring manual review.
    # Transport failures remain operational failures for the scheduled job.
    if any(result['status'] == 'fetch_failed' for result in report['results']):
        raise SystemExit(1)


if __name__ == '__main__':
    main()
