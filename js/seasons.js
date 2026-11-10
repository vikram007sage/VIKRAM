/* VIKRAM · Seasons. One assistant for every phase: placement prep → job + gym → travel → UPSC/MBA.
   The plan is a dated list (settings.seasonPlan), so a season can be scheduled ahead and past days keep their own schedule.
   Per season you can hide built-in habits, add your own habits and add your own goals (S.my). */
(function () {
  const X = window.VK_EXT = window.VK_EXT || { views: {}, binds: {}, acts: {}, tabs: [], boot: [] };
  X.boot = X.boot || []; X.tabs.push('seasons'); let K = null; const C = VK_CONTENT;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const my = () => { const S = K.S(); S.my = S.my || {}; ['habits', 'tasks', 'off'].forEach(k => S.my[k] = S.my[k] || {}); return S.my; };
  const plan = () => ((K.S().settings.seasonPlan || {}).list || []).slice();
  const setPlan = l => { K.S().settings.seasonPlan = { list: l.sort((a, b) => a.from < b.from ? -1 : 1), ts: K.ts() }; C.setPlan(K.S().settings.seasonPlan); K.save(); };
  X.views.seasons = function () {
    const ds = K.nowIST().date, cur = C.seasonAt(ds), pl = plan(), m = my();
    const since = (pl.filter(x => x.id === cur.id && x.from <= ds).pop() || {}).from;
    const next = pl.find(x => x.from > ds);
    const act = K.activeItems(ds), hab = id => (C.HABITS.find(h => h.id === id) || {}).t || (m.habits[id] || {}).t || id;
    const off = Object.keys(m.off).filter(k => m.off[k].v && k.startsWith(cur.id + ':')).map(k => k.split(':')[1]);
    const tasks = Object.keys(m.tasks).filter(k => m.tasks[k].v && m.tasks[k].season === cur.id);
    return `<section class="hero small"><div class="eyebrow">Your season${since ? ' · since ' + K.fmtD(since) : ''}</div><h1>${esc(cur.n)}</h1><p>${esc(cur.g)}</p>${next ? `<div class="meta"><span class="pill">Next: ${esc(C.SEASONS.find(s => s.id === next.id).n)} from ${K.fmtD(next.from)} ${next.from.slice(0, 4)}</span></div>` : ''}</section>
    <div class="card"><div class="eyebrow">Life plan</div><p class="muted small">Tap "Start today" when life changes, or set a date and VIKRAM switches by itself that morning. Schedule, habits and reminders all follow the season.</p>
      ${C.SEASONS.map(s => { const p = pl.filter(x => x.id === s.id && x.from > ds)[0]; const on = s.id === cur.id; return `<div class="sn ${on ? 'on' : ''}"><div><b>${esc(s.n)}</b>${on ? ' <span class="tag">now</span>' : ''}<small>${esc(s.g)}</small><small class="muted">${s.types.map(t => C.SCHEDULES[t].name.split(' (')[0]).join(' · ')}</small></div>${on ? '' : `<div class="snb"><input type="date" data-sdate="${s.id}" value="${p ? p.from : ''}" min="${K.addDays(ds, 1)}"><button class="btn sm" data-act="sn-now" data-id="${s.id}">Start today</button></div>`}</div>`; }).join('')}
      ${pl.some(x => x.from > ds) ? '<button class="btn sm ghost" data-act="sn-clear">Clear planned dates</button>' : ''}</div>
    <div class="card"><div class="eyebrow">Habits this season</div><p class="muted small">✕ hides a habit you will never do. Add your own below. Fewer habits you actually keep beat a long list.</p>
      ${act.map(id => `<div class="snrow"><span>${esc(hab(id))}</span><button class="btn sm ghost" data-act="sn-hide" data-id="${id}" aria-label="Hide">✕</button></div>`).join('')}
      ${off.length ? `<p class="muted small">Hidden: ${off.map(id => `<button class="chip" data-act="sn-show" data-id="${id}">${esc(hab(id))} ↩</button>`).join(' ')}</p>` : ''}
      <div class="row xs"><input id="snH" placeholder="Add a habit, e.g. Call home"><button class="btn sm" data-act="sn-addh">Add</button></div></div>
    <div class="card"><div class="eyebrow">Goals this season</div><p class="muted small">These show up on Today until you tick them.</p>
      ${tasks.map(id => `<div class="snrow"><span class="${(K.S().tasks[id] || {}).done ? 'muted' : ''}">${(K.S().tasks[id] || {}).done ? '✓ ' : ''}${esc(m.tasks[id].t)}</span><button class="btn sm ghost" data-act="sn-delt" data-id="${id}" aria-label="Remove">✕</button></div>`).join('')}
      <div class="row xs"><input id="snT" placeholder="Add a goal, e.g. Bench 60 kg"><button class="btn sm" data-act="sn-addt">Add</button></div></div>
    <p class="muted small center">Block times for each day type can be edited in More → Edit block times. The placement roadmap in Prep stays as it is.</p>`;
  };
  X.binds.seasons = function () { document.querySelectorAll('[data-sdate]').forEach(i => i.onchange = () => { const ds = K.nowIST().date, id = i.dataset.sdate; const l = plan().filter(x => !(x.id === id && x.from > ds)); if (i.value && i.value > ds) l.push({ id, from: i.value }); setPlan(l); K.toast(i.value ? 'Planned' : 'Date cleared'); K.render(); }); };
  const add = (kind, inp) => { const el = document.getElementById(inp), t = (el.value || '').trim(); if (!t) return; const ds = K.nowIST().date; my()[kind]['my' + (kind === 'habits' ? 'h' : 't') + Date.now().toString(36)] = { t: t.slice(0, 80), season: C.seasonAt(ds).id, v: true, ts: K.ts() }; K.save(); K.render(); };
  Object.assign(X.acts, {
    'sn-now'(a) { const ds = K.nowIST().date, id = a.dataset.id; if (!confirm('Switch to "' + C.SEASONS.find(s => s.id === id).n + '" from today? Your history stays.')) return; setPlan(plan().filter(x => x.from !== ds).concat([{ id, from: ds }])); K.toast('New season started'); K.render(); },
    'sn-clear'() { const ds = K.nowIST().date; setPlan(plan().filter(x => x.from <= ds)); K.render(); },
    'sn-hide'(a) { const ds = K.nowIST().date, id = a.dataset.id, m = my(); if (m.habits[id]) m.habits[id] = Object.assign({}, m.habits[id], { v: false, ts: K.ts() }); else m.off[C.seasonAt(ds).id + ':' + id] = { v: true, ts: K.ts() }; K.save(); K.render(); },
    'sn-show'(a) { my().off[C.seasonAt(K.nowIST().date).id + ':' + a.dataset.id] = { v: false, ts: K.ts() }; K.save(); K.render(); },
    'sn-addh'() { add('habits', 'snH'); }, 'sn-addt'() { add('tasks', 'snT'); },
    'sn-delt'(a) { const m = my(); m.tasks[a.dataset.id] = Object.assign({}, m.tasks[a.dataset.id], { v: false, ts: K.ts() }); K.save(); K.render(); }
  });
  X.boot.push(kit => { K = kit; });
})();
