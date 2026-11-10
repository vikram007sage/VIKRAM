/* VIKRAM · extras: Year in VIKRAM (#year) and select-a-word-to-define (works in stories, the explorer, the Gita and the shelf). */
(function () {
  const X = window.VK_EXT = window.VK_EXT || { views: {}, binds: {}, acts: {}, tabs: [], boot: [] };
  X.boot = X.boot || []; X.tabs.push('year'); let K = null, Y = null; const C = VK_CONTENT;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  X.views.year = function () {
    const S = K.S(), now = K.nowIST().date; Y = Y || now.slice(0, 4); const inY = ds => ds.slice(0, 4) === Y;
    const days = Object.keys(S.days || {}).filter(inY).sort(), F = (S.focus || []).filter(f => inY(f.d));
    const used = days.filter(d => Object.values(S.days[d].items || {}).some(x => x.v) || F.some(f => f.d === d));
    const fm = F.reduce((a, f) => a + f.mins, 0), byM = Array(12).fill(0); F.forEach(f => byM[+f.d.slice(5, 7) - 1] += f.mins); const mx = Math.max(1, ...byM);
    let best = 0, run = 0, prev = null; used.forEach(d => { run = prev && K.addDays(prev, 1) === d ? run + 1 : 1; best = Math.max(best, run); prev = d; });
    const ticks = {}; days.forEach(d => Object.keys(S.days[d].items || {}).forEach(id => { if (S.days[d].items[id].v) ticks[id] = (ticks[id] || 0) + 1; }));
    const hname = id => (C.HABITS.find(h => h.id === id) || {}).t || ((S.my && S.my.habits && S.my.habits[id]) || {}).t || id;
    const top = Object.keys(ticks).sort((a, b) => ticks[b] - ticks[a]).slice(0, 6), sum = k => days.reduce((a, d) => a + ((S.days[d][k] && S.days[d][k].n) || 0), 0);
    const es = Object.values(S.essays || {}).filter(e => !e.del && inY(e.ds || '')), ew = es.reduce((a, e) => a + (String(e.b || '').trim().match(/\S+/g) || []).length, 0);
    const pr = (S.practice || []).filter(p => inY(p.d)), q = pr.reduce((a, p) => a + (p.n || 0), 0), ok = pr.reduce((a, p) => a + (p.sc || 0), 0);
    const t0 = Date.parse(Y + '-01-01T00:00:00+05:30'), t1 = Date.parse((+Y + 1) + '-01-01T00:00:00+05:30'), done = Object.values(S.tasks || {}).filter(t => t.done && t.ts >= t0 && t.ts < t1).length;
    const kept = Object.values((S.gita && S.gita.saved) || {}).filter(x => x.v && x.ts >= t0 && x.ts < t1).length, refl = Object.values((S.gita && S.gita.notes) || {}).filter(x => x.t && x.ts >= t0 && x.ts < t1).length;
    const stat = (n, l) => `<div class="ystat"><b>${n}</b><small>${l}</small></div>`;
    return `<section class="hero small"><div class="eyebrow">Year in VIKRAM</div><h1>${Y}</h1><div class="row"><button class="btn sm ghost" data-act="y-go" data-d="-1">← ${+Y - 1}</button>${Y < now.slice(0, 4) ? `<button class="btn sm ghost" data-act="y-go" data-d="1">${+Y + 1} →</button>` : ''}</div></section>
    ${used.length ? `<div class="card"><div class="ygrid">${stat(used.length, 'days used')}${stat((fm / 60).toFixed(0) + ' h', 'verified focus')}${stat(best, 'longest run of days')}${stat(done, 'tasks and goals done')}${stat(sum('st'), 'story cards')}${stat(sum('gv'), 'Gita verses read')}${stat(kept, 'verses kept')}${stat(refl, 'reflections')}${stat(es.length, 'pieces written')}${stat(ew, 'words written')}${stat(q, 'aptitude questions')}${stat(q ? Math.round(100 * ok / q) + '%' : '–', 'accuracy')}</div></div>
    <div class="card"><div class="eyebrow">Focus hours by month</div><div class="ybars">${byM.map((m, i) => `<div><i style="height:${Math.round(90 * m / mx)}px" title="${(m / 60).toFixed(1)} h"></i><small>${'JFMAMJJASOND'[i]}</small></div>`).join('')}</div></div>
    <div class="card"><div class="eyebrow">Habits you kept most</div>${top.map(id => `<div class="snrow"><span>${esc(hname(id))}</span><b>${ticks[id]} days</b></div>`).join('') || '<p class="muted">No habits ticked yet.</p>'}</div>` : `<div class="card"><p class="muted">Nothing logged in ${Y}.</p></div>`}`;
  };
  X.acts['y-go'] = a => { Y = String(+Y + +a.dataset.d); K.render(); };
  // ---------- define a selected word ----------
  let chip = null, word = '';
  const hide = () => { if (chip) chip.classList.remove('show'); };
  function onSel() { const s = window.getSelection && window.getSelection(), t = s ? String(s).trim() : ''; const n = s && s.anchorNode && (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement);
    if (!/^[A-Za-z][A-Za-z'-]{2,23}$/.test(t) || !n || !n.closest('.sbody,.xbody,.gcard,.feedcard,.reader,.rd')) return hide();
    word = t.toLowerCase(); if (!chip) { chip = document.createElement('div'); chip.id = 'defchip'; document.body.appendChild(chip); }
    chip.innerHTML = `<button class="btn sm" data-act="def-go">Define “${esc(word)}”</button>`; chip.classList.add('show'); }
  X.acts['def-go'] = function () { chip.innerHTML = '<span class="muted">Looking up…</span>'; fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word)).then(r => r.ok ? r.json() : null).catch(() => null).then(d => {
      const m = d && d[0] && d[0].meanings && d[0].meanings[0], def = m && m.definitions && m.definitions[0];
      if (!def) { chip.innerHTML = `<span>No definition found${navigator.onLine ? '' : ' (offline)'}.</span> <a class="lnk" href="https://en.wiktionary.org/wiki/${encodeURIComponent(word)}" target="_blank" rel="noopener">Wiktionary ↗</a> <button class="btn sm ghost" data-act="def-x">✕</button>`; return; }
      chip.innerHTML = `<div><b>${esc(word)}</b> <small class="muted">${esc(m.partOfSpeech || '')}</small><p>${esc(def.definition)}</p><div class="row"><button class="btn sm" data-act="lv-addw" data-w="${esc(word)}" data-p="${esc(m.partOfSpeech || '')}" data-d="${esc(def.definition)}">＋ Add to my words</button><button class="btn sm ghost" data-act="def-x">✕</button></div></div>`; }); };
  X.acts['def-x'] = hide;
  X.boot.push(kit => { K = kit; document.addEventListener('selectionchange', K.debounce(onSel, 350)); });
})();
