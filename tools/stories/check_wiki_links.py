import json, urllib.request, urllib.parse, ssl, os, time, sys
UA = 'VIKRAM-study-app/1.0 (personal offline study app; github vikram007sage)'
ctx = ssl.create_default_context(cafile=os.path.expanduser('~/.ccr/ca-bundle.crt'))
slugs = [l.strip() for l in open(sys.argv[1]) if l.strip()]
bad = []
for i in range(0, len(slugs), 50):
    chunk = slugs[i:i+50]; titles = [urllib.parse.unquote(s).replace('_', ' ') for s in chunk]
    u = 'https://en.wikipedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'titles': '|'.join(titles), 'format': 'json', 'redirects': 1, 'formatversion': 2})
    for k in range(6):
        try: d = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA}), context=ctx, timeout=40)); break
        except Exception as e: print('retry', e, file=sys.stderr); time.sleep(15 * (k + 1))
    norm = {n['from']: n['to'] for n in d['query'].get('normalized', [])}
    redir = {r['from']: r['to'] for r in d['query'].get('redirects', [])}
    pages = {p['title']: p for p in d['query']['pages']}
    for s, t in zip(chunk, titles):
        t2 = norm.get(t, t); t3 = redir.get(t2, t2); p = pages.get(t3)
        if not p or p.get('missing') or p.get('invalid'): bad.append((s, 'MISSING'))
        elif t3 != t2: bad.append((s, 'redirect -> ' + t3))
    time.sleep(3)
print('checked', len(slugs)); [print(b) for b in bad]
