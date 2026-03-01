#!/usr/bin/env python3
import re
import json
import sys
from urllib.request import urlopen, Request
from xml.etree import ElementTree as ET

FEED_URL = 'https://rateyourmusic.com/~lachlanelijah/data/rss'

def parse_item(item):
    title = item.findtext('title') or ''
    link = item.findtext('link') or item.findtext('guid') or ''
    pubDate = item.findtext('pubDate') or ''
    # title format: "Rated Twilight Zone by Multiple Artists 3.0 stars"
    m = re.search(r'Rated\s+(.+?)\s+by\s+(.+?)\s+(\d+(?:\.\d)?)\s*stars', title)
    if m:
        album = m.group(1).strip()
        artist = m.group(2).strip()
        rating = m.group(3).strip()
    else:
        album = title
        artist = ''
        rating = ''
    return {
        'title': title,
        'album': album,
        'artist': artist,
        'rating': rating,
        'link': link,
        'pubDate': pubDate,
    }

def fetch_and_write(path='rym.json', limit=10):
    req = Request(FEED_URL, headers={'User-Agent':'github-action-fetcher'})
    with urlopen(req, timeout=30) as resp:
        data = resp.read()
    root = ET.fromstring(data)
    items = root.findall('.//item')
    parsed = [parse_item(it) for it in items[:limit]]
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(parsed, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    out = 'rym.json'
    try:
        fetch_and_write(out, limit=20)
        print('Wrote', out)
    except Exception as e:
        print('Error fetching feed:', e, file=sys.stderr)
        sys.exit(1)
