#!/usr/bin/env python3
"""Fetch setlists from setlist.fm for artists listed in concerts.html.

Usage: set the env var SETLISTFM_API_KEY and run this script from repo root.
It will write to data/setlists.json mapping artist -> {source, url, songs: [...]}
"""
import os
import re
import json
import sys
import ssl
import argparse
from urllib.parse import quote
from urllib.request import Request, urlopen

parser = argparse.ArgumentParser()
parser.add_argument('--insecure', action='store_true', help='Disable SSL verification (local testing only)')
args = parser.parse_args()

API_KEY = os.environ.get('SETLISTFM_API_KEY')
if not API_KEY:
    print('Missing SETLISTFM_API_KEY env var', file=sys.stderr)
    sys.exit(2)

CTX = None
if args.insecure:
    CTX = ssl._create_unverified_context()

HTML_PATH = 'concerts.html'
OUT_PATH = 'data/setlists.json'

def parse_date_to_ddmmyyyy(s):
    s = s.strip()
    # accept formats like 19/9/17 or 2019-09-19 etc.
    m = re.match(r"(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})", s)
    if not m:
        return None
    d, mth, y = m.groups()
    d = int(d); mth = int(mth); y = int(y)
    if y < 100:
        y = 2000 + y if y < 70 else 1900 + y
    return f"{d:02d}-{mth:02d}-{y:04d}"


def extract_entries(html):
    # Return list of (artist, date_dd-mm-yyyy)
    parts = html.split('<div class="card">')
    entries = []
    for part in parts[1:]:
        artist_m = re.search(r'<strong>([^<]+)</strong>', part)
        if not artist_m:
            continue
        artist = artist_m.group(1).strip()
        date_m = re.search(r'Date:\s*([^<—\n]+)', part)
        date_raw = date_m.group(1).strip() if date_m else ''
        date_norm = parse_date_to_ddmmyyyy(date_raw) if date_raw else None
        entries.append((artist, date_norm))
    return entries

def fetch_setlist_for(artist, date_dd_mm_yyyy=None):
    q = quote(artist)
    url = f'https://api.setlist.fm/rest/1.0/search/setlists?artistName={q}&p=1'
    if date_dd_mm_yyyy:
        url += f'&date={quote(date_dd_mm_yyyy)}'
    req = Request(url, headers={
        'x-api-key': API_KEY,
        'Accept': 'application/json',
        'User-Agent': 'lachie-site-fetcher/1.0'
    })
    # pass SSL context when testing with --insecure
    if CTX is not None:
        with urlopen(req, timeout=30, context=CTX) as resp:
            if resp.status != 200:
                raise RuntimeError(f'HTTP {resp.status}')
            return json.load(resp)
    else:
        with urlopen(req, timeout=30) as resp:
            if resp.status != 200:
                raise RuntimeError(f'HTTP {resp.status}')
            return json.load(resp)
        if resp.status != 200:
            raise RuntimeError(f'HTTP {resp.status}')
        return json.load(resp)

def pick_songs_from_setlist(setlist_json):
    # try to find the first setlist and extract song names in order
    sls = setlist_json.get('setlist', [])
    if not sls:
        return None
    first = sls[0]
    sets = first.get('sets', {}).get('set', [])
    songs = []
    for s in sets:
        for song in s.get('song', []):
            name = song.get('name')
            if name:
                songs.append(name)
    return {
        'source': first.get('@id') or first.get('url') or None,
        'url': first.get('url'),
        'songs': songs
    }

def main():
    with open(HTML_PATH, 'r', encoding='utf8') as f:
        html = f.read()
    entries = extract_entries(html)
    out = {}
    seen = set()
    import time
    for artist, date in entries:
        key = f"{artist}|{date or ''}"
        if key in seen:
            continue
        seen.add(key)
        try:
            print('Fetching setlist for', artist, date)
            js = fetch_setlist_for(artist, date)
            parsed = pick_songs_from_setlist(js) or {}
            out[key] = parsed
        except Exception as e:
            # handle rate limiting by sleeping and retrying once
            print('Error for', artist, date, e, file=sys.stderr)
            if hasattr(e, 'code') and e.code == 429:
                print('Rate limited, sleeping 2s and retrying...')
                time.sleep(2)
                try:
                    js = fetch_setlist_for(artist, date)
                    parsed = pick_songs_from_setlist(js) or {}
                    out[key] = parsed
                    continue
                except Exception as e2:
                    print('Retry failed for', artist, date, e2, file=sys.stderr)
            out[key] = {}
        time.sleep(1)
    os.makedirs(os.path.dirname(OUT_PATH) or '.', exist_ok=True)
    with open(OUT_PATH, 'w', encoding='utf8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    main()
