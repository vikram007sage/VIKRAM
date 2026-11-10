import json, sys, time, urllib.request, urllib.parse, os, ssl, re, html
UA = 'VIKRAM-study-app/1.0 (personal offline study app; github vikram007sage)'
ctx = ssl.create_default_context(cafile=os.path.expanduser('~/.ccr/ca-bundle.crt')) if os.path.exists(os.path.expanduser('~/.ccr/ca-bundle.crt')) else None
def api(params):
    u = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(dict(params, format='json'))
    for k in range(4):
        try:
            r = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA}), context=ctx, timeout=40); return json.load(r)
        except Exception as e:
            print('  retry', e, file=sys.stderr); time.sleep(10 * (k + 1))
def strip(s): return html.unescape(re.sub(r'<[^>]+>', '', s or '')).strip()
out = {}
for q in [l.strip() for l in open(sys.argv[1]) if l.strip()]:
    d = api({'action': 'query', 'generator': 'search', 'gsrnamespace': 6, 'gsrsearch': q + ' filetype:bitmap', 'gsrlimit': 6, 'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size', 'iiurlwidth': 900})
    res = []
    for p in sorted((d or {}).get('query', {}).get('pages', {}).values(), key=lambda x: x.get('index', 0)):
        ii = p['imageinfo'][0]; m = ii.get('extmetadata', {})
        res.append({'title': p['title'], 'lic': strip(m.get('LicenseShortName', {}).get('value')), 'artist': strip(m.get('Artist', {}).get('value'))[:80], 'w': ii.get('width'), 'h': ii.get('height'), 'thumb': ii.get('thumburl'), 'page': ii.get('descriptionurl'), 'desc': strip(m.get('ImageDescription', {}).get('value'))[:120]})
    out[q] = res
    print('==', q); [print('  ', i, r['lic'], '|', r['title'][5:80], '|', r['w'], 'x', r['h'], '|', r['desc'][:70]) for i, r in enumerate(res)]
    time.sleep(3)
json.dump(out, open(sys.argv[2], 'w'), indent=1)
