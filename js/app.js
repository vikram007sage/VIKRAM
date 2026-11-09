/* VIKRAM — personal job-ready + life assistant. Classic script (works from file:// and as a PWA). */
(function () {
  'use strict';
  const C = VK_CONTENT, CFG = VK_CONFIG;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ================= time helpers (always IST) =================
  const qs = new URLSearchParams(location.search);
  const SIM = qs.get('date'); // ?date=2026-12-03 to preview a day
  const SIMTIME = qs.get('time'); // ?time=14:20
  function nowIST() {
    const d = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: CFG.tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d);
    const g = t => parts.find(p => p.type === t).value;
    let date = `${g('year')}-${g('month')}-${g('day')}`, hm = `${g('hour') === '24' ? '00' : g('hour')}:${g('minute')}`;
    if (SIM) date = SIM; if (SIMTIME) hm = SIMTIME;
    return { date, hm, mins: toMin(hm) };
  }
  const toMin = hm => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
  const addDays = (ds, n) => { const d = new Date(ds + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const diffDays = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5);
  const fmtD = ds => new Date(ds + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const fmtDL = ds => new Date(ds + 'T00:00:00Z').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const ts = () => Date.now();

  // ================= storage =================
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };
  const KEY = 'vikram_state_v1', SYNCKEY = 'vikram_sync_v1', DEVKEY = 'vikram_device_v1';
  let deviceId = LS.get(DEVKEY, null);
  if (!deviceId) { deviceId = 'dev-' + Math.random().toString(36).slice(2, 10); LS.set(DEVKEY, deviceId); }
  let S = LS.get(KEY, null) || { v: 1, days: {}, tasks: {}, taskDue: {}, math: [], books: {}, writing: {}, subs: {}, settings: {}, comeback: { active: false, since: null, ts: 0 }, profile: null };
  ['days', 'tasks', 'taskDue', 'books', 'writing', 'subs', 'settings', 'srs', 'contacts', 'coState'].forEach(k => S[k] = S[k] || {});
  S.math = S.math || []; S.practice = S.practice || []; S.sent = S.sent || [];
  if (!S.profile && typeof VK_PERSONAL !== 'undefined') S.profile = Object.assign({ ts: ts() }, VK_PERSONAL);
  function save(sync = true) { if (SIM && !qs.get('test')) return; LS.set(KEY, S); if (sync) Sync.schedule(); }

  // ================= merge (for sync): newest ts wins, objects merge key-wise, arrays union by id =================
  function merge(a, b) {
    if (a == null) return b; if (b == null) return a;
    if (Array.isArray(a) && Array.isArray(b)) { const m = new Map(); a.concat(b).forEach(x => { const k = x && x.id; if (!k) return; const p = m.get(k); m.set(k, !p || (x.ts || 0) >= (p.ts || 0) ? x : p); }); return [...m.values()].sort((x, y) => (x.ts || 0) - (y.ts || 0)); }
    if (typeof a === 'object' && typeof b === 'object') {
      if ('ts' in a && 'ts' in b) return (b.ts || 0) >= (a.ts || 0) ? b : a; // any object with ts is an atomic record
      const o = {}; new Set([...Object.keys(a), ...Object.keys(b)]).forEach(k => o[k] = merge(a[k], b[k])); return o;
    }
    return b;
  }

  // ================= day model =================
  const habitById = Object.fromEntries(C.HABITS.map(h => [h.id, h]));
  function day(ds) { S.days[ds] = S.days[ds] || { items: {} }; S.days[ds].items = S.days[ds].items || {}; return S.days[ds]; }
  function dayType(ds) { const o = S.settings.dayType && S.settings.dayType[ds]; return (o && o.v) || C.defaultDayType(ds); }
  function blocksFor(ds) {
    const t = dayType(ds), edit = S.settings.blocks && S.settings.blocks[t];
    return (edit && edit.list) || C.SCHEDULES[t].blocks;
  }
  const isOn = (d, id) => !!(d.items[id] && d.items[id].v);
  function activeItems(ds) {
    const set = []; blocksFor(ds).forEach(b => (b.items || []).forEach(id => { const h = habitById[id]; if (h && h.start <= ds && !set.includes(id)) set.push(id); }));
    if (minimumMode(ds)) return ['yoga', 'deep1', 'reading'].filter(id => habitById[id].start <= ds);
    return set;
  }
  function minimumMode(ds) { const d = S.days[ds]; return !!(d && d.minimum && d.minimum.v) || (S.comeback.active && ds >= (S.comeback.since || ds)); }
  function taskDue(t) { const o = S.taskDue[t.id]; return (o && o.date) || t.due; }
  const taskDone = t => !!(S.tasks[t.id] && S.tasks[t.id].done);
  function tasksForToday(ds) {
    return C.TASKS.filter(t => !taskDone(t) && taskDue(t) <= addDays(ds, 3)).sort((a, b) => taskDue(a) < taskDue(b) ? -1 : 1).slice(0, minimumMode(ds) ? 1 : 4);
  }
  function score(ds) {
    const d = S.days[ds]; if (!d) return 0;
    const items = activeItems(ds); if (!items.length) return 0;
    const done = items.filter(id => isOn(d, id)).length;
    return Math.round(100 * done / items.length);
  }
  const touched = ds => { const d = S.days[ds]; return !!(d && Object.values(d.items || {}).some(x => x.v)); };

  // streak with freezes (1 earned per 7 good days, max 3)
  function streakInfo(today) {
    let start = '2026-12-01'; if (today < start) return { streak: 0, freezes: 0, best: 0 };
    let streak = 0, best = 0, freezes = 0, good = 0;
    for (let ds = start; ds < today; ds = addDays(ds, 1)) {
      if (score(ds) >= 60 || (minimumMode(ds) && score(ds) >= 67)) { streak++; good++; if (good % 7 === 0) freezes = Math.min(3, freezes + 1); }
      else if (freezes > 0) { freezes--; }
      else { streak = 0; good = 0; }
      best = Math.max(best, streak);
    }
    if (score(today) >= 60) { streak++; best = Math.max(best, streak); }
    return { streak, freezes, best };
  }
  function xp() {
    let x = 0;
    Object.entries(S.days).forEach(([ds, d]) => { x += Object.values(d.items || {}).filter(i => i.v).length * 10; if (d.journal && d.journal.text) x += 15; if (d.urges) x += (d.urges.n || 0) * 5; });
    x += Object.values(S.tasks).filter(t => t.done).length * 30;
    x += S.math.reduce((a, m) => a + Math.round((m.score || 0) / 2), 0);
    x += S.practice.reduce((a, p) => a + (p.sc || 0) * 8, 0);
    x += S.sent.length * 12;
    x += Object.values(S.srs).reduce((a, c) => a + (c.reps || 0) * 2, 0);
    Object.values(S.writing).forEach(w => x += Math.min(40, Math.round(((w.text || '').split(/\s+/).filter(Boolean).length) / 5)));
    let lvl = C.LEVELS[0], next = null;
    C.LEVELS.forEach((l, i) => { if (x >= l[0]) { lvl = l; next = C.LEVELS[i + 1] || null; } });
    return { x, level: lvl[1], next };
  }

  // ================= comeback =================
  function checkComeback(today) {
    if (today < '2026-12-02') return;
    const cb = S.comeback;
    if (!S.firstUse || !S.firstUse.date) { S.firstUse = { date: today, ts: ts() }; save(); }
    const base = S.firstUse.date > '2026-12-01' ? S.firstUse.date : '2026-12-01';
    if (!cb.active) {
      let last = null; for (let i = 1; i <= 30; i++) { const ds = addDays(today, -i); if (ds < base) break; if (touched(ds)) { last = ds; break; } }
      const missed = last ? diffDays(last, today) - 1 : Math.min(diffDays(base, today), 30);
      const low3 = [1, 2, 3].every(i => { const ds = addDays(today, -i); return ds >= base && score(ds) < 40 && touched(ds); });
      if (missed >= 2 || low3) {
        S.comeback = { active: true, since: today, ts: ts(), reason: missed >= 2 ? `${missed} days away` : '3 low days in a row' };
        reschedule(today); save();
      }
    } else {
      const good = [1, 2, 3].every(i => { const ds = addDays(today, -i); return ds >= cb.since && score(ds) >= 60; });
      if (good) { S.comeback = { active: false, since: null, ts: ts() }; save(); toast('Comeback complete. Full plan is back.'); }
    }
  }
  function reschedule(today) {
    const overdue = C.TASKS.filter(t => !taskDone(t) && taskDue(t) < today);
    overdue.forEach((t, i) => { S.taskDue[t.id] = { date: addDays(today, 1 + Math.floor(i * 7 / Math.max(overdue.length, 1))), ts: ts() }; });
    if (overdue.length) S.comeback.moved = overdue.length;
  }

  // ================= UI shell =================
  let TAB = location.hash.replace('#', '') || 'today';
  const tabs = ['today', 'prep', 'feed', 'life', 'more', 'outreach'];
  function go(t) { TAB = tabs.includes(t) ? t : 'today'; try { history.replaceState(null, '', location.pathname + location.search + '#' + TAB); } catch (e) { } render(); window.scrollTo(0, 0); }
  window.addEventListener('hashchange', () => { const t = location.hash.replace('#', ''); if (t !== TAB && tabs.includes(t)) { TAB = t; render(); } });
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600); }

  function render() {
    $$('.tabbar button, .toptabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === TAB));
    const v = $('#view');
    v.innerHTML = ({ today: viewToday, prep: viewPrep, feed: viewFeed, life: viewLife, more: viewMore, outreach: viewOutreach }[TAB])();
    bind[TAB] && bind[TAB]();
    $('#syncDot').className = 'syncdot ' + Sync.status;
  }

  // ---------- TODAY ----------
  function viewToday() {
    const n = nowIST(), ds = n.date;
    const p = S.profile || {};
    const d1 = diffDays(ds, C.DAY1);
    if (ds < '2026-12-01') {
      return `<section class="hero"><div class="eyebrow">VIKRAM · ${fmtDL(ds)}</div><h1>Exams first,<br>${esc(p.name || 'Aryan')}.</h1><p>Vikram switches on <b>1 December 2026</b>. Until then: ace your end-sems, sleep well. That's the whole plan.</p><div class="meta"><span class="pill"><span class="dot"></span>${diffDays(ds, '2026-12-01')} days to day one</span><span class="pill">${d1} days to Day 1 placements</span></div></section>
      <div class="card"><h3>Before 1 Dec (5 minutes, once)</h3><ol class="plain"><li>Install Vikram on your phone (More → Install).</li><li>Turn on sync + notifications (More).</li><li>Import the calendar alarms (More → Calendar).</li><li>Move Instagram off your home screen; put Vikram in its place.</li></ol><a class="btn" href="?date=2026-12-01#today">Preview 1 December →</a></div>`;
    }
    checkComeback(ds);
    const prev = SIM ? `<div class="comeback"><b>Preview mode</b> (${fmtD(ds)}${SIMTIME ? ' ' + SIMTIME : ''}). Nothing you tick here is saved. <a href="./#today">Exit preview</a></div>` : '';
    const blocks = blocksFor(ds), cur = currentBlock(blocks, n.mins), dd = day(ds);
    const sc = score(ds), st = streakInfo(ds), X = xp(), mm = minimumMode(ds), items = activeItems(ds);
    const tasks = tasksForToday(ds);
    const hobby = [...C.HOBBY_PLAN].reverse().find(h => h.from <= ds);
    const cb = S.comeback.active ? `<div class="comeback"><b>Welcome back.</b> No guilt, just restart. ${esc(S.comeback.reason || '')}. Today is a 3-task day.${S.comeback.moved ? ` ${S.comeback.moved} overdue task(s) were spread over the next week.` : ''} Three good days and the full plan returns.<div class="why">"${esc((p.why || '').split('.')[0])}."</div></div>` : '';
    return `
    <section class="hero small"><div class="eyebrow">${fmtDL(ds)} · ${esc(C.SCHEDULES[dayType(ds)].name)}</div>
      <h1>${greet(n.mins)}, ${esc(p.name || 'Aryan')}.</h1>
      <div class="meta"><span class="pill"><span class="dot"></span>${d1} days to Day 1</span><span class="pill">Lv · ${X.level} · ${X.x} XP</span><span class="pill">🔥 ${st.streak} day streak${st.freezes ? ` · ❄ ${st.freezes}` : ''}</span></div></section>
    ${prev}${cb}
    <div class="nowcard">${cur ? `<div class="eyebrow">Now · until ${cur.e}</div><h2>${esc(cur.t)}</h2><div class="muted">${cur.left} min left · next: ${esc(cur.next ? cur.next.s + ' ' + cur.next.t : 'sleep')}</div>` : '<h2>Sleep</h2>'}
      <div class="ring" style="--p:${sc}"><span>${sc}</span><small>today</small></div></div>
    <button class="urge" data-act="urge">Urge to scroll? <b>Beat it →</b><small>${(dd.urges && dd.urges.n) || 0} beaten today</small></button>
    <div class="row-between"><h3 class="h">Today's checklist</h3><label class="switch"><input type="checkbox" data-act="minimum" ${mm ? 'checked' : ''} ${S.comeback.active ? 'disabled' : ''}> Minimum day</label></div>
    <div class="card list">${items.map(id => { const h = habitById[id]; const on = isOn(dd, id); const txt = id === 'hobby' && hobby ? hobby.t : (mm ? h.min : h.t); return `<label class="item ${on ? 'done' : ''}"><input type="checkbox" data-habit="${id}" ${on ? 'checked' : ''}><span>${esc(txt)}<small>${esc(mm ? '' : 'min: ' + h.min)}</small></span></label>`; }).join('')}</div>
    <h3 class="h">Placement tasks</h3>
    <div class="card list">${tasks.length ? tasks.map(t => taskRow(t, ds)).join('') : '<p class="muted">Nothing due in the next 3 days. Do a timed set or a math sprint.</p>'}</div>
    ${Out.windowOpen(ds) ? `<div class="drills"><button class="btn" data-act="go" data-to="outreach">Outreach · ${Out.sentOn(ds)}/${VK_OUTREACH.QUOTA} sent · ${Out.due(ds).length} follow-up${Out.due(ds).length === 1 ? '' : 's'} due</button></div>` : ''}
    <div class="drills"><button class="btn" data-act="cards">Flashcards · ${Cards.due(ds).length} due</button><button class="btn ghost" data-act="quiz" data-mode="quick">Quick 5</button><button class="btn ghost" data-act="mathgo">Math sprint</button></div>
    <h3 class="h">Timeline</h3>
    <div class="timeline">${blocks.map(b => { const isCur = cur && cur.s === b.s; const past = !isCur && toMin(b.e) <= n.mins && toMin(b.e) > toMin(b.s); return `<div class="blk k-${b.k} ${isCur ? 'cur' : ''} ${past ? 'past' : ''}"><span class="tm">${b.s}</span><span class="bt">${esc(b.t)}</span></div>`; }).join('')}</div>
    <h3 class="h">Evening journal</h3>
    <div class="card"><textarea id="journal" rows="3" placeholder="Win · lesson · tomorrow's first task">${esc((dd.journal && dd.journal.text) || '')}</textarea><div class="row-between"><small class="muted">Saved as you type</small><button class="btn sm" data-act="mathgo">2-min math sprint</button></div></div>`;
  }
  function greet(m) { return m < 720 ? 'Good morning' : m < 1020 ? 'Good afternoon' : 'Good evening'; }
  function currentBlock(blocks, m) {
    for (let i = 0; i < blocks.length; i++) { const b = blocks[i], s = toMin(b.s), e = toMin(b.e); const inB = e > s ? m >= s && m < e : (m >= s || m < e); if (inB) { const left = e > s ? e - m : (m >= s ? 1440 - m + e : e - m); return Object.assign({}, b, { left, next: blocks[i + 1] || blocks[0] }); } }
    return null;
  }
  function taskRow(t, ds) {
    const due = taskDue(t), late = due < ds && !taskDone(t), mod = t.m && C.MODULES.find(m => m.c === t.m);
    const link = mod && mod.local ? `<a href="${mod.local}" class="lnk">open notes ↗</a>` : (mod ? `<span class="tag">notes coming</span>` : '');
    return `<label class="item ${taskDone(t) ? 'done' : ''} ${late ? 'late' : ''}"><input type="checkbox" data-task="${t.id}" ${taskDone(t) ? 'checked' : ''}><span><span class="tt"><b>${t.m ? t.m + ' · ' : ''}</b>${esc(t.t)}</span><small>${late ? 'overdue · ' : ''}due ${fmtD(due)} ${link}</small></span></label>`;
  }

  // ---------- PREP ----------
  function viewPrep() {
    const ds = nowIST().date, ph = C.PHASES.find(p => ds >= p.s && ds <= p.e) || C.PHASES[0];
    const best = S.math.reduce((a, m) => Math.max(a, m.score), 0), recent = S.math.slice(-20);
    const done = C.TASKS.filter(taskDone).length;
    const months = {}; C.TASKS.forEach(t => { const k = taskDue(t).slice(0, 7); (months[k] = months[k] || []).push(t); });
    const tracks = [...new Set(C.MODULES.map(m => m.track))];
    return `<section class="hero small"><div class="eyebrow">Placement roadmap · ${done}/${C.TASKS.length} tasks</div><h1>${esc(ph.n)}</h1><p>${esc(ph.g)}</p></section>
    <div class="card"><div class="row-between"><div><h3>Math sprint</h3><small class="muted">120 seconds · + − × ÷ · Zetamac-style · best ${best}</small></div><button class="btn" data-act="mathgo">Start</button></div>${spark(recent.map(m => m.score))}</div>
    ${practiceCard(ds)}
    <div class="card"><div class="row-between"><div><h3>Outreach</h3><small class="muted">${VK_COMPANIES.LIST.length} target companies · ${Object.keys(S.contacts).length} contacts · ${S.sent.length} emails sent</small></div><button class="btn" data-act="go" data-to="outreach">Open</button></div></div>
    <h3 class="h">Deadlines</h3>
    ${Object.keys(months).sort().map(k => `<details ${k <= ds.slice(0, 7) || k === addDays(ds, 20).slice(0, 7) ? 'open' : ''}><summary>${new Date(k + '-01T00:00:00Z').toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })} <small>${months[k].filter(taskDone).length}/${months[k].length}</small></summary><div class="list">${months[k].map(t => taskRow(t, ds)).join('')}</div></details>`).join('')}
    <h3 class="h">Notes library</h3>
    ${tracks.map(tr => `<div class="eyebrow mt">${esc(tr)}</div><div class="mods">${C.MODULES.filter(m => m.track === tr).map(m => `<div class="mod ${m.local ? 'ready' : ''}"><span class="code">${m.c}</span><b>${esc(m.t)}</b>${m.local ? `<a href="${m.local}">Open ↗</a>` : `<small>due ${fmtD(m.due)}</small>`}</div>`).join('')}</div>`).join('')}`;
  }
  function practiceCard(ds) {
    const P = VK_PRACTICE, last = S.practice.slice(-5).reverse();
    const topic = {}; S.practice.forEach(p => Object.entries(p.topics || {}).forEach(([t, [c, n]]) => { topic[t] = topic[t] || [0, 0]; topic[t][0] += c; topic[t][1] += n; }));
    const weak = Object.entries(topic).filter(([, v]) => v[1] >= 3).map(([t, v]) => [t, v[0] / v[1]]).sort((a, b) => a[1] - b[1]).slice(0, 3);
    const decks = {}; VK_CARDS.forEach(c => decks[c.deck] = (decks[c.deck] || 0) + 1);
    return `<div class="card"><h3>Practice</h3><p class="small muted">Fresh questions every time; every answer is computed. Results feed your weak-topic list.</p>
      <div class="modes">${Object.entries(P.MODES).map(([k, m]) => `<button class="mode" data-act="quiz" data-mode="${k}"><b>${esc(m.title)}</b><small>${m.n} Qs · ${m.secs / 60} min</small></button>`).join('')}</div>
      ${weak.length ? `<p class="small"><b>Weakest topics:</b> ${weak.map(([t, a]) => `${esc(t)} ${Math.round(a * 100)}%`).join(' · ')}</p>` : ''}
      ${last.length ? `<div class="small muted">Recent: ${last.map(p => `${esc(P.MODES[p.mode] ? P.MODES[p.mode].title : p.mode)} ${p.sc}/${p.n}`).join(' · ')}</div>` : ''}</div>
    <div class="card"><div class="row-between"><div><h3>Flashcards</h3><small class="muted">${VK_CARDS.length} cards · ${Cards.due(ds).length} due today · decks: ${Object.entries(decks).map(([d, n]) => d + ' ' + n).join(', ')}</small></div><button class="btn" data-act="cards">Review</button></div></div>`;
  }
  function spark(arr) {
    if (arr.length < 2) return '<p class="muted small">Your scores will chart here.</p>';
    const w = 300, h = 50, mx = Math.max(...arr, 10), pts = arr.map((v, i) => `${(i / (arr.length - 1)) * w},${h - (v / mx) * (h - 6) - 3}`).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" class="spark"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
  }

  // ---------- FEED ----------
  let feedIdx = LS.get('vikram_feed_idx', Math.floor(Math.random() * C.FEED.length));
  let feedGen = null;
  function viewFeed() {
    const ds = nowIST().date, dd = day(ds);
    if (feedIdx % 4 === 3 && typeof VK_PRACTICE !== 'undefined') { const g = feedGen || (feedGen = VK_PRACTICE.one());
      return `<section class="hero small"><div class="eyebrow">Feed · instead of Instagram</div><h1>Solve this one.</h1><div class="meta"><span class="pill"><span class="dot"></span>${(dd.urges && dd.urges.n) || 0} urges beaten today</span><span class="pill">${(dd.cards && dd.cards.n) || 0} cards read</span></div></section>
      <div class="feedcard k-apt"><div class="eyebrow">Solve it · ${esc(g.t)}</div>${g.ctx || ''}<h2>${esc(g.q)}</h2><div class="opts">${g.opts.map((o, i) => `<button class="opt" data-act="feedopt" data-i="${i}">${esc(o)}</button>`).join('')}</div><div class="ans hide" id="ans">${esc(g.exp)}</div></div>
      <div class="row-between"><button class="btn ghost" data-act="feedprev">← Back</button><button class="btn" data-act="feednext">Next card →</button></div>`; }
    const c = C.FEED[feedIdx % C.FEED.length];
    const label = { apt: 'Solve it', history: 'History', geo: 'Geopolitics', french: 'Français', biz: 'Business', mind: 'Mind' }[c.k];
    return `<section class="hero small"><div class="eyebrow">Feed · instead of Instagram</div><h1>One card. Then another.</h1><div class="meta"><span class="pill"><span class="dot"></span>${(dd.urges && dd.urges.n) || 0} urges beaten today</span><span class="pill">${(dd.cards && dd.cards.n) || 0} cards read</span></div></section>
    <div class="feedcard k-${c.k}"><div class="eyebrow">${label}</div><h2>${esc(c.q)}</h2><div class="ans ${c.k === 'apt' ? 'hide' : ''}" id="ans">${esc(c.a)}</div>${c.k === 'apt' ? '<button class="btn sm" data-act="reveal">Reveal answer</button>' : ''}</div>
    <div class="row-between"><button class="btn ghost" data-act="feedprev">← Back</button><button class="btn" data-act="feednext">Next card →</button></div>
    <p class="muted small center">Cards grow every batch: original history texts, French, aptitude, geopolitics.</p>`;
  }

  // ---------- LIFE ----------
  function viewLife() {
    const ds = nowIST().date, p = S.profile || {};
    const days = [...Array(35)].map((_, i) => addDays(ds, i - 34));
    const hs = C.HABITS.filter(h => h.start <= (ds < '2026-12-01' ? '2026-12-01' : ds));
    const w = (S.writing[ds] && S.writing[ds].text) || '', wc = w.split(/\s+/).filter(Boolean).length;
    return `<section class="hero small"><div class="eyebrow">Life · the reason for all of this</div><h1>Why</h1><p>${esc(p.why || 'Write your why in More → Profile.')}</p></section>
    <div class="card"><h3>The plan</h3><div class="plan">${(p.plan || []).map(x => `<div><span class="tm">${esc(x.when)}</span><span>${esc(x.t)}</span></div>`).join('')}</div></div>
    <h3 class="h">Habits · last 5 weeks</h3>
    <div class="card heat">${hs.map(h => `<div class="hrow"><span class="hl">${esc(h.t)}</span><span class="cells">${days.map(d => `<i class="${S.days[d] && isOn(S.days[d], h.id) ? 'on' : (d < h.start ? 'na' : '')}" title="${d}"></i>`).join('')}</span></div>`).join('')}</div>
    <h3 class="h">Writing pad · today</h3>
    <div class="card"><textarea id="writing" rows="6" placeholder="150 words. About anything: history, an idea, today.">${esc(w)}</textarea><small class="muted" id="wc">${wc} words</small></div>
    <h3 class="h">Books</h3>
    <div class="card list">${C.BOOKS.map(b => { const s = S.books[b.id] || {}; return `<div class="book"><div><b>${esc(b.t)}</b> <small class="muted">${esc(b.a)}${b.own ? ' · you own it' : ' · to get'}</small><small>${esc(b.why)}</small></div><div class="bk"><input type="number" min="0" inputmode="numeric" data-book="${b.id}" value="${s.pages || ''}" placeholder="pg"><select data-bookst="${b.id}"><option value="">—</option>${['reading', 'done', 'next'].map(o => `<option ${s.status === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div></div>`; }).join('')}</div>`;
  }

  // ---------- MORE ----------
  function viewMore() {
    const cfg = LS.get(SYNCKEY, {}), perm = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
    const ds = nowIST().date, dt = dayType(ds);
    return `<section class="hero small"><div class="eyebrow">Settings · v${CFG.version}</div><h1>Control room</h1></section>
    <div class="card"><h3>Sync (phone ⇄ laptop)</h3><p class="small muted">Your data syncs through a <b>private</b> GitHub repo using a token that stays on this device. Status: <b>${Sync.status}</b>${Sync.last ? ' · last ' + new Date(Sync.last).toLocaleTimeString('en-IN') : ''} ${Sync.err ? '· ' + esc(Sync.err) : ''}</p>
      <div class="form"><input id="sOwner" placeholder="GitHub username" value="${esc(cfg.owner || '')}"><input id="sRepo" placeholder="data repo (e.g. vikram-data)" value="${esc(cfg.repo || 'vikram-data')}"><input id="sToken" type="password" placeholder="fine-grained token (contents: read/write)" value="${esc(cfg.token || '')}"></div>
      <div class="row"><button class="btn" data-act="syncsave">Save & sync now</button><button class="btn ghost" data-act="syncoff">Disconnect</button></div></div>
    <div class="card"><h3>Notifications</h3><p class="small muted">Permission: <b>${perm}</b>. Push needs the installed app (https). Exact-time alarms come from the calendar file below.</p>
      <div class="row"><button class="btn" data-act="push">Enable push on this device</button><button class="btn ghost" data-act="pushtest">Test notification</button></div></div>
    <div class="card"><h3>Calendar alarms</h3><p class="small muted">Downloads a calendar file with every block of your next 62 days (each with an alert at its start time). Import it into Google Calendar: it rings on phone and laptop at the exact time. Re-download monthly.</p><button class="btn" data-act="ics">Download vikram-alarms.ics</button></div>
    <div class="card"><h3>Today's schedule type</h3><select id="dtSel">${Object.entries(C.SCHEDULES).map(([k, s]) => `<option value="${k}" ${k === dt ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select><p class="small muted">Change it for today (exam day, travel, holiday class-off).</p></div>
    <div class="card"><h3>Edit block times</h3><select id="edSel">${Object.entries(C.SCHEDULES).map(([k, s]) => `<option value="${k}">${esc(s.name)}</option>`).join('')}</select><div id="edBox"></div></div>
    <div class="card"><h3>Install on phone</h3><ol class="plain small"><li>Open your Vikram link in Chrome (Android) or Safari (iPhone).</li><li>Android: menu ⋮ → <b>Add to Home screen</b>. iPhone: Share → <b>Add to Home Screen</b>.</li><li>Put it where Instagram was. Move Instagram to the last screen and set a 20-minute daily limit (Digital Wellbeing / Screen Time).</li></ol></div>
    <div class="card"><h3>Backup</h3><div class="row"><button class="btn" data-act="export">Export backup</button><label class="btn ghost">Import<input type="file" id="importFile" accept="application/json" hidden></label></div></div>
    <div class="card"><h3>Theme</h3><div class="row"><button class="btn ghost" data-act="theme" data-v="light">Light</button><button class="btn ghost" data-act="theme" data-v="dark">Dark</button><button class="btn ghost" data-act="theme" data-v="auto">Auto</button></div></div>
    <p class="muted small center">VIKRAM · built for Aryan · <a href="docs/PRD.html">Product case study</a></p>`;
  }

  // ================= bindings =================
  const bind = {
    outreach() { Out.bind(); },
    today() {
      const ds = nowIST().date;
      $$('[data-habit]').forEach(cb => cb.onchange = () => { day(ds).items[cb.dataset.habit] = { v: cb.checked, ts: ts() }; save(); if (cb.checked) burst(cb); render(); });
      $$('[data-task]').forEach(cb => cb.onchange = () => { S.tasks[cb.dataset.task] = { done: cb.checked, ts: ts() }; save(); render(); });
      const j = $('#journal'); if (j) j.oninput = debounce(() => { day(ds).journal = { text: j.value, ts: ts() }; save(); }, 600);
      const m = $('[data-act=minimum]'); if (m) m.onchange = () => { day(ds).minimum = { v: m.checked, ts: ts() }; save(); render(); };
    },
    prep() { const ds = nowIST().date; $$('[data-task]').forEach(cb => cb.onchange = () => { S.tasks[cb.dataset.task] = { done: cb.checked, ts: ts() }; save(); render(); }); },
    feed() { },
    life() {
      const ds = nowIST().date, w = $('#writing');
      if (w) w.oninput = debounce(() => { S.writing[ds] = { text: w.value, ts: ts() }; save(); $('#wc').textContent = w.value.split(/\s+/).filter(Boolean).length + ' words'; }, 500);
      $$('[data-book]').forEach(i => i.onchange = () => { const b = S.books[i.dataset.book] || {}; S.books[i.dataset.book] = Object.assign({}, b, { pages: +i.value || 0, ts: ts() }); save(); });
      $$('[data-bookst]').forEach(i => i.onchange = () => { const b = S.books[i.dataset.bookst] || {}; S.books[i.dataset.bookst] = Object.assign({}, b, { status: i.value, ts: ts() }); save(); });
    },
    more() {
      const ds = nowIST().date;
      $('#dtSel').onchange = e => { S.settings.dayType = S.settings.dayType || {}; S.settings.dayType[ds] = { v: e.target.value, ts: ts() }; save(); toast('Today set to ' + C.SCHEDULES[e.target.value].name); };
      const ed = () => { const k = $('#edSel').value, list = (S.settings.blocks && S.settings.blocks[k] && S.settings.blocks[k].list) || C.SCHEDULES[k].blocks; $('#edBox').innerHTML = list.map((b, i) => `<div class="edrow"><input value="${b.s}" data-i="${i}" data-f="s" size="5"><input value="${b.e}" data-i="${i}" data-f="e" size="5"><input value="${esc(b.t)}" data-i="${i}" data-f="t"></div>`).join('') + '<div class="row"><button class="btn sm" id="edSave">Save times</button><button class="btn sm ghost" id="edReset">Reset to default</button></div>';
        $('#edSave').onclick = () => { const nl = JSON.parse(JSON.stringify(list)); $$('#edBox input[data-i]').forEach(inp => { nl[+inp.dataset.i][inp.dataset.f] = inp.value.trim(); }); S.settings.blocks = S.settings.blocks || {}; S.settings.blocks[k] = { list: nl, ts: ts() }; save(); toast('Schedule saved'); };
        $('#edReset').onclick = () => { S.settings.blocks = S.settings.blocks || {}; S.settings.blocks[k] = { list: null, ts: ts() }; save(); ed(); }; };
      $('#edSel').onchange = ed; ed();
      $('#importFile').onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { S = merge(S, JSON.parse(r.result)); save(); toast('Backup merged'); render(); } catch (x) { toast('Not a Vikram backup'); } }; r.readAsText(f); };
    }
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-act]'); if (!a) return; const act = a.dataset.act, ds = nowIST().date;
    if (act === 'urge') { const d = day(ds); d.urges = { n: ((d.urges && d.urges.n) || 0) + 1, ts: ts() }; save(); go('feed'); toast('Urge noticed. One card instead.'); }
    if (act === 'feednext' || act === 'feedprev') { feedGen = null; feedIdx = (feedIdx + (act === 'feednext' ? 1 : C.FEED.length - 1)) % C.FEED.length; LS.set('vikram_feed_idx', feedIdx); if (act === 'feednext') { const d = day(ds); d.cards = { n: ((d.cards && d.cards.n) || 0) + 1, ts: ts() }; save(); } render(); }
    if (act === 'feedopt' && feedGen) { const i = +a.dataset.i; $$('.opt').forEach((b, j) => { b.disabled = true; if (j === feedGen.a) b.classList.add('right'); else if (j === i) b.classList.add('wrong'); }); $('#ans').classList.remove('hide'); if (navigator.vibrate) navigator.vibrate(i === feedGen.a ? 15 : [30, 40, 30]); }
    if (act === 'go') go(a.dataset.to);
    if (act && act.startsWith('o-')) Out.act(act, a);
    if (act === 'quiz') Quiz.open(a.dataset.mode);
    if (act === 'cards') Cards.open();
    if (act === 'reveal') { $('#ans').classList.remove('hide'); a.remove(); }
    if (act === 'mathgo') Math2.open();
    if (act === 'syncsave') { LS.set(SYNCKEY, { owner: $('#sOwner').value.trim(), repo: $('#sRepo').value.trim(), token: $('#sToken').value.trim() }); Sync.now(true); }
    if (act === 'syncoff') { LS.set(SYNCKEY, {}); Sync.status = 'off'; render(); }
    if (act === 'push') Push.enable();
    if (act === 'pushtest') Push.test();
    if (act === 'ics') downloadICS();
    if (act === 'export') download('vikram-backup-' + ds + '.json', JSON.stringify(S), 'application/json');
    if (act === 'theme') { LS.set('vikram_theme', a.dataset.v); applyTheme(); }
  });
  function debounce(f, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; }
  function burst(el) { const r = el.getBoundingClientRect(); const s = document.createElement('span'); s.className = 'burst'; s.textContent = '+10'; s.style.left = r.left + 'px'; s.style.top = r.top + window.scrollY + 'px'; document.body.appendChild(s); setTimeout(() => s.remove(), 900); if (navigator.vibrate) navigator.vibrate(15); }
  function download(name, text, type) { try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { toast('Download blocked here'); } }
  function applyTheme() { const t = LS.get('vikram_theme', 'auto'); document.documentElement.dataset.theme = t === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches || (nowIST().mins >= 1230 || nowIST().mins < 300) ? 'dark' : 'light') : t; }

  // ================= math sprint (Zetamac-style) =================
  const Math2 = {
    open() {
      const ov = $('#overlay'); ov.innerHTML = `<div class="mathbox"><div class="row-between"><span class="eyebrow">Math sprint</span><button class="btn sm ghost" id="mClose">✕</button></div><div class="mtime" id="mTime">120</div><div class="mq" id="mQ">Ready?</div><input id="mA" inputmode="numeric" autocomplete="off" placeholder="answer" disabled><div class="mscore">Score <b id="mS">0</b></div><button class="btn" id="mStart">Start (120 s)</button></div>`;
      ov.classList.add('show'); $('#mClose').onclick = () => this.close(); $('#mStart').onclick = () => this.start();
    },
    gen() { const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1)); const k = r(0, 3); let a, b; if (k === 0) { a = r(2, 100); b = r(2, 100); return [`${a} + ${b}`, a + b]; } if (k === 1) { a = r(2, 100); b = r(2, 100); const s = a + b; return [`${s} − ${a}`, b]; } a = r(2, 12); b = r(2, 100); return k === 2 ? [`${a} × ${b}`, a * b] : [`${a * b} ÷ ${a}`, b]; },
    start() { this.score = 0; this.t = 120; this.q = this.gen(); const inp = $('#mA'); inp.disabled = false; inp.value = ''; inp.focus(); $('#mStart').style.display = 'none'; $('#mQ').textContent = this.q[0];
      inp.oninput = () => { if (+inp.value === this.q[1]) { this.score++; $('#mS').textContent = this.score; this.q = this.gen(); $('#mQ').textContent = this.q[0]; inp.value = ''; } };
      this.iv = setInterval(() => { this.t--; $('#mTime').textContent = this.t; if (this.t <= 0) this.end(); }, 1000); },
    end() { clearInterval(this.iv); const ds = nowIST().date; const best = S.math.reduce((a, m) => Math.max(a, m.score), 0);
      S.math.push({ id: 'm' + ts(), d: ds, score: this.score, ts: ts() }); const d = day(ds); if (habitById.aptitude.start <= ds && nowIST().mins >= 1050) d.items.aptitude = { v: true, ts: ts() }; save();
      $('#mQ').innerHTML = `${this.score >= best && this.score > 0 ? '🏆 New best! ' : ''}Score ${this.score}`; $('#mA').disabled = true; const s = $('#mStart'); s.style.display = ''; s.textContent = 'Again'; },
    close() { clearInterval(this.iv); $('#overlay').classList.remove('show'); render(); }
  };

  // ================= timed practice sets =================
  const Quiz = {
    open(mode) { const M = VK_PRACTICE.MODES[mode]; this.mode = mode; this.items = M.make(); this.i = 0; this.ans = []; this.t = M.secs; this.t0 = Date.now();
      $('#overlay').classList.add('show'); clearInterval(this.iv); this.iv = setInterval(() => { this.t--; const el = $('#qTime'); if (el) el.textContent = this.clock(); if (this.t <= 0) this.end(); }, 1000); this.show(); },
    clock() { const m = Math.max(this.t, 0); return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0'); },
    show() { const q = this.items[this.i], M = VK_PRACTICE.MODES[this.mode];
      $('#overlay').innerHTML = `<div class="quizbox"><div class="row-between"><span class="eyebrow">${esc(M.title)} · ${this.i + 1}/${this.items.length}</span><span class="qtime" id="qTime">${this.clock()}</span><button class="btn sm ghost" id="qClose">✕</button></div>
        <div class="qbar"><i style="width:${100 * this.i / this.items.length}%"></i></div>${q.ctx || ''}<h2 class="qq">${esc(q.q)}</h2>
        <div class="opts">${q.opts.map((o, i) => `<button class="opt ${this.ans[this.i] === i ? 'sel' : ''}" data-i="${i}">${esc(o)}</button>`).join('')}</div>
        <div class="row-between"><button class="btn ghost sm" id="qPrev" ${this.i ? '' : 'disabled'}>← Prev</button><button class="btn ghost sm" id="qSkip">Skip</button><button class="btn sm" id="qEnd">Finish</button></div></div>`;
      $$('#overlay .opt').forEach(b => b.onclick = () => { this.ans[this.i] = +b.dataset.i; if (this.i < this.items.length - 1) { this.i++; this.show(); } else this.show(); });
      $('#qPrev').onclick = () => { this.i--; this.show(); }; $('#qSkip').onclick = () => { if (this.i < this.items.length - 1) { this.i++; this.show(); } };
      $('#qEnd').onclick = () => this.end(); $('#qClose').onclick = () => { if (confirmEnd()) this.end(); }; },
    end() { if (!this.items) return; clearInterval(this.iv); const ds = nowIST().date; let sc = 0; const topics = {};
      this.items.forEach((q, i) => { const ok = this.ans[i] === q.a; if (ok) sc++; topics[q.t] = topics[q.t] || [0, 0]; topics[q.t][0] += ok ? 1 : 0; topics[q.t][1]++; });
      const secs = Math.round((Date.now() - this.t0) / 1000);
      S.practice.push({ id: 'p' + ts(), mode: this.mode, sc, n: this.items.length, secs, topics, d: ds, ts: ts() });
      if (habitById.aptitude.start <= ds && nowIST().mins >= 1050) day(ds).items.aptitude = { v: true, ts: ts() };
      save();
      const items = this.items, ans = this.ans; this.items = null;
      $('#overlay').innerHTML = `<div class="quizbox"><div class="row-between"><span class="eyebrow">Result</span><button class="btn sm ghost" id="qClose">✕</button></div>
        <h2 class="qq">${sc} / ${items.length} <small class="muted">in ${Math.floor(secs / 60)}m ${secs % 60}s</small></h2>
        <p class="small muted">${sc / items.length >= 0.8 ? 'Strong. Push the timer next time.' : sc / items.length >= 0.5 ? 'Solid base. Read the explanations of the misses.' : 'Read every explanation below, then redo this mode tomorrow.'}</p>
        <div class="review">${items.map((q, i) => { const ok = ans[i] === q.a; return `<details ${ok ? '' : 'open'}><summary>${ok ? '✓' : (ans[i] == null ? '–' : '✗')} ${esc(q.q.slice(0, 70))}${q.q.length > 70 ? '…' : ''}</summary><div>${q.ctx && !ok ? q.ctx : ''}<p><b>Answer:</b> ${esc(q.opts[q.a])}${ans[i] != null && !ok ? ` · <span class="muted">you chose ${esc(q.opts[ans[i]])}</span>` : ''}</p><p class="small">${esc(q.exp)}</p></div></details>`; }).join('')}</div></div>`;
      $('#qClose').onclick = () => { $('#overlay').classList.remove('show'); render(); }; }
  };
  function confirmEnd() { return true; }

  // ================= spaced-repetition flashcards =================
  const Cards = {
    due(ds) { const seen = VK_CARDS.filter(c => S.srs[c.id]); const due = seen.filter(c => S.srs[c.id].due <= ds); const fresh = VK_CARDS.filter(c => !S.srs[c.id]);
      const newToday = Object.values(S.srs).filter(r => r.first === ds).length; return due.concat(fresh.slice(0, Math.max(0, 15 - newToday))); },
    open() { const ds = nowIST().date; this.q = this.due(ds); this.n = 0; $('#overlay').classList.add('show'); this.show(false); },
    show(flip) { const c = this.q[0];
      if (!c) { $('#overlay').innerHTML = `<div class="quizbox center"><h2 class="qq">All caught up ✓</h2><p class="muted">${this.n} reviews done. Come back tomorrow.</p><button class="btn" id="cClose">Close</button></div>`; $('#cClose').onclick = () => { $('#overlay').classList.remove('show'); render(); }; return; }
      $('#overlay').innerHTML = `<div class="quizbox"><div class="row-between"><span class="eyebrow">Flashcards · ${esc(c.deck)} · ${this.q.length} left</span><button class="btn sm ghost" id="cClose">✕</button></div>
        <div class="flash ${flip ? 'flipped' : ''}" id="flash"><div class="ff">${esc(c.f)}</div>${flip ? `<div class="fb">${esc(c.b)}</div>` : '<div class="muted small">tap to reveal</div>'}</div>
        ${flip ? `<div class="grade"><button class="btn ghost" data-g="0">Again</button><button class="btn" data-g="1">Good</button><button class="btn ghost" data-g="2">Easy</button></div>` : ''}</div>`;
      $('#cClose').onclick = () => { $('#overlay').classList.remove('show'); render(); };
      $('#flash').onclick = () => { if (!flip) this.show(true); };
      $$('[data-g]').forEach(b => b.onclick = () => this.grade(c, +b.dataset.g)); },
    grade(c, g) { const ds = nowIST().date; const r = Object.assign({ ivl: 0, ease: 2.5, reps: 0, first: ds }, S.srs[c.id] || {});
      if (g === 0) { r.ivl = 0; r.ease = Math.max(1.3, r.ease - 0.2); this.q.push(this.q.shift()); }
      else { r.ivl = r.ivl ? Math.round(r.ivl * r.ease * (g === 2 ? 1.3 : 1)) : (g === 2 ? 3 : 1); if (g === 2) r.ease += 0.15; this.q.shift(); }
      r.reps++; r.due = addDays(ds, r.ivl); r.ts = ts(); S.srs[c.id] = r; this.n++; save(); this.show(false); }
  };

  // ================= outreach =================
  let OTAB = 'queue', OLANE = '', OQ = '', OSTAT = '';
  function viewOutreach() { return Out.view(); }
  const wkday = ds => { const d = new Date(ds + 'T00:00:00Z').getUTCDay(); return d === 6 ? addDays(ds, 2) : d === 0 ? addDays(ds, 1) : ds; };
  const Out = {
    windowOpen(ds) { const d = new Date(ds + 'T00:00:00Z').getUTCDay(); return d >= 1 && d <= 5 && VK_OUTREACH.WINDOW.some(([a, b]) => ds >= a && ds <= b); },
    sentOn(ds) { return S.sent.filter(x => x.d === ds).length; },
    due(ds) { return Object.values(S.contacts).filter(c => !c.del && c.next && c.next <= ds && ['Sent', 'Follow-up 1'].includes(c.status)); },
    cfg() { return Object.assign({ cv: '', linkedin: '', phone: '', proofs: {} }, S.settings.out || {}); },
    sig() { const c = this.cfg(); return ['Aryan Rajak', 'IIT Kharagpur · B.Tech + M.Tech Biotechnology (2028)', c.phone, c.linkedin].filter(Boolean).join('\n'); },
    first(n) { return (n || '').trim().split(/\s+/)[0] || 'there'; },
    fill(t, c, x) { const cfg = this.cfg(), lane = c.lane || 'pm'; const proof = cfg.proofs[lane] || VK_OUTREACH.PROOFS[lane];
      const map = { first: this.first(c.name), company: c.company || 'your company', team: x.team || VK_COMPANIES.LANES[lane].n, hook: x.hook || '', proof, cv: cfg.cv || '[CV link]', linkedin: cfg.linkedin, sig: this.sig(), value: x.value || '[what you did since]', subject: c.subject || 'Summer 2027 internship' };
      return t.replace(/\{(\w+)\}/g, (m, k) => map[k] != null ? map[k] : m); },
    list() { return Object.values(S.contacts).filter(c => !c.del); },
    view() {
      const ds = nowIST().date, cs = this.list(), due = this.due(ds), cdc = S.settings.cdc && S.settings.cdc.v;
      const counts = {}; cs.forEach(c => counts[c.status] = (counts[c.status] || 0) + 1);
      const sub = ['queue', 'contacts', 'companies', 'import', 'setup'].map(k => `<button class="chip ${OTAB === k ? 'on' : ''}" data-act="o-tab" data-k="${k}">${{ queue: 'Today', contacts: 'Contacts', companies: 'Companies', import: 'Import', setup: 'Templates & setup' }[k]}</button>`).join('');
      let body = '';
      if (OTAB === 'queue') {
        const todo = cs.filter(c => c.status === 'To contact').slice(0, 12);
        body = `<h3 class="h">Follow-ups due (${due.length})</h3><div class="card list">${due.length ? due.map(c => this.row(c)).join('') : '<p class="muted">None due.</p>'}</div>
          <h3 class="h">Next to contact</h3><div class="card list">${todo.length ? todo.map(c => this.row(c)).join('') : '<p class="muted">No contacts yet. Import your CDC list (Import tab) or add one by hand.</p>'}</div>
          <button class="btn" data-act="o-new">+ Add contact</button>`;
      }
      if (OTAB === 'contacts') {
        let l = cs.filter(c => (!OSTAT || c.status === OSTAT) && (!OQ || (c.name + ' ' + c.company + ' ' + c.email + ' ' + (c.title || '')).toLowerCase().includes(OQ.toLowerCase())));
        body = `<div class="form row2"><input id="oQ" placeholder="Search name, company, email" value="${esc(OQ)}"><select id="oStat"><option value="">All statuses</option>${VK_OUTREACH.STATUSES.map(st => `<option ${st === OSTAT ? 'selected' : ''}>${st}</option>`).join('')}</select></div>
          <div class="small muted mt">${l.length} of ${cs.length} contacts</div><div class="card list">${l.slice(0, 200).map(c => this.row(c)).join('') || '<p class="muted">Nothing here yet.</p>'}</div>
          <div class="row"><button class="btn" data-act="o-new">+ Add contact</button><button class="btn ghost" data-act="o-export">Export CSV</button></div>`;
      }
      if (OTAB === 'companies') {
        const L = VK_COMPANIES.LANES; let l = VK_COMPANIES.LIST.filter(c => (!OLANE || c.lane === OLANE) && (!OQ || (c.n + ' ' + c.roles + ' ' + c.fit).toLowerCase().includes(OQ.toLowerCase())));
        body = `<div class="chips">${['', ...Object.keys(L)].map(k => `<button class="chip ${OLANE === k ? 'on' : ''}" data-act="o-lane" data-k="${k}">${k ? L[k].n.split(' (')[0].split(' /')[0] : 'All'}</button>`).join('')}</div>
          ${OLANE ? `<div class="card small"><b>${esc(L[OLANE].n)}</b><br>Tests: ${esc(L[OLANE].test)}<br>Prepare: ${esc(L[OLANE].mods)}<br>When: ${esc(L[OLANE].when)}</div>` : ''}
          <input id="oQ" placeholder="Search companies" value="${esc(OQ)}" class="mt">
          <div class="card list">${l.map(c => { const k = c.lane + '|' + c.n, st = (S.coState[k] && S.coState[k].v) || '', n = cs.filter(x => x.company === c.n).length;
            return `<div class="co"><div><b>${esc(c.n)}</b> ${c.kgp ? '<span class="tag">KGP Day 1</span>' : ''}<small>${esc(c.roles)}${c.fit ? ' · ' + esc(c.fit) : ''}</small><small class="muted">${L[c.lane].n}${n ? ' · ' + n + ' contact(s)' : ''}</small></div><div class="bk"><select data-co="${esc(k)}"><option value="">—</option>${['Target', 'Researching', 'Applied', 'In process', 'Offer', 'Not now'].map(o => `<option ${o === st ? 'selected' : ''}>${o}</option>`).join('')}</select><button class="btn sm ghost" data-act="o-new" data-co="${esc(c.n)}" data-lane="${c.lane}">+ contact</button></div></div>`; }).join('')}</div>
          <p class="small muted">Starting map only. Hiring changes every season: confirm with CDC friends, LinkedIn and careers pages.</p>`;
      }
      if (OTAB === 'import') {
        body = `<div class="card"><h3>Import contacts (CSV)</h3><p class="small muted">Export your sheet as CSV (Google Sheets: File → Download → CSV). Columns can be in any order; you'll map them next. Contacts stay in your browser and your private vikram-data repo, never in the public app.</p><input type="file" id="oCsv" accept=".csv,text/csv"><div id="oMap"></div></div>`;
      }
      if (OTAB === 'setup') {
        const c = this.cfg();
        body = `<div class="card"><h3>Your links</h3><div class="form"><input id="oCv" placeholder="CV link (Google Drive, anyone with link can view)" value="${esc(c.cv)}"><input id="oLi" placeholder="LinkedIn URL" value="${esc(c.linkedin)}"><input id="oPh" placeholder="Phone (optional, shown in signature)" value="${esc(c.phone)}"></div></div>
          <div class="card"><h3>Proof line per lane</h3><p class="small muted">One sentence of evidence, inserted as {proof}. Keep only what you can defend for 5 minutes in an interview.</p>${Object.entries(VK_COMPANIES.LANES).map(([k, L]) => `<label class="small"><b>${esc(L.n)}</b><textarea data-proof="${k}" rows="2">${esc(c.proofs[k] || VK_OUTREACH.PROOFS[k])}</textarea></label>`).join('')}<button class="btn mt" data-act="o-savecfg">Save</button></div>
          <div class="card"><h3>HR phone script (60 seconds)</h3><ol class="small">${VK_OUTREACH.CALL.map(l => `<li>${esc(l)}</li>`).join('')}</ol></div>
          <div class="card"><h3>Templates</h3>${VK_OUTREACH.TEMPLATES.map(t => `<details><summary>${esc(t.n)}</summary><div><p class="small"><b>${esc(t.s)}</b></p><pre class="tpl">${esc(t.b)}</pre></div></details>`).join('')}<p class="small muted">Full playbook: notes module S6.</p></div>`;
      }
      return `<section class="hero small"><div class="eyebrow">Outreach · internships ${VK_OUTREACH.WINDOW[0][0].slice(0, 7)} → ${VK_OUTREACH.WINDOW[0][1].slice(0, 7)}</div><h1>Outreach</h1><div class="meta"><span class="pill"><span class="dot"></span>${this.sentOn(ds)}/${VK_OUTREACH.QUOTA} sent today</span><span class="pill">${due.length} follow-ups due</span><span class="pill">${cs.length} contacts · ${counts['Replied'] || 0} replied · ${(counts['Interview'] || 0) + (counts['Call / test'] || 0)} in process</span></div></section>
        ${cdc ? '' : `<div class="comeback"><b>Before your first email:</b> several IITs bar students registered with their placement cell from contacting company HRs directly. Ask your CDC friends what KGP's rule is, and use direct outreach only where it's allowed (typically off-campus companies not in the CDC process).<label class="switch mt"><input type="checkbox" data-act="o-cdc"> I've confirmed KGP CDC's rules</label></div>`}
        <div class="chips">${sub}</div>${body}`;
    },
    row(c) { return `<div class="item crow" data-act="o-open" data-id="${c.id}"><span><b>${esc(c.name || c.email)}</b><small>${esc([c.title, c.company].filter(Boolean).join(' · '))}</small><small class="muted">${esc(c.status)}${c.next ? ' · next ' + fmtD(c.next) : ''}</small></span></div>`; },
    bind() {
      const q = $('#oQ'); if (q) q.oninput = debounce(() => { OQ = q.value; render(); const n = $('#oQ'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 300);
      const st = $('#oStat'); if (st) st.onchange = () => { OSTAT = st.value; render(); };
      $$('[data-co]').forEach(sel => { if (sel.tagName === 'SELECT') sel.onchange = () => { S.coState[sel.dataset.co] = { v: sel.value, ts: ts() }; save(); }; });
      const f = $('#oCsv'); if (f) f.onchange = () => { const file = f.files[0]; if (!file) return; const r = new FileReader(); r.onload = () => this.mapUI(parseCSV(r.result)); r.readAsText(file); };
    },
    mapUI(rows) {
      if (!rows.length) return toast('Empty CSV');
      const head = rows[0], data = rows.slice(1).filter(r => r.some(x => x && x.trim()));
      const guess = k => { const pats = { name: /^(full\s*)?name|contact|person/i, email: /e-?mail/i, company: /company|organi[sz]ation|firm|employer/i, title: /title|designation|role|position/i, phone: /phone|mobile|contact\s*no|number/i, linkedin: /linkedin/i };
        const i = head.findIndex(h => pats[k].test(h)); return i; };
      const fields = ['name', 'email', 'company', 'title', 'phone', 'linkedin'];
      $('#oMap').innerHTML = `<p class="small"><b>${data.length}</b> rows found. Check the column mapping:</p>${fields.map(k => `<label class="edrow2"><span>${k}</span><select data-map="${k}"><option value="-1">(none)</option>${head.map((h, i) => `<option value="${i}" ${guess(k) === i ? 'selected' : ''}>${esc(h)}</option>`).join('')}</select></label>`).join('')}
        <label class="small">Lane for these contacts <select id="oLaneImp">${Object.entries(VK_COMPANIES.LANES).map(([k, L]) => `<option value="${k}">${esc(L.n)}</option>`).join('')}</select></label>
        <button class="btn mt" id="oDoImp">Import ${data.length} contacts</button>`;
      $('#oDoImp').onclick = () => { const m = {}; $$('[data-map]').forEach(s2 => m[s2.dataset.map] = +s2.value); const lane = $('#oLaneImp').value; let added = 0, dup = 0;
        const have = new Set(this.list().map(c => (c.email || '').toLowerCase()).filter(Boolean));
        data.forEach((r, i) => { const g = k => m[k] >= 0 ? (r[m[k]] || '').trim() : ''; const email = g('email'); if (!email && !g('name')) return;
          if (email && have.has(email.toLowerCase())) { dup++; return; } have.add(email.toLowerCase());
          const id = 'c' + ts().toString(36) + i; S.contacts[id] = { id, name: g('name'), email, company: g('company'), title: g('title'), phone: g('phone'), linkedin: g('linkedin'), lane, status: 'To contact', source: 'CSV', notes: '', next: null, ts: ts() }; added++; });
        save(); toast(`Imported ${added}${dup ? ', skipped ' + dup + ' duplicates' : ''}`); OTAB = 'contacts'; render(); };
    },
    act(act, a) {
      const ds = nowIST().date;
      if (act === 'o-tab') { OTAB = a.dataset.k; OQ = ''; render(); }
      if (act === 'o-lane') { OLANE = a.dataset.k; render(); }
      if (act === 'o-cdc') { S.settings.cdc = { v: true, date: ds, ts: ts() }; save(); render(); }
      if (act === 'o-new') this.open(null, { company: a.dataset.co || '', lane: a.dataset.lane || 'pm' });
      if (act === 'o-open') this.open(a.dataset.id);
      if (act === 'o-savecfg') { const c = this.cfg(); c.cv = $('#oCv').value.trim(); c.linkedin = $('#oLi').value.trim(); c.phone = $('#oPh').value.trim(); c.proofs = {}; $$('[data-proof]').forEach(t => { if (t.value.trim() !== VK_OUTREACH.PROOFS[t.dataset.proof]) c.proofs[t.dataset.proof] = t.value.trim(); }); c.ts = ts(); S.settings.out = c; save(); toast('Saved'); }
      if (act === 'o-export') { const cols = ['name', 'email', 'company', 'title', 'phone', 'linkedin', 'lane', 'status', 'next', 'notes']; const csv = [cols.join(',')].concat(this.list().map(c => cols.map(k => '"' + String(c[k] || '').replace(/"/g, '""') + '"').join(','))).join('\n'); download('vikram-contacts-' + ds + '.csv', csv, 'text/csv'); }
    },
    open(id, pre) {
      const ds = nowIST().date; const c = id ? Object.assign({}, S.contacts[id]) : Object.assign({ id: 'c' + ts().toString(36), name: '', email: '', company: '', title: '', phone: '', linkedin: '', lane: 'pm', status: 'To contact', notes: '', next: null }, pre || {});
      const tplFor = c.status === 'Sent' ? 'fu1' : c.status === 'Follow-up 1' ? 'fu2' : 'cold';
      const L = VK_COMPANIES.LANES;
      $('#overlay').innerHTML = `<div class="quizbox"><div class="row-between"><span class="eyebrow">${id ? 'Contact' : 'New contact'}</span><button class="btn sm ghost" id="cX">✕</button></div>
        <div class="form row2"><input id="cName" placeholder="Name" value="${esc(c.name)}"><input id="cEmail" placeholder="Email" value="${esc(c.email)}"><input id="cCo" placeholder="Company" value="${esc(c.company)}"><input id="cTitle" placeholder="Title" value="${esc(c.title)}"><input id="cPhone" placeholder="Phone" value="${esc(c.phone)}"><input id="cLi" placeholder="LinkedIn" value="${esc(c.linkedin)}">
        <select id="cLane">${Object.entries(L).map(([k, x]) => `<option value="${k}" ${k === c.lane ? 'selected' : ''}>${esc(x.n)}</option>`).join('')}</select><select id="cStat">${VK_OUTREACH.STATUSES.map(st => `<option ${st === c.status ? 'selected' : ''}>${st}</option>`).join('')}</select></div>
        <textarea id="cNotes" rows="2" placeholder="Notes (how you found them, what they said)" class="mt">${esc(c.notes)}</textarea>
        <div class="row"><button class="btn sm" id="cSave">Save</button>${id ? '<button class="btn sm ghost" id="cDel">Delete</button>' : ''}</div>
        <h3 class="h">Draft</h3>
        <div class="form row2"><select id="dTpl">${VK_OUTREACH.TEMPLATES.map(t => `<option value="${t.id}" ${t.id === tplFor ? 'selected' : ''}>${esc(t.n)}</option>`).join('')}</select><input id="dTeam" placeholder="Team / role (e.g. product, decision science)" value=""></div>
        <input id="dHook" class="mt" placeholder="Hook: one specific line about THEM (required), e.g. 'I read your post on X'">
        <input id="dVal" class="mt" placeholder="New value for follow-ups, e.g. '${esc(VK_OUTREACH.VALUE_IDEAS[0].replace('{company}', c.company || 'your'))}'">
        <input id="dSub" class="mt"><textarea id="dBody" rows="10" class="mt"></textarea>
        <div class="row"><button class="btn" id="dGmail">Open in Gmail</button><button class="btn ghost" id="dCopy">Copy</button><button class="btn ghost" id="dSent">Mark as sent</button></div>
        <p class="small muted">"Mark as sent" schedules follow-ups on day ${VK_OUTREACH.FOLLOWUPS[0]} and day ${VK_OUTREACH.FOLLOWUPS[1]}. Only one person at a time; no blasts.</p></div>`;
      $('#overlay').classList.add('show');
      const read = () => Object.assign(c, { name: $('#cName').value.trim(), email: $('#cEmail').value.trim(), company: $('#cCo').value.trim(), title: $('#cTitle').value.trim(), phone: $('#cPhone').value.trim(), linkedin: $('#cLi').value.trim(), lane: $('#cLane').value, status: $('#cStat').value, notes: $('#cNotes').value });
      const draft = () => { read(); const t = VK_OUTREACH.TEMPLATES.find(x => x.id === $('#dTpl').value); const x = { team: $('#dTeam').value.trim(), hook: $('#dHook').value.trim(), value: $('#dVal').value.trim() };
        $('#dSub').value = this.fill(t.s, c, x); $('#dBody').value = this.fill(t.b, c, x); };
      ['dTpl', 'dTeam', 'dHook', 'dVal', 'cName', 'cCo', 'cLane'].forEach(i => { $('#' + i).oninput = draft; $('#' + i).onchange = draft; }); draft();
      const persist = () => { read(); c.ts = ts(); S.contacts[c.id] = c; save(); };
      const needHook = () => { if (!$('#dHook').value.trim() && ['cold', 'alum', 'li'].includes($('#dTpl').value)) { toast('Add a specific hook first: generic emails get ignored'); $('#dHook').focus(); return true; } return false; };
      $('#cX').onclick = () => { $('#overlay').classList.remove('show'); render(); };
      $('#cSave').onclick = () => { persist(); toast('Saved'); };
      if ($('#cDel')) $('#cDel').onclick = () => { c.del = true; persist(); $('#overlay').classList.remove('show'); render(); };
      $('#dCopy').onclick = () => { if (needHook()) return; const txt = ($('#dSub').value ? 'Subject: ' + $('#dSub').value + '\n\n' : '') + $('#dBody').value; try { navigator.clipboard.writeText(txt).then(() => toast('Copied')); } catch (e) { toast('Copy blocked: select and copy manually'); } };
      $('#dGmail').onclick = () => { if (needHook()) return; if (!$('#cEmail').value.trim()) return toast('Add an email address'); persist(); location.href = `mailto:${encodeURIComponent($('#cEmail').value.trim())}?subject=${encodeURIComponent($('#dSub').value)}&body=${encodeURIComponent($('#dBody').value)}`; };
      $('#dSent').onclick = () => { if (needHook()) return; read(); const F = VK_OUTREACH.FOLLOWUPS;
        if (c.status === 'To contact') { c.status = 'Sent'; c.next = wkday(addDays(ds, F[0])); c.subject = $('#dSub').value; }
        else if (c.status === 'Sent') { c.status = 'Follow-up 1'; c.next = wkday(addDays(ds, F[1] - F[0])); }
        else if (c.status === 'Follow-up 1') { c.status = 'Follow-up 2'; c.next = null; }
        c.last = ds; $('#cStat').value = c.status; const nx = c.next; persist(); c.next = nx; S.contacts[c.id].next = nx; S.sent.push({ id: 's' + ts(), cid: c.id, tpl: $('#dTpl').value, d: ds, ts: ts() }); save(); toast('Logged. Next follow-up ' + (c.next ? fmtD(c.next) : 'none')); $('#overlay').classList.remove('show'); render(); };
    }
  };
  function parseCSV(text) { const rows = []; let row = [], cur = '', q = false; text = text.replace(/^\uFEFF/, '');
    for (let i = 0; i < text.length; i++) { const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { row.push(cur); cur = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += ch; }
    if (cur || row.length) { row.push(cur); rows.push(row); } return rows; }

  // ================= calendar (.ics) =================
  function downloadICS() {
    const start = nowIST().date < '2026-12-01' ? '2026-12-01' : nowIST().date; const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//VIKRAM//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:VIKRAM', 'X-WR-TIMEZONE:Asia/Kolkata'];
    for (let i = 0; i < 62; i++) { const ds = addDays(start, i); blocksFor(ds).forEach((b, j) => { if (!b.nudge && b.k !== 'prep') return; const dt = ds.replace(/-/g, ''); let endDs = ds; if (toMin(b.e) <= toMin(b.s)) endDs = addDays(ds, 1);
      L.push('BEGIN:VEVENT', `UID:vikram-${dt}-${j}@vikram`, `DTSTAMP:${dt}T000000Z`, `DTSTART;TZID=Asia/Kolkata:${dt}T${b.s.replace(':', '')}00`, `DTEND;TZID=Asia/Kolkata:${endDs.replace(/-/g, '')}T${(toMin(b.e) <= toMin(b.s) ? '05:00' : b.e).replace(':', '')}00`, `SUMMARY:${icsEsc('VIKRAM · ' + b.t)}`, `DESCRIPTION:${icsEsc(b.nudge || 'Open Vikram for this block.')}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(b.nudge || b.t)}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT'); }); }
    L.push('END:VCALENDAR'); download('vikram-alarms.ics', L.join('\r\n'), 'text/calendar'); toast('Calendar file ready: import it into Google Calendar');
  }
  const icsEsc = s => String(s).replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');

  // ================= sync via GitHub contents API =================
  const Sync = {
    status: 'off', last: null, err: '', timer: null, busy: false,
    cfg() { const c = LS.get(SYNCKEY, {}); return c.owner && c.repo && c.token ? c : null; },
    schedule() { if (!this.cfg()) return; clearTimeout(this.timer); this.timer = setTimeout(() => this.now(), 4000); },
    b64e(str) { const bytes = new TextEncoder().encode(str); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); },
    b64d(b) { return new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\n/g, '')), c => c.charCodeAt(0))); },
    async now(loud) {
      const c = this.cfg(); if (!c) { this.status = 'off'; return; } if (this.busy || !navigator.onLine) { if (!navigator.onLine) { this.status = 'offline'; } return; }
      this.busy = true; this.status = 'syncing'; dot();
      const url = `https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/contents/${CFG.dataPath}`;
      const H = { Authorization: 'Bearer ' + c.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
      try {
        for (let attempt = 0; attempt < 3; attempt++) {
          let remote = null, sha = undefined; const r = await fetch(url + '?t=' + ts(), { headers: H, cache: 'no-store' });
          if (r.status === 200) { const j = await r.json(); sha = j.sha; let txt = j.content ? this.b64d(j.content) : null; if (!txt) { const rr = await fetch(url, { headers: Object.assign({}, H, { Accept: 'application/vnd.github.raw' }), cache: 'no-store' }); txt = await rr.text(); } remote = JSON.parse(txt); }
          else if (r.status !== 404) throw new Error('GitHub ' + r.status + (r.status === 401 ? ' (token?)' : ''));
          const merged = merge(remote, S); const local = S; S = merged; ['days', 'tasks', 'taskDue', 'books', 'writing', 'subs', 'settings', 'srs', 'contacts', 'coState'].forEach(k => S[k] = S[k] || {}); S.math = S.math || []; S.practice = S.practice || []; S.sent = S.sent || []; LS.set(KEY, S);
          const body = { message: 'vikram sync ' + deviceId + ' ' + new Date().toISOString(), content: this.b64e(JSON.stringify(S)) }; if (sha) body.sha = sha;
          const p = await fetch(url, { method: 'PUT', headers: H, body: JSON.stringify(body) });
          if (p.status === 409 || p.status === 422) { continue; }
          if (!p.ok) throw new Error('GitHub write ' + p.status);
          this.status = 'ok'; this.last = ts(); this.err = ''; if (loud) toast('Synced'); break;
        }
      } catch (e) { this.status = 'error'; this.err = e.message; if (loud) toast('Sync failed: ' + e.message); }
      this.busy = false; dot(); if (TAB !== 'today' || loud) render();
    }
  };
  function dot() { const d = $('#syncDot'); if (d) d.className = 'syncdot ' + Sync.status; }

  // ================= push =================
  const Push = {
    async enable() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return toast('Push needs the installed app over https');
      const perm = await Notification.requestPermission(); if (perm !== 'granted') return toast('Notifications blocked: allow them in browser settings');
      try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(CFG.vapidPublic) });
        S.subs[deviceId] = { sub: sub.toJSON(), ts: ts(), ua: navigator.userAgent.slice(0, 80) }; save(); Sync.now(true); toast('Push on for this device'); } catch (e) { toast('Push failed: ' + e.message); }
    },
    async test() { try { if (Notification.permission !== 'granted') await Notification.requestPermission(); const reg = 'serviceWorker' in navigator && await navigator.serviceWorker.getRegistration(); const opt = { body: 'Vikram is watching your back. Stay on plan.', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' }; if (reg) reg.showNotification('VIKRAM', opt); else new Notification('VIKRAM', opt); } catch (e) { toast('Notifications not available here'); } }
  };
  function u8(b64) { const p = '='.repeat((4 - b64.length % 4) % 4), s = (b64 + p).replace(/-/g, '+').replace(/_/g, '/'), raw = atob(s); return Uint8Array.from(raw, c => c.charCodeAt(0)); }

  // in-app block reminders while the app is open (laptop)
  let lastMin = nowIST().mins;
  setInterval(() => {
    const n = nowIST(); if (n.date < '2026-12-01') return; const m = n.mins;
    if (m !== lastMin) { const hits = []; blocksFor(n.date).forEach(b => { const s = toMin(b.s); if (b.nudge && s > lastMin && s <= m) hits.push(b); (b.extra || []).forEach(x => { const xm = toMin(x.at); if (xm > lastMin && xm <= m) hits.push({ t: b.t, nudge: x.msg }); }); });
      hits.forEach(b => { try { if (typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification('VIKRAM · ' + b.t, { body: b.nudge, icon: 'icons/icon-192.png' }); } catch (e) { } toast(b.nudge); });
      lastMin = m; if (TAB === 'today') render(); }
  }, 20000);

  // ================= boot =================
  applyTheme();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
  $$('.tabbar button, .toptabs button').forEach(b => b.onclick = () => go(b.dataset.tab));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { Sync.now(); render(); } else if (Sync.cfg()) Sync.now(); });
  window.addEventListener('online', () => Sync.now());
  setInterval(() => Sync.now(), 180000);
  save(false); render(); Sync.now();
  window.VIKRAM = { parseCSV, Out, S: () => S, merge, score, streakInfo, activeItems, dayType, blocksFor, xp };
})();
