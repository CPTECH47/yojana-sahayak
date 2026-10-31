"""Fetch three public PIB articles for review. Does not approve or ingest them."""
import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
SOURCES = [
    ('pmjay-cabinet-2024', 'https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2053881&lang=2&reg=48', 'The Union Cabinet, chaired'),
    ('pmjay-senior-2026', 'https://www.pib.gov.in/PressReleseDetailm.aspx?PRID=2330009&lang=2&reg=48', 'Under Ayushman Vay Vandana, all senior citizens'),
    ('pmmvy-2026', 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2270668&lang=1&reg=6', 'Since its integration under Mission Shakti'),
]

class Paragraphs(HTMLParser):
    def __init__(self):
        super().__init__(); self.depth=0; self.parts=[]; self.paragraphs=[]
    def handle_starttag(self, tag, attrs):
        if tag == 'p': self.depth += 1
    def handle_endtag(self, tag):
        if tag == 'p' and self.depth:
            self.depth -= 1
            if not self.depth:
                self.paragraphs.append(' '.join(' '.join(self.parts).split())); self.parts=[]
    def handle_data(self, data):
        if self.depth: self.parts.append(data)

def main():
    records=[]
    for ident,url,marker in SOURCES:
        with urlopen(Request(url, headers={'User-Agent':'YojanaSahayak-source-review/1.0'}), timeout=30) as response:
            raw=response.read(); content_type=response.headers.get_content_type()
        parser=Paragraphs(); parser.feed(raw.decode('utf-8',errors='replace'))
        matches=[p for p in parser.paragraphs if marker.casefold() in p.casefold()]
        if content_type != 'text/html' or not matches: raise ValueError(f'{ident}: missing expected article paragraph')
        # Keep one paragraph, not the site template or embedded third-party assets.
        text=matches[0]+'\n'; output=ROOT/(ident+'.txt')
        if output.exists() and output.read_text(encoding='utf-8') != text: raise ValueError(f'{ident}: excerpt changed; preserve the old version and review the new one')
        if not output.exists(): output.write_text(text,encoding='utf-8',newline='\n')
        records.append({'id':ident,'url':url,'status':'needs_review','raw_html_sha256':hashlib.sha256(raw).hexdigest(),'raw_html_bytes':len(raw),'excerpt_sha256':hashlib.sha256(text.encode('utf-8')).hexdigest(),'excerpt_file':output.name,'locator':'article paragraph beginning: '+marker})
    print(json.dumps(records,ensure_ascii=False,indent=2))

if __name__=='__main__': main()
