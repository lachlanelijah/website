#!/usr/bin/env python3
"""Fetch setlists from setlist.fm for artists listed in concerts.json and merge into concerts.json.
Usage: set the env var SETLISTFM_API_KEY and run this script from repo root.
It will update data/concerts.json with setlist info for each concert.
"""
import os
import re
import json
import sys
import ssl
import argparse
from urllib.parse import quote
from urllib.request import Request, urlopen
import time

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

CONCERTS_PATH = 'data/concerts.json'

def parse_date_to_ddmmyyyy(s):
    s = s.strip()
    m = re.match(r"(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})", s)
    if not m:
        return None
    y, mth, d = m.groups()
    return f"{d.zfill(2)}-{mth.zfill(2)}-{y}"

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

def pick_songs_from_setlist(setlist_json):
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
    with open(CONCERTS_PATH, 'r', encoding='utf8') as f:
        concerts = json.load(f)
    for concert in concerts:
        artist = concert.get('band')
        date_raw = concert.get('date')
        date_norm = parse_date_to_ddmmyyyy(date_raw) if date_raw else None
        print('Fetching setlist for', artist, date_norm)
        try:
            js = fetch_setlist_for(artist, date_norm)
            parsed = pick_songs_from_setlist(js) or {}
            concert['setlist'] = {
                'source': parsed.get('source', ''),
                'url': parsed.get('url', ''),
                'songs': parsed.get('songs', [])
            }
        except Exception as e:
            print('Error for', artist, date_norm, e, file=sys.stderr)
            concert['setlist'] = {'source': '', 'url': '', 'songs': []}
        time.sleep(1)
    with open(CONCERTS_PATH, 'w', encoding='utf8') as f:
        json.dump(concerts, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    main()
