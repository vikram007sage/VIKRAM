/* VIKRAM · live layer. Pulls fresh cards from free public APIs so the app never runs out:
   Wikipedia (on this day, topics, endless "go deeper"), Tatoeba (French sentences), Datamuse (new English words), Lichess (daily puzzle link).
   Rule: nothing here is required. If an API is down or the phone is offline, every function returns nothing and the bundled content shows instead. */
(function () {
  const X = window.VK_EXT = window.VK_EXT || { views: {}, binds: {}, acts: {}, tabs: [], boot: [] };
  X.boot = X.boot || []; let K = null;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const J = (url, ms) => { const c = typeof AbortController !== 'undefined' ? new AbortController() : null; const t = setTimeout(() => c && c.abort(), ms || 9000); return fetch(url, c ? { signal: c.signal } : {}).then(r => r.ok ? r.json() : null).catch(() => null).then(d => { clearTimeout(t); return d; }); };
  const WIKI = 'https://en.wikipedia.org/w/api.php?format=json&origin=*&';
  const shuf = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
  const C = (() => { try { return JSON.parse(localStorage.getItem('vikram_live')) || {}; } catch (e) { return {}; } })();
  ['wq', 'fq', 'eq', 'gq'].forEach(k => C[k] = C[k] || []); C.seen = C.seen || {};
  const keep = () => { try { const s = Object.keys(C.seen); if (s.length > 3000) s.slice(0, 1000).forEach(k => delete C.seen[k]); localStorage.setItem('vikram_live', JSON.stringify(C)); } catch (e) { } };
  const L = () => { const S = K.S(); S.live = S.live || {}; S.live.words = S.live.words || {}; return S.live; };
  const bump = k => { const ds = K.nowIST().date, d = K.day(ds); d.lv = d.lv || {}; d.lv[k] = (d.lv[k] || 0) + 1; d.lv.ts = K.ts(); K.save(); };

  const TOPICS = {
    psych: ['Psychology', 'Cognitive_biases|Social_psychology_concepts|Psychological_concepts|Motivation|Behavioral_economics'],
    phil: ['Philosophy', 'Stoicism|Concepts_in_ethics|Philosophical_concepts|Hindu_philosophical_concepts|Thought_experiments'],
    geo: ['Geopolitics', 'Geopolitics|Foreign_relations_of_India|International_relations_theory|Territorial_disputes_of_India|Geopolitical_rivalry'],
    india: ['Indian history', 'Indian_independence_movement|Maurya_Empire|Mughal_Empire|Empires_and_kingdoms_of_India|Vijayanagara_Empire'],
    world: ['World history', 'Roman_Empire|French_Revolution|Cold_War|Napoleonic_Wars|Ancient_Greece'],
    biz: ['Business & economics', 'Economics_terminology|Business_models|Financial_crises|Strategic_management|Economic_bubbles'],
    sci: ['Science', 'Biotechnology|Space_exploration|Physical_paradoxes|History_of_science|Evolutionary_biology']
  };
  // ---------- Wikipedia ----------
  const pageOf = p => ({ title: p.title, x: (p.extract || '').trim(), img: p.thumbnail && p.thumbnail.source, d: p.description || '' });
  function topicBatch(key, cb) { const t = TOPICS[key]; J(WIKI + 'action=query&generator=search&gsrsearch=' + encodeURIComponent('incategory:' + t[1]) + '&gsrsort=random&gsrlimit=8&gsrnamespace=0&prop=extracts%7Cpageimages%7Cdescription&exintro=1&explaintext=1&exlimit=8&piprop=thumbnail&pithumbsize=900').then(d => { const ps = d && d.query ? Object.values(d.query.pages).map(pageOf).filter(p => p.x.length > 200 && !/^List of|\(disambiguation\)/.test(p.title)) : []; cb(ps.map(p => Object.assign(p, { tag: t[0] }))); }); }
  function onThisDay(cb) { const n = K.nowIST().date; if (C.otd && C.otd.ds === n) return cb(C.otd.items); J('https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/' + n.slice(5, 7) + '/' + n.slice(8, 10)).then(d => { if (!d || !d.selected) return cb((C.otd && C.otd.items) || []); C.otd = { ds: n, items: d.selected.slice(0, 14).map(e => { const p = (e.pages || []).find(q => q.thumbnail) || (e.pages || [])[0] || {}; return { y: e.year, t: e.text, title: p.title ? p.title.replace(/_/g, ' ') : '', img: p.thumbnail && p.thumbnail.source }; }) }; keep(); cb(C.otd.items); }); }
  function news(cb) { const n = K.nowIST().date; if (C.news && C.news.ds === n) return cb(C.news.items); J('https://en.wikipedia.org/api/rest_v1/feed/featured/' + n.replace(/-/g, '/')).then(d => { if (!d || !d.news) return cb((C.news && C.news.items) || []); C.news = { ds: n, items: d.news.slice(0, 8).map(x => { const p = (x.links || []).find(q => q.thumbnail) || (x.links || [])[0] || {}; return { t: String(x.story || '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(), title: (p.title || '').replace(/_/g, ' '), img: p.thumbnail && p.thumbnail.source }; }).filter(x => x.t && x.title) }; keep(); cb(C.news.items); }); }
  let busy = {};
  function refill() {
    if (!navigator.onLine) return;
    if (C.wq.length < 4 && !busy.w) { busy.w = 1; const key = shuf(Object.keys(TOPICS))[0]; topicBatch(key, ps => { ps.filter(p => !C.seen['w:' + p.title]).forEach(p => C.wq.push({ k: 'wiki', title: p.title, x: p.x.slice(0, 900), img: p.img, tag: p.tag })); onThisDay(items => { items.filter(e => e.title && !C.seen['o:' + e.y + e.title]).slice(0, 3).forEach(e => C.wq.push({ k: 'otd', y: e.y, x: e.t, title: e.title, img: e.img })); news(ns => { ns.filter(e => !C.seen['n:' + e.t.slice(0, 40)]).slice(0, 2).forEach(e => C.wq.push({ k: 'news', x: e.t, title: e.title, img: e.img })); C.wq = shuf(C.wq); busy.w = 0; keep(); }); }); }); }
    if (C.fq.length < 4 && !busy.f) { busy.f = 1; J('https://api.tatoeba.org/unstable/sentences?lang=fra&trans%3Alang=eng&sort=random&limit=30').then(d => { ((d && d.data) || []).forEach(s => { const tr = (s.translations || []).flat().filter(t => t && t.lang === 'eng'); const en = (tr.find(t => t.is_direct) || tr[0] || {}).text; if (en && s.text.length < 80 && !C.seen['f:' + s.id]) C.fq.push({ id: s.id, fr: s.text, en, by: s.owner || '' }); }); busy.f = 0; keep(); }); }
    if (C.eq.length < 4 && !busy.e) { busy.e = 1; const base = typeof VK_WORDS !== 'undefined' ? VK_WORDS.SETS.flatMap(s => s.w.map(w => w[0])) : ['resilient', 'candid']; const mine = Object.keys(L().words); const seed = shuf(base.concat(mine))[0];
      J('https://api.datamuse.com/words?ml=' + encodeURIComponent(seed) + '&md=dpf&max=60').then(d => { const known = new Set(base.map(w => w.toLowerCase())); shuf(d || []).forEach(w => { const f = +((w.tags || []).find(t => t.startsWith('f:')) || 'f:0').slice(2), def = (w.defs || [])[0]; if (!def || !/^[a-z]{5,}$/.test(w.word) || f > 9 || f < 0.15 || known.has(w.word) || C.seen['e:' + w.word] || C.eq.length > 14) return; const m = def.split('\t'); C.eq.push({ w: w.word, p: ({ n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb' })[m[0]] || m[0], d: (m[1] || '').replace(/^\([^)]*\)\s*/, '').trim(), from: seed }); }); busy.e = 0; keep(); }); }
    if (C.gq.length < 3 && X.gita && !busy.g) { busy.g = 1; const c = 2 + Math.floor(Math.random() * 17); X.gita.load(c, ok => { if (ok) { const V = X.gita.data[c]; shuf(V.map((v, i) => i)).slice(0, 4).forEach(i => C.gq.push({ c, v: i + 1, t: V[i][4] || V[i][5] })); } busy.g = 0; keep(); }); }
  }
  // ---------- feed cards ----------
  let cur = null;
  const cardHtml = it => {
    if (it.k === 'wiki' || it.k === 'otd' || it.k === 'news') return { h: it.k === 'otd' ? 'On this day.' : it.k === 'news' ? 'In the world.' : 'Something new.', html: `<div class="feedcard k-history lv">${it.img ? `<div class="lvimg" style="background-image:url('${esc(it.img)}')"></div>` : ''}<div class="eyebrow">${it.k === 'otd' ? 'On this day · ' + it.y : it.k === 'news' ? 'In the news · Wikipedia' : esc(it.tag) + ' · Wikipedia'}</div><h2>${esc(it.k === 'wiki' ? it.title : it.x)}</h2>${it.k === 'wiki' ? `<p class="lvx">${esc(it.x)}</p>` : ''}<div class="row"><button class="btn sm" data-act="x-open" data-t="${esc(it.title)}">Go deeper ›</button><a class="lnk" href="https://en.wikipedia.org/wiki/${encodeURIComponent(it.title.replace(/ /g, '_'))}" target="_blank" rel="noopener">Wikipedia ↗</a></div></div>` };
    if (it.k === 'fr') return { h: 'Une phrase.', html: `<div class="feedcard k-french lv"><div class="eyebrow">Français · live from Tatoeba</div><h2>${esc(it.fr)} <button class="btn sm ghost" data-act="l-say" data-t="${esc(it.fr)}">🔊</button></h2><div class="ans hide" id="ans">${esc(it.en)}</div><button class="btn sm" data-act="reveal">Reveal meaning</button></div>` };
    if (it.k === 'en') { const has = L().words[it.w] && L().words[it.w].v; return { h: 'A new word.', html: `<div class="feedcard k-words lv"><div class="eyebrow">New word · ${esc(it.p)}</div><h2>${esc(it.w)} <button class="btn sm ghost" data-act="w-say" data-t="${esc(it.w)}">🔊</button></h2><div class="ans hide" id="ans">${esc(it.d)}<br><span class="muted">related to “${esc(it.from)}”</span></div><div class="row"><button class="btn sm" data-act="reveal">Reveal meaning</button><button class="btn sm ghost" data-act="lv-addw" data-w="${esc(it.w)}" data-p="${esc(it.p)}" data-d="${esc(it.d)}">${has ? '✓ In my words' : '＋ Add to my words'}</button><a class="lnk" href="https://en.wiktionary.org/wiki/${encodeURIComponent(it.w)}" target="_blank" rel="noopener">dictionary ↗</a></div></div>` }; }
    if (it.k === 'gita') return { h: 'From the Gita.', html: `<div class="feedcard k-gita lv"><div class="eyebrow">Bhagavad Gita · ${it.c}.${it.v}</div><h2 class="quote">${esc(it.t)}</h2><button class="btn sm" data-act="g-open" data-c="${it.c}" data-v="${it.v}" data-one="1">Open with meaning</button></div>` };
  };
  const take = k => { const q = { wiki: C.wq, fr: C.fq, en: C.eq, gita: C.gq }[k], it = q.shift(); if (!it) return null; if (k === 'fr') { it.k = 'fr'; C.seen['f:' + it.id] = 1; } else if (k === 'en') { it.k = 'en'; C.seen['e:' + it.w] = 1; } else if (k === 'gita') it.k = 'gita'; else if (it.k === 'news') C.seen['n:' + it.x.slice(0, 40)] = 1; else C.seen[(it.k === 'otd' ? 'o:' + it.y : 'w:') + it.title] = 1; keep(); return it; };
  X.feedCard = function (n) {
    if (!K) return null; const kind = [null, 'wiki', null, 'gita', 'fr', 'en', 'wiki', null][n % 8];
    if (cur && cur.n === n) return cur.it ? cardHtml(cur.it) : null;
    const it = kind ? take(kind) : null; cur = { n, it }; setTimeout(refill, 50); if (it) bump('feed'); return it ? cardHtml(it) : null;
  };
  // ---------- explorer: any Wikipedia topic as a card, with "keep going" links (the rabbit hole) ----------
  const E = {
    stack: [],
    layer() { let l = document.getElementById('xl'); if (!l) { l = document.createElement('div'); l.id = 'xl'; l.className = 'xl'; document.body.appendChild(l); } return l; },
    open(title, push) { const l = this.layer(); l.classList.add('show'); document.body.classList.add('noscroll'); if (push !== false) this.stack.push(title);
      l.innerHTML = `<div class="xtop"><button class="gx" data-act="x-close">✕</button><b>${esc(title)}</b><span class="gcount">${this.stack.length > 1 ? this.stack.length + ' deep' : ''}</span></div><div class="xcard"><p class="gmsg">Fetching from Wikipedia…</p></div>`;
      J(WIKI + 'action=query&redirects=1&prop=extracts%7Cpageimages%7Cdescription&exintro=1&explaintext=1&piprop=thumbnail&pithumbsize=1000&titles=' + encodeURIComponent(title)).then(d => {
        if (this.stack[this.stack.length - 1] !== title) return; const p = d && d.query && Object.values(d.query.pages)[0];
        if (!p || p.missing !== undefined || !p.extract) { l.querySelector('.xcard').innerHTML = `<p class="gmsg">${navigator.onLine ? 'Wikipedia has no summary for this.' : 'You are offline. This part needs internet.'}</p><a class="btn" href="https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}" target="_blank" rel="noopener">Open on Wikipedia ↗</a>`; return; }
        bump('wiki'); const url = 'https://en.wikipedia.org/wiki/' + encodeURIComponent(p.title.replace(/ /g, '_'));
        l.querySelector('.xcard').innerHTML = `${p.thumbnail ? `<div class="ximg" style="background-image:url('${esc(p.thumbnail.source)}')"></div>` : ''}<div class="xbody"><div class="eyebrow">${esc(p.description || 'Wikipedia')}</div><h2>${esc(p.title)}</h2>${p.extract.split(/\n+/).filter(Boolean).map(x => '<p>' + esc(x) + '</p>').join('')}<div class="row"><a class="btn sm" href="${url}" target="_blank" rel="noopener">Read the full article ↗</a>${this.stack.length > 1 ? '<button class="btn sm ghost" data-act="x-back">← Back</button>' : ''}</div><div class="eyebrow xk">Keep going</div><div class="chips" id="xRel"><span class="muted small">finding related topics…</span></div><p class="muted small">Text from Wikipedia (CC BY-SA). Written by volunteers: check the article's sources for anything important.</p></div>`;
        l.querySelector('.xcard').scrollTop = 0;
        J(WIKI + 'action=query&list=search&srnamespace=0&srlimit=10&srsearch=' + encodeURIComponent('morelike:' + p.title)).then(r => { const el = document.getElementById('xRel'); if (!el) return; const rs = ((r && r.query && r.query.search) || []).filter(s => !/^List of/.test(s.title)); el.innerHTML = rs.length ? rs.map(s => `<button class="chip" data-act="x-open" data-t="${esc(s.title)}">${esc(s.title)}</button>`).join('') : '<span class="muted small">No related topics found.</span>'; });
      }); },
    back() { this.stack.pop(); const t = this.stack[this.stack.length - 1]; if (t) this.open(t, false); else this.close(); },
    close() { this.stack = []; const l = this.layer(); l.classList.remove('show'); l.innerHTML = ''; if (!document.querySelector('.gl.show') && !document.querySelector('#overlay.show')) document.body.classList.remove('noscroll'); }
  };
  // ---------- endless drills (French sentences, new words) ----------
  const D = {
    open(kind) { this.kind = kind; this.n = 0; E.layer().classList.add('show'); document.body.classList.add('noscroll'); this.show(); },
    show() { const l = E.layer(), q = this.kind === 'fr' ? C.fq : C.eq; refill(); const it = this.it = take(this.kind);
      const top = `<div class="xtop"><button class="gx" data-act="x-close">✕</button><b>${this.kind === 'fr' ? 'Endless French' : 'Endless new words'}</b><span class="gcount">${this.n} done</span></div>`;
      if (!it) { l.innerHTML = top + `<div class="xcard"><p class="gmsg">${navigator.onLine ? 'Fetching more…' : 'You are offline. This part needs internet; the built-in lessons still work.'}</p></div>`; if (navigator.onLine && (this.tries = (this.tries || 0) + 1) < 8) setTimeout(() => { if (this.kind && E.layer().classList.contains('show') && !this.it) this.show(); }, 1500); return; }
      this.tries = 0; bump(this.kind);
      l.innerHTML = top + `<div class="xcard"><div class="xbody dr">${this.kind === 'fr' ? `<div class="eyebrow">Say it aloud, then check</div><h2>${esc(it.fr)}</h2><button class="btn sm ghost" data-act="l-say" data-t="${esc(it.fr)}">🔊 Listen</button><div class="ans hide" id="dAns">${esc(it.en)}</div><p class="muted small">Sentence from Tatoeba (CC BY)${it.by ? ', by ' + esc(it.by) : ''}.</p>` : `<div class="eyebrow">${esc(it.p)} · related to “${esc(it.from)}”</div><h2>${esc(it.w)}</h2><button class="btn sm ghost" data-act="w-say" data-t="${esc(it.w)}">🔊 Listen</button><div class="ans hide" id="dAns">${esc(it.d)}</div><div class="row"><button class="btn sm ghost" data-act="lv-addw" data-w="${esc(it.w)}" data-p="${esc(it.p)}" data-d="${esc(it.d)}">＋ Add to my words</button><a class="lnk" href="https://en.wiktionary.org/wiki/${encodeURIComponent(it.w)}" target="_blank" rel="noopener">dictionary ↗</a></div>`}</div></div><div class="gnav"><button class="btn ghost" data-act="d-rev">Reveal</button><button class="btn" data-act="d-next">Next →</button></div>`; },
    next() { this.n++; this.show(); }
  };
  // ---------- Learn tab extras + Explore home ----------
  X.learnExtra = function (tab) {
    if (tab === 'history') { const otd = (C.otd && C.otd.ds === K.nowIST().date && C.otd.items) || [];
      return `<div class="card"><div class="eyebrow">Explore · endless, from Wikipedia</div><p class="muted small">Pick a topic for a random article, then keep tapping "Keep going". It never runs out.</p><div class="chips">${Object.keys(TOPICS).map(k => `<button class="chip" data-act="x-topic" data-k="${k}">${TOPICS[k][0]}</button>`).join('')}</div><div class="row xs"><input id="xSearch" placeholder="Or look up anything: Chanakya, Stoicism, Suez Crisis…"><button class="btn sm" data-act="x-search">Go</button></div>
      ${otd.length ? `<div class="eyebrow xk">On this day</div>${otd.slice(0, 5).map(e => `<button class="gnote" data-act="x-open" data-t="${esc(e.title)}"><b>${e.y}</b> ${esc(e.t)}</button>`).join('')}` : ''}
      ${C.news && C.news.items && C.news.items.length ? `<div class="eyebrow xk">In the news · world affairs</div>${C.news.items.slice(0, 6).map(e => `<button class="gnote" data-act="x-open" data-t="${esc(e.title)}">${esc(e.t)}</button>`).join('')}` : ''}</div>`; }
    if (tab === 'french') return `<button class="card nextcard" data-act="d-open" data-k="fr"><span><b>Endless French sentences</b><small>Real sentences with English, new ones every time (Tatoeba)</small></span><span class="go">▶</span></button>`;
    if (tab === 'words') { const n = Object.keys(L().words).filter(k => L().words[k].v).length; return `<button class="card nextcard" data-act="d-open" data-k="en"><span><b>Endless new words</b><small>Fresh words related to the ones you know. ${n ? n + ' added to your quizzes so far.' : 'Add the good ones to your quizzes.'}</small></span><span class="go">▶</span></button>`; }
    if (tab === 'chess') return `<div class="card"><div class="eyebrow">More puzzles, forever</div><p class="muted small">Lichess has millions of free puzzles and a new daily one. No account needed.</p><div class="row"><a class="btn sm" href="https://lichess.org/training/daily" target="_blank" rel="noopener">Today's Lichess puzzle ↗</a><a class="btn sm ghost" href="https://lichess.org/training/themes" target="_blank" rel="noopener">Puzzles by theme ↗</a></div></div>`;
    return '';
  };
  Object.assign(X.acts, {
    'x-open'(a, e) { e && e.preventDefault(); E.open(a.dataset.t.replace(/_/g, ' ')); },
    'x-close'() { D.kind = null; E.close(); K.render(); }, 'x-back'() { E.back(); },
    'x-topic'(a) { const k = a.dataset.k; K.toast('Finding something in ' + TOPICS[k][0] + '…'); topicBatch(k, ps => { const p = shuf(ps)[0]; if (p) E.open(p.title); else K.toast(navigator.onLine ? 'Nothing came back. Try again.' : 'You are offline.'); }); },
    'x-search'() { const v = (document.getElementById('xSearch').value || '').trim(); if (!v) return; J(WIKI + 'action=query&list=search&srlimit=1&srsearch=' + encodeURIComponent(v)).then(r => { const s = r && r.query && r.query.search[0]; if (s) E.open(s.title); else K.toast(navigator.onLine ? 'No article found.' : 'You are offline.'); }); },
    'd-open'(a) { D.open(a.dataset.k === 'fr' ? 'fr' : 'en'); }, 'd-next'() { D.next(); }, 'd-rev'() { const x = document.getElementById('dAns'); x && x.classList.remove('hide'); },
    'lv-addw'(a) { const w = a.dataset.w; L().words[w] = { v: true, p: a.dataset.p, d: a.dataset.d, x: '', ts: K.ts() }; K.save(); a.textContent = '✓ In my words'; K.toast('Added "' + w + '" to your word quizzes'); }
  });
  X.live = { refill, cache: C };
  X.boot.push(kit => { K = kit; setTimeout(() => { refill(); onThisDay(() => { }); news(() => { }); }, 1200); window.addEventListener('online', refill); });
})();
