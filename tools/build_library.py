"""Build VIKRAM's offline history library.
Usage: python3 tools/build_library.py <raw_dir>
Reads raw public-domain texts from <raw_dir>, extracts the segments in tools/library_spec.py,
cleans them, splits long segments into ~15-minute readings, and writes:
  library/<id>.js   one file per text, loaded on demand
  js/library.js     catalog (shelves, intros, reading list with word counts)
"""
import re, sys, json, os, html
sys.path.insert(0, os.path.dirname(__file__))
from library_spec import SHELVES, TEXTS, QUOTES

RAW = sys.argv[1]
TARGET, MAXW = 2000, 2600  # words per reading (about 15 min at 140 wpm)

def clean_wiki(t):
    t = re.sub(r'<ref[^>]*>.*?</ref>|<ref[^>]*/>', '', t, flags=re.S)
    t = re.sub(r'\{\{header.*?\n\}\}', '', t, flags=re.S | re.I)
    for _ in range(4):
        t = re.sub(r'\{\{(?:center|c|larger|xx-larger|x-larger|smaller|sc|small-caps)\|(?:1=)?([^{}]*)\}\}', r'\1', t, flags=re.I)
    t = re.sub(r'\{\{[^{}]*\}\}', '', t)
    t = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', t)
    t = re.sub(r"'''?", '', t)
    t = re.sub(r'<[^>]+>', '', t)
    return t.replace('---', '—')

def paras(block, verse=False):
    block = re.sub(r'\[Sidenote:[^\]]*\]', '', block, flags=re.S)
    block = re.sub(r'\[Page [^\]]*\]', '', block)
    out = []
    for p in re.split(r'\n\s*\n', block):
        if re.match(r'^\s*\[\d+\]', p): continue  # footnote paragraph
        p = re.sub(r'\[\d+\]|\[ref \d+\]', '', p)
        lines = [l.rstrip() for l in p.split('\n') if l.strip()]
        if not lines: continue
        if verse:
            txt = '\n'.join(l.strip() for l in lines)
        else:
            txt = re.sub(r'\s+', ' ', ' '.join(l.strip() for l in lines)).strip()
        txt = re.sub(r'_([^_]+)_', r'\1', txt)
        out.append(txt)
    return out

def wc(ps): return sum(len(p.split()) for p in ps)

def split(title, ps):
    n = wc(ps)
    if n <= MAXW: return [(title, ps)]
    k = max(2, round(n / TARGET)); size = n / k
    parts, cur, acc = [], [], 0
    for p in ps:
        cur.append(p); acc += len(p.split())
        if acc >= size * (len(parts) + 1) and len(parts) < k - 1:
            parts.append(cur); cur = []
    if cur: parts.append(cur)
    return [(f'{title} ({i + 1}/{len(parts)})', x) for i, x in enumerate(parts)]

def extract(spec):
    raws = spec['raw'] if isinstance(spec['raw'], list) else [spec['raw']]
    texts = [open(os.path.join(RAW, r), encoding='utf-8').read().replace('\r\n', '\n') for r in raws]
    readings = []
    for title, a, b, o in spec['segs']:
        def cut(a, b):
            t = texts[0]
            m = list(re.finditer(a, t, re.M))
            if not m: raise SystemExit(f"{spec['id']}: start not found: {a}")
            m = m[o.get('occurrence', 1) - 1]
            e = re.compile(b, re.M).search(t, m.end())
            if not e: raise SystemExit(f"{spec['id']}: end not found: {b}")
            return t[m.start():(e.end() if o.get('incl_end') else e.start())]
        if 'files' in o:
            block = '\n\n'.join(texts[i] for i in o['files'])
        else:
            block = '\n\n'.join([cut(a, b)] + [cut(x, y) for x, y in o.get('also', [])])
        if spec['kind'] == 'wiki': block = clean_wiki(block)
        ps = paras(block, spec.get('verse'))
        if o.get('skip_first', False) or spec['kind'] == 'gut' and re.match(r'^(CHAPTER|BOOK|FEDERALIST|[IVX]+\.)', ps[0]) and len(ps[0]) < 160:
            ps = ps[int(o.get('skip_first') or 1):]
        # drop chapter-title lines and other short all-caps headings inside the block
        ps = [p for p in ps if not re.match(r'^(\[Thus ends|Printed by|THE END|PUBLIUS|END OF THE)', p)]
        # headings: short all-caps lines, (a. ...) section labels, [editor summaries]
        def head(p):
            if p.isupper() and len(p) < 220: return '## ' + re.sub(r'\b([IiVvXxLl]+)\b', lambda m: m.group(1).upper(), p.title().replace("'S ", "'s ").replace('’S ', '’s '))
            if re.match(r'^\([a-z]\. .*\)$', p) and len(p) < 120: return '## ' + p[4:-1].rstrip('.')
            if p.startswith('[') and p.endswith(']') and len(p) < 300: return '## ' + p[1:-1]
            return p
        ps = [head(p) for p in ps]
        while ps and ps[0].startswith('## Chapter'): ps = ps[1:]
        if spec['kind'] == 'mega':
            ps = [re.sub(r'\(\d+\.\)\s*', '', p) for p in ps]
            ps = [re.sub(r'(?<![\w\-])\d+[a-z]?(?:/\d+[a-z]?)?(?:-\d+)?(?=[A-Z‘“"])', '', p) for p in ps]
            ps = [p for p in ps if not p.startswith(('1. ↑', 'FRAGMENT', 'or an Epitome', '(Diod.'))]
        if spec.get('notes_nums'):
            ps = [re.sub(r'^\d+[.,]\s+', '', p) for p in ps]
            ps = [re.sub(r'(?<=[A-Za-z\),;:.!?’”"]) \d{1,3}(?=[\s,.;:)]|$)', '', p) for p in ps]
        if spec['kind'] == 'gut' and spec['id'] == 'faxian':
            ps = [p for p in ps if not p.startswith('NOTES')]
        ps = [p.replace(' ,', ',') for p in ps if p.strip()]
        readings += split(title, ps)
    return readings

def main():
    os.makedirs('library', exist_ok=True)
    cat = []
    total = 0
    for spec in TEXTS:
        rs = extract(spec)
        data = [{'t': t, 'p': ps} for t, ps in rs]
        with open(f"library/{spec['id']}.js", 'w', encoding='utf-8') as f:
            f.write('/* VIKRAM library: ' + spec['author'] + ', ' + spec['title'] + ' (' + spec['tr'] + '). Public domain. Source: ' + spec['src'] + ' */\n')
            f.write('VK_LIB_LOAD(' + json.dumps(spec['id']) + ', ' + json.dumps(data, ensure_ascii=False) + ');\n')
        meta = {k: spec[k] for k in ('id', 'shelf', 'era', 'title', 'author', 'tr', 'src', 'intro', 'read_for', 'links')}
        meta['verse'] = bool(spec.get('verse'))
        meta['r'] = [[t, wc(ps)] for t, ps in rs]
        cat.append(meta)
        n = sum(x[1] for x in meta['r']); total += n
        print(f"{spec['id']:12} {len(rs):2} readings {n:6} words  " + ' | '.join(f'{x[1]}' for x in meta['r']))
    data_by_id = {}
    for spec in TEXTS:
        s = open(f"library/{spec['id']}.js", encoding='utf-8').read(); data_by_id[spec['id']] = json.loads(s[s.index(', [') + 2:s.rindex(');')])
    quotes = []
    for tid, i, q, why in QUOTES:
        txt = '\n'.join(data_by_id[tid][i]['p'])
        for piece in q.split('…'):
            if piece.strip() not in txt: raise SystemExit(f'quote not found in {tid}[{i}]: {piece[:60]}')
        quotes.append({'id': tid, 'i': i, 'q': q, 'why': why})
    print('quotes verified', len(quotes))
    with open('js/library.js', 'w', encoding='utf-8') as f:
        f.write('/* VIKRAM history library catalog. Generated by tools/build_library.py; edit tools/library_spec.py instead. */\n')
        f.write('const VK_LIBRARY = ' + json.dumps({'SHELVES': SHELVES, 'TEXTS': cat, 'QUOTES': quotes}, ensure_ascii=False, indent=0) + ';\n')
        f.write("if (typeof module !== 'undefined') module.exports = VK_LIBRARY;\n")
    print('total words', total, 'readings', sum(len(c['r']) for c in cat))

main()
