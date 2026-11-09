import re, sys, json
s1 = open('notes/S1_Guesstimates_Structured_Thinking.html', encoding='utf-8').read()
STYLE = re.search(r'<style>.*?</style>', s1, re.S).group(0)
EXTRA = """<style>.back{display:inline-block;margin:0 0 14px;font:12px "DM Mono",monospace;color:var(--green);text-decoration:none}.qa-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.qa-grid div{background:var(--white);border:1px solid var(--line);border-radius:12px;padding:10px 12px;font-size:16px}.qa-grid b{display:block;font:500 12px "DM Mono",monospace;color:var(--orange)}@media(max-width:900px){.qa-grid{grid-template-columns:1fr 1fr}}@media(max-width:640px){.toolbar{display:none}.brand{font-size:13px}}</style>"""
def build(src, out):
    t = open(src, encoding='utf-8').read()
    meta = re.search(r'<!--META(.*?)-->', t, re.S).group(1).strip().split('|')
    code, title, brand, eyebrow, h1, lede, pills = [m.strip() for m in meta]
    body = t[t.index('-->')+3:]
    secs = re.findall(r'<section id="([^"]+)" data-nav="([^"]+)"', body)
    nav = ''.join(f'<a href="#{i}">{l}</a>' for i, l in secs)
    key = 'cdc-' + code.lower() + '-'
    html = f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{code} | {title} — CDC Prep</title>
  {STYLE}
  {EXTRA}
</head>
<body>
  <header class="topbar">
    <div class="brand">{brand}</div>
    <input id="search" class="search" type="search" placeholder="Search this module…" aria-label="Search notes">
    <div class="toolbar"><button class="btn" id="resetChecks">Reset checklist</button><button class="btn" onclick="window.print()">Print / PDF</button></div>
  </header>
  <div class="layout">
    <aside class="nav" aria-label="Contents"><div class="eyebrow">Study route</div>{nav}</aside>
    <main>
      <a class="back" href="../index.html#prep">← Back to VIKRAM</a>
      <div class="hero"><div class="eyebrow">{eyebrow}</div><h1>{h1}</h1><p>{lede}</p><div class="meta">{''.join(f'<span class="pill">{"<span class=dot></span> " if i==0 else ""}{p.strip()}</span>' for i,p in enumerate(pills.split(';')))}</div></div>
{body}
      <div id="none" class="no-results">No match. Try a shorter term.</div>
    </main>
  </div>
  <script>
    const search=document.getElementById('search'), blocks=[...document.querySelectorAll('[data-search]')], none=document.getElementById('none');
    search.addEventListener('input',()=>{{const q=search.value.trim().toLowerCase();let shown=0;blocks.forEach(b=>{{const hit=!q||b.innerText.toLowerCase().includes(q);b.classList.toggle('hidden',!hit);if(hit)shown++}});none.style.display=shown?'none':'block'}});
    const store={{get:k=>{{try{{return localStorage.getItem(k)}}catch(e){{return null}}}},set:(k,v)=>{{try{{localStorage.setItem(k,v)}}catch(e){{}}}},del:k=>{{try{{localStorage.removeItem(k)}}catch(e){{}}}}}};
    const checks=[...document.querySelectorAll('.checkline input')];checks.forEach((c,i)=>{{c.checked=store.get('{key}'+i)==='1';c.addEventListener('change',()=>store.set('{key}'+i,c.checked?'1':'0'))}});
    document.getElementById('resetChecks').addEventListener('click',()=>{{checks.forEach((c,i)=>{{c.checked=false;store.del('{key}'+i)}})}});
    const nav=[...document.querySelectorAll('.nav a')], sections=[...document.querySelectorAll('main section[id]')];
    const obs=new IntersectionObserver(es=>es.forEach(e=>{{if(e.isIntersecting)nav.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id))}}),{{rootMargin:'-20% 0px -70% 0px'}});sections.forEach(s=>obs.observe(s));
  </script>
</body>
</html>'''
    open(out, 'w', encoding='utf-8').write(html)
    print(out, len(html), 'sections', len(secs), 'details', html.count('<details>'))
if __name__ == '__main__':
    build(sys.argv[1], sys.argv[2])
