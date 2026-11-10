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
  ['days', 'tasks', 'taskDue', 'books', 'writing', 'subs', 'settings', 'srs', 'contacts', 'coState', 'lib', 'fr', 'chess', 'wd', 'reviews', 'stakes', 'stories', 'gita', 'live', 'my'].forEach(k => S[k] = S[k] || {});
  C.setPlan(S.settings.seasonPlan);
  S.math = S.math || []; S.practice = S.practice || []; S.sent = S.sent || []; S.focus = S.focus || [];
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
  const habitBase = Object.fromEntries(C.HABITS.map(h => [h.id, h]));
  const habitById = new Proxy(habitBase, { get(t, id) { if (t[id]) return t[id]; const m = S.my && S.my.habits && S.my.habits[id]; return m ? { id, t: m.t, min: m.t, start: '2000-01-01', cat: 'my' } : undefined; } });
  const myList = (kind, ds) => { const sid = C.seasonAt(ds).id, o = (S.my && S.my[kind]) || {}; return Object.keys(o).filter(k => o[k].v && o[k].season === sid).sort((a, b) => o[a].ts - o[b].ts); };
  const hidden = (ds, id) => { const o = S.my && S.my.off && S.my.off[C.seasonAt(ds).id + ':' + id]; return !!(o && o.v); };
  function day(ds) { S.days[ds] = S.days[ds] || { items: {} }; S.days[ds].items = S.days[ds].items || {}; return S.days[ds]; }
  function dayType(ds) { const o = S.settings.dayType && S.settings.dayType[ds]; return (o && o.v) || C.defaultDayType(ds); }
  function blocksFor(ds) {
    const t = dayType(ds), edit = S.settings.blocks && S.settings.blocks[t];
    return (edit && edit.list) || C.SCHEDULES[t].blocks;
  }
  const isOn = (d, id) => !!(d.items[id] && d.items[id].v);
  function activeItems(ds) {
    const set = []; blocksFor(ds).forEach(b => (b.items || []).forEach(id => { const h = habitById[id]; if (h && h.start <= ds && !set.includes(id) && !hidden(ds, id)) set.push(id); }));
    if (minimumMode(ds)) return C.seasonAt(ds).id === 'placement' ? ['yoga', 'deep1', 'reading'].filter(id => habitById[id].start <= ds) : set.slice(0, 3);
    return set.concat(myList('habits', ds));
  }
  function minimumMode(ds) { const d = S.days[ds]; return !!(d && d.minimum && d.minimum.v) || (S.comeback.active && ds >= (S.comeback.since || ds)); }
  function taskDue(t) { const o = S.taskDue[t.id]; return (o && o.date) || t.due; }
  const taskDone = t => !!(S.tasks[t.id] && S.tasks[t.id].done);
  function tasksForToday(ds) {
    const mine = myList('tasks', ds).map(id => ({ id, t: S.my.tasks[id].t, due: ds, my: 1 })).filter(t => !taskDone(t));
    if (C.seasonAt(ds).id !== 'placement') return mine.slice(0, minimumMode(ds) ? 1 : 5);
    return mine.concat(C.TASKS.filter(t => !taskDone(t) && taskDue(t) <= addDays(ds, 3)).sort((a, b) => taskDue(a) < taskDue(b) ? -1 : 1).slice(0, minimumMode(ds) ? 1 : 4));
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
    x += Object.values(S.stories).reduce((a, r) => a + ((r.max || 0) + 1) * 3, 0);
    x += Object.values(S.lib).filter(r => r.v).length * 30 + Object.values(S.fr).filter(r => r.done).length * 40 + Object.values((S.chess && S.chess.puz) || {}).filter(r => r.ok).length * 5;
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
    const overdue = C.seasonAt(today).id !== 'placement' ? [] : C.TASKS.filter(t => !taskDone(t) && taskDue(t) < today);
    overdue.forEach((t, i) => { S.taskDue[t.id] = { date: addDays(today, 1 + Math.floor(i * 7 / Math.max(overdue.length, 1))), ts: ts() }; });
    if (overdue.length) S.comeback.moved = overdue.length;
  }

  // ================= UI shell =================
  let TAB = location.hash.replace('#', '') || 'today';
  const EXT = window.VK_EXT || { views: {}, binds: {}, acts: {}, tabs: [] };
  const tabs = ['today', 'prep', 'feed', 'life', 'more', 'outreach', 'learn', 'review', 'resources'].concat(EXT.tabs);
  function go(t) { TAB = tabs.includes(t) ? t : 'today'; try { history.replaceState(null, '', location.pathname + location.search + '#' + TAB); } catch (e) { } render(); window.scrollTo(0, 0); }
  window.addEventListener('hashchange', () => { const t = location.hash.replace('#', ''); if (t !== TAB && tabs.includes(t)) { TAB = t; render(); } });
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600); }

  function render() {
    C.setPlan(S.settings.seasonPlan);
    $$('.tabbar button, .toptabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === TAB));
    const v = $('#view');
    let html = ({ today: viewToday, prep: viewPrep, feed: viewFeed, life: viewLife, more: viewMore, outreach: viewOutreach, learn: viewLearn, review: viewReview, resources: viewResources }[TAB] || EXT.views[TAB] || viewToday)();
    if (TAB === 'today' && EXT.todayCard) { const i = html.indexOf('</section>') + 10; html = html.slice(0, i) + EXT.todayCard() + html.slice(i); }
    v.innerHTML = html;
    bind[TAB] ? bind[TAB]() : EXT.binds[TAB] && EXT.binds[TAB]();
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
    if (!SIM) { const d0 = day(ds); if (!d0.firstSeen) { d0.firstSeen = { v: n.mins, ts: 2e13 - Date.now() }; save(); } }
    autoVerify(ds);
    const prev = SIM ? `<div class="comeback"><b>Preview mode</b> (${fmtD(ds)}${SIMTIME ? ' ' + SIMTIME : ''}). Nothing you tick here is saved. <a href="./#today">Exit preview</a></div>` : '';
    const blocks = blocksFor(ds), cur = currentBlock(blocks, n.mins), dd = day(ds);
    const sc = score(ds), st = streakInfo(ds), X = xp(), mm = minimumMode(ds), items = activeItems(ds);
    const tasks = tasksForToday(ds);
    const hobby = [...C.HOBBY_PLAN].reverse().find(h => h.from <= ds);
    const cb = S.comeback.active ? `<div class="comeback"><b>Welcome back.</b> No guilt, just restart. ${esc(S.comeback.reason || '')}. Today is a 3-task day.${S.comeback.moved ? ` ${S.comeback.moved} overdue task(s) were spread over the next week.` : ''} Three good days and the full plan returns.<div class="why">"${esc((p.why || '').split('.')[0])}."</div></div>` : '';
    return `
    <section class="hero small"><div class="eyebrow">${fmtDL(ds)} · ${esc(C.SCHEDULES[dayType(ds)].name)}</div>
      <h1>${greet(n.mins)}, ${esc(p.name || 'Aryan')}.</h1>
      <div class="meta"><span class="pill"><span class="dot"></span>${d1} days to Day 1</span><span class="pill">Lv · ${X.level} · ${X.x} XP</span><span class="pill">🔥 ${st.streak} day streak${st.freezes ? ` · ❄ ${st.freezes}` : ''}</span><span class="pill">✓ ${focusMins(ds)}/${targetMins(ds)} verified min</span></div></section>
    ${prev}${cb}
    <div class="nowcard"><div>${cur ? `<div class="eyebrow">Now · until ${cur.e}</div><h2>${esc(cur.t)}</h2><div class="muted small">${cur.left} min left · next: ${esc(cur.next ? cur.next.s + ' ' + cur.next.t : 'sleep')}</div>` : '<h2>Sleep</h2>'}</div>
      <div class="ring" style="--p:${sc}"><span>${sc}</span><small>today</small></div></div>

    ${pledgeCard(ds, n)}
    <button class="urge" data-act="urge">Urge to scroll? <b>Beat it →</b><small>${(dd.urges && dd.urges.n) || 0} beaten today</small></button>
    <div class="row-between"><h3 class="h">Today's checklist</h3><label class="switch"><input type="checkbox" data-act="minimum" ${mm ? 'checked' : ''} ${S.comeback.active ? 'disabled' : ''}> Minimum day</label></div>
    <div class="card list">${items.map(id => { const h = habitById[id]; const on = isOn(dd, id); const txt = id === 'hobby' && hobby ? hobby.t : (mm ? h.min : h.t); const V = VERIFY[id], ver = verified(ds, id), lock = strict() && V && !on;
      const badge = on ? (ver ? '<span class="vb">✓ verified</span>' : (V ? '<span class="vb self">self-reported</span>' : '')) : (V ? `<span class="vb need">proof: ${esc(V.how)}</span>` : '');
      const go = lock && V.act ? `<button class="btn sm ghost" data-act="${V.act}" ${V.kind ? `data-kind="${V.kind}"` : ''} ${V.k ? `data-k="${V.k}"` : ''} ${V.to ? `data-to="${V.to}"` : ''}>${V.act === 'focus' ? '▶ timer' : 'open'}</button>` : '';
      return `<label class="item ${on ? 'done' : ''} ${lock ? 'locked' : ''}"><input type="checkbox" data-habit="${id}" ${on ? 'checked' : ''} ${lock || (on && ver) ? 'disabled' : ''}><span>${esc(txt)}<small>${esc(mm ? '' : 'min: ' + h.min)}</small>${badge}</span>${go}</label>`; }).join('')}</div>
    <h3 class="h">Placement tasks</h3>
    <div class="card list">${tasks.length ? tasks.map(t => taskRow(t, ds)).join('') : '<p class="muted">Nothing due in the next 3 days. Do a timed set or a math sprint.</p>'}</div>
    ${Out.windowOpen(ds) ? `<div class="drills"><button class="btn" data-act="go" data-to="outreach">Outreach · ${Out.sentOn(ds)}/${VK_OUTREACH.QUOTA} sent · ${Out.due(ds).length} follow-up${Out.due(ds).length === 1 ? '' : 's'} due</button></div>` : ''}
    ${Learn.today(ds)}
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
    return `<label class="item ${taskDone(t) ? 'done' : ''} ${late ? 'late' : ''}"><input type="checkbox" data-task="${t.id}" ${taskDone(t) ? 'checked' : ''}><span><span class="tt"><b>${t.m ? t.m + ' · ' : ''}</b>${esc(t.t)}</span><small>${t.my ? 'your goal' : (late ? 'overdue · ' : '') + 'due ' + fmtD(due)} ${link}</small></span></label>`;
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
    <div class="card"><div class="row-between"><div><h3>Go further</h3><small class="muted">${VK_RESOURCES.reduce((a, g) => a + g.r.length, 0)} free outside resources, sorted by area</small></div><button class="btn" data-act="go" data-to="resources">Open</button></div></div>
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
    const decks = {}; Cards.pool().forEach(c => decks[c.deck] = (decks[c.deck] || 0) + 1);
    return `<div class="card"><h3>Practice</h3><p class="small muted">Fresh questions every time; every answer is computed. Results feed your weak-topic list.</p>
      <div class="modes">${Object.entries(P.MODES).map(([k, m]) => `<button class="mode" data-act="quiz" data-mode="${k}"><b>${esc(m.title)}</b><small>${m.n} Qs · ${m.secs / 60} min</small></button>`).join('')}</div>
      ${weak.length ? `<p class="small"><b>Weakest topics:</b> ${weak.map(([t, a]) => `${esc(t)} ${Math.round(a * 100)}%`).join(' · ')}</p>` : ''}
      ${last.length ? `<div class="small muted">Recent: ${last.map(p => `${esc(P.MODES[p.mode] ? P.MODES[p.mode].title : p.mode)} ${p.sc}/${p.n}`).join(' · ')}</div>` : ''}</div>
    <div class="card"><div class="row-between"><div><h3>Flashcards</h3><small class="muted">${Cards.pool().length} cards · ${Cards.due(ds).length} due today · decks: ${Object.entries(decks).map(([d, n]) => d + ' ' + n).join(', ')}</small></div><button class="btn" data-act="cards">Review</button></div></div>`;
  }
  function spark(arr) {
    if (arr.length < 2) return '<p class="muted small">Your scores will chart here.</p>';
    const w = 300, h = 50, mx = Math.max(...arr, 10), pts = arr.map((v, i) => `${(i / (arr.length - 1)) * w},${h - (v / mx) * (h - 6) - 3}`).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" class="spark"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
  }

  // ---------- FEED ----------
  let feedIdx = LS.get('vikram_feed_idx', Math.floor(Math.random() * C.FEED.length));
  let feedGen = null, feedPuz = null, FPOOL = null, FMAP = null;
  function feedMap() { if (FMAP) return FMAP; const n = feedPool().length, out = []; let st = 0; for (let i = 0; st < n; i++) { const k = i % 4 === 3 ? 'q' : i % 9 === 5 ? 'c' : i % 6 === 1 ? 'f' : i % 10 === 8 ? 'v' : null; out.push(k || st++); } return (FMAP = out); }
  function feedPool() {
    if (FPOOL) return FPOOL;
    const L = typeof VK_LIBRARY !== 'undefined' ? VK_LIBRARY : { QUOTES: [], TEXTS: [] };
    const qs = (L.QUOTES || []).map(q => { const t = L.TEXTS.find(x => x.id === q.id); return { k: 'history', q: '“' + q.q + '”', a: t.author + ', ' + t.title + ' (' + t.era + '). ' + q.why, lib: q.id, li: q.i }; });
    const out = []; let qi = 0; C.FEED.forEach((c, i) => { out.push(c); if (i % 3 === 2 && qi < qs.length) out.push(qs[qi++]); }); return (FPOOL = out.concat(qs.slice(qi)));
  }
  function viewFeed() { let h = viewFeedCards(); const i = h.indexOf('</section>') + 10; const lv = EXT.feedCard && EXT.feedCard(LS.get('vikram_feed_n', 0));
    if (lv) { feedPuz = null; h = h.slice(0, i).replace(/<h1>.*?<\/h1>/, '<h1>' + lv.h + '</h1>') + lv.html + '<div class="row-between"><button class="btn ghost" data-act="feedprev">← Back</button><button class="btn" data-act="feednext">Next card →</button></div>'; }
    const j = h.indexOf('</section>') + 10; return h.slice(0, j) + Story.shelf() + h.slice(j).replace('Cards grow every batch: original history texts, French, aptitude, geopolitics.', 'This feed never ends: live cards from Wikipedia, the Gita, French and new words are mixed in.'); }
  function viewFeedCards() {
    const ds = nowIST().date, dd = day(ds);
    const slot = feedMap()[feedIdx % feedMap().length];
    if (slot === 'q' && typeof VK_PRACTICE !== 'undefined') { const g = feedGen || (feedGen = VK_PRACTICE.one());
      return `<section class="hero small"><div class="eyebrow">Feed · instead of Instagram</div><h1>Solve this one.</h1><div class="meta"><span class="pill"><span class="dot"></span>${(dd.urges && dd.urges.n) || 0} urges beaten today</span><span class="pill">${(dd.cards && dd.cards.n) || 0} cards read</span></div></section>
      <div class="feedcard k-apt"><div class="eyebrow">Solve it · ${esc(g.t)}</div>${g.ctx || ''}<h2>${esc(g.q)}</h2><div class="opts">${g.opts.map((o, i) => `<button class="opt" data-act="feedopt" data-i="${i}">${esc(o)}</button>`).join('')}</div><div class="ans hide" id="ans">${esc(g.exp)}</div></div>
      <div class="row-between"><button class="btn ghost" data-act="feedprev">← Back</button><button class="btn" data-act="feednext">Next card →</button></div>`; }
    const hero = t => `<section class="hero small"><div class="eyebrow">Feed · instead of Instagram</div><h1>${t}</h1><div class="meta"><span class="pill"><span class="dot"></span>${(dd.urges && dd.urges.n) || 0} urges beaten today</span><span class="pill">${(dd.cards && dd.cards.n) || 0} cards read</span></div></section>`;
    const nav = `<div class="row-between"><button class="btn ghost" data-act="feedprev">← Back</button><button class="btn" data-act="feednext">Next card →</button></div>`;
    if (slot === 'c' && typeof VK_PUZZLES !== 'undefined') { const P = VK_PUZZLES.mixed, puz = S.chess.puz || {}; const open = P.filter(p => !puz[p.id]); const p = (open.length ? open : P)[Math.floor(feedIdx / 9) % (open.length || P.length)]; feedPuz = p;
      return hero('Find the move.') + `<div class="feedcard k-chess"><div class="eyebrow">Chess puzzle · rated ${p.r}</div><p id="kMsg" class="kmsg"></p><div id="feedBoard"></div><div class="row"><button class="btn sm ghost" id="kH">Hint</button><button class="btn sm ghost" id="kS">Solution</button></div></div>` + nav; }
    feedPuz = null;
    if (slot === 'f' && typeof VK_FRENCH !== 'undefined') { const all = VK_FRENCH.UNITS.flatMap(u => u.w); const w = all[(feedIdx * 7) % all.length];
      return hero('Un mot, s\'il vous plaît.') + `<div class="feedcard k-french"><div class="eyebrow">Français</div><h2>${esc(w[0])} <button class="btn sm ghost" data-act="l-say" data-t="${esc(w[0])}">🔊</button></h2><div class="ans" id="ans">${esc(w[1])} · <span class="muted">${esc(w[2])}</span></div></div>` + nav; }
    if (slot === 'v' && typeof VK_WORDS !== 'undefined') { const A = allWords(), w = A[(feedIdx * 13) % A.length];
      return hero('Word up.') + `<div class="feedcard k-words"><div class="eyebrow">English · ${esc(w[1])}</div><h2>${esc(w[0])} <button class="btn sm ghost" data-act="w-say" data-t="${esc(w[0])}">🔊</button></h2><div class="ans hide" id="ans">${esc(w[2])}<br><span class="muted">"${esc(w[3])}"</span></div><button class="btn sm" data-act="reveal">Reveal meaning</button> <a class="lnk" href="${dictUrl(w)}" target="_blank" rel="noopener">dictionary ↗</a></div>` + nav; }
    const c = feedPool()[typeof slot === 'number' ? slot : feedIdx % feedPool().length];
    const label = c.lib ? 'From the originals' : { apt: 'Solve it', history: 'History', geo: 'Geopolitics', french: 'Français', biz: 'Business', mind: 'Mind' }[c.k];
    return `<section class="hero small"><div class="eyebrow">Feed · instead of Instagram</div><h1>One card. Then another.</h1><div class="meta"><span class="pill"><span class="dot"></span>${(dd.urges && dd.urges.n) || 0} urges beaten today</span><span class="pill">${(dd.cards && dd.cards.n) || 0} cards read</span></div></section>
    <div class="feedcard k-${c.k}"><div class="eyebrow">${label}</div><h2 class="${c.lib ? 'quote' : ''}">${esc(c.q)}</h2><div class="ans ${c.k === 'apt' ? 'hide' : ''}" id="ans">${esc(c.a)}</div>${c.k === 'apt' ? '<button class="btn sm" data-act="reveal">Reveal answer</button>' : ''}${c.lib ? `<button class="btn sm ghost" data-act="l-read" data-id="${c.lib}" data-i="${c.li}">Read the passage</button>` : ''}</div>
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
    <div class="card"><div class="row-between"><div><h3>Weekly review</h3><small class="muted">Score, verified focus, pledges, accuracy, stake · send to your partner</small></div><button class="btn" data-act="go" data-to="review">Open</button></div></div>
    <div class="card"><div class="row-between"><div><h3>Learn</h3><small class="muted">History from the originals · English words · French · chess</small></div><button class="btn" data-act="go" data-to="learn">Open</button></div></div>
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
    <button class="card nextcard gcont" data-act="go-seasons"><span><b>Season: ${esc(C.seasonAt(ds).n)}</b><small>Change your phase of life, habits and goals</small></span><span class="go">▶</span></button>
    <div class="card"><h3>Sync (phone ⇄ laptop)</h3><p class="small muted">Your data syncs through a <b>private</b> GitHub repo using a token that stays on this device. Status: <b>${Sync.status}</b>${Sync.last ? ' · last ' + new Date(Sync.last).toLocaleTimeString('en-IN') : ''} ${Sync.err ? '· ' + esc(Sync.err) : ''}</p>
      <div class="form"><input id="sOwner" placeholder="GitHub username" value="${esc(cfg.owner || '')}"><input id="sRepo" placeholder="data repo (e.g. vikram-data)" value="${esc(cfg.repo || 'vikram-data')}"><input id="sToken" type="password" placeholder="fine-grained token (contents: read/write)" value="${esc(cfg.token || '')}"></div>
      <div class="row"><button class="btn" data-act="syncsave">Save & sync now</button><button class="btn ghost" data-act="syncoff">Disconnect</button></div></div>
    ${acctSettings()}
    <div class="card"><h3>Notifications</h3><p class="small muted">Permission: <b>${perm}</b>. Push needs the installed app (https). Exact-time alarms come from the calendar file below.</p>
      <div class="row"><button class="btn" data-act="push">Enable push on this device</button><button class="btn ghost" data-act="pushtest">Test notification</button></div></div>
    <div class="card"><h3>Calendar alarms</h3><p class="small muted">Downloads a calendar file with every block of your next 62 days (each with an alert at its start time). Import it into Google Calendar: it rings on phone and laptop at the exact time. Re-download monthly.</p><button class="btn" data-act="ics">Download vikram-alarms.ics</button></div>
    <div class="card"><h3>Today's schedule type</h3><select id="dtSel">${Object.entries(C.SCHEDULES).filter(([k]) => C.seasonAt(ds).types.includes(k) || k === dt).map(([k, s]) => `<option value="${k}" ${k === dt ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select><p class="small muted">Change it for today (exam day, travel, holiday class-off).</p></div>
    <div class="card"><h3>Edit block times</h3><select id="edSel">${Object.entries(C.SCHEDULES).filter(([k]) => C.seasonAt(ds).types.includes(k)).map(([k, s]) => `<option value="${k}">${esc(s.name)}</option>`).join('')}</select><div id="edBox"></div></div>
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
      $$('[data-pl]').forEach(cb => cb.onchange = () => { const p = day(ds).pledge; p.items[+cb.dataset.pl].done = cb.checked; p.ts = ts(); save(); if (cb.checked) burst(cb); render(); });
      const m = $('[data-act=minimum]'); if (m) m.onchange = () => { day(ds).minimum = { v: m.checked, ts: ts() }; save(); render(); };
    },
    prep() { const ds = nowIST().date; $$('[data-task]').forEach(cb => cb.onchange = () => { S.tasks[cb.dataset.task] = { done: cb.checked, ts: ts() }; save(); render(); }); },
    feed() { if (feedPuz && $('#feedBoard')) { const p = feedPuz; Board.puzzle($('#feedBoard'), p, ok => { S.chess.puz = S.chess.puz || {}; S.chess.puz[p.id] = { ok, d: nowIST().date, ts: ts() }; save(); }); $('#kH').onclick = () => Board.hint(); $('#kS').onclick = () => Board.solve(); } },
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
    if (EXT.acts[act]) return EXT.acts[act](a, e);
    if (act === 'go-seasons') return go('seasons');
    if (act === 'urge') { const d = day(ds); d.urges = { n: ((d.urges && d.urges.n) || 0) + 1, ts: ts() }; save(); go('feed'); Story.open(Story.pick()); toast('Urge noticed. A story instead.'); }
    if (act === 's-open') Story.open(a.dataset.id);
    if (act === 'feednext' || act === 'feedprev') { feedGen = null; LS.set('vikram_feed_n', Math.max(0, LS.get('vikram_feed_n', 0) + (act === 'feednext' ? 1 : -1))); feedIdx = (feedIdx + (act === 'feednext' ? 1 : feedMap().length - 1)) % feedMap().length; LS.set('vikram_feed_idx', feedIdx); if (act === 'feednext') { const d = day(ds); d.cards = { n: ((d.cards && d.cards.n) || 0) + 1, ts: ts() }; save(); } render(); }
    if (act === 'feedopt' && feedGen) { const i = +a.dataset.i; $$('.opt').forEach((b, j) => { b.disabled = true; if (j === feedGen.a) b.classList.add('right'); else if (j === i) b.classList.add('wrong'); }); $('#ans').classList.remove('hide'); if (navigator.vibrate) navigator.vibrate(i === feedGen.a ? 15 : [30, 40, 30]); }
    if (act === 'go') { if (a.dataset.k) LTAB = a.dataset.k; go(a.dataset.to); }
    if (['focus', 'pledge', 'pledge1', 'pledge-edit', 'r-wk', 'r-save', 'r-paid', 'r-copy', 'r-send', 'a-save'].includes(act)) Acct.act(act, a);
    if (act === 'w-set') Wd.open(a.dataset.id);
    if (act === 'w-say') speakEn(a.dataset.t);
    if (act && act.startsWith('o-')) Out.act(act, a);
    if (act && act.startsWith('l-')) Learn.act(act, a);
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
    pool() { return VK_CARDS.concat(Fr.cards(), Wd.cards()); },
    due(ds) { const P = this.pool(); const seen = P.filter(c => S.srs[c.id]); const due = seen.filter(c => S.srs[c.id].due <= ds); const fresh = P.filter(c => !S.srs[c.id]);
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

  // ================= learn: history library, French, chess =================
  let LTAB = 'history';
  const LIBDATA = {}, LIBWAIT = {};
  window.VK_LIB_LOAD = (id, d) => { LIBDATA[id] = d; (LIBWAIT[id] || []).forEach(f => f(true)); delete LIBWAIT[id]; };
  function loadLib(id, cb) {
    if (LIBDATA[id]) return cb(true);
    if (LIBWAIT[id]) return LIBWAIT[id].push(cb);
    LIBWAIT[id] = [cb]; const s = document.createElement('script'); s.src = 'library/' + id + '.js';
    s.onerror = () => { (LIBWAIT[id] || []).forEach(f => f(false)); delete LIBWAIT[id]; s.remove(); };
    document.head.appendChild(s);
  }
  const LIB = typeof VK_LIBRARY !== 'undefined' ? VK_LIBRARY : { SHELVES: [], TEXTS: [] };
  const libPath = () => { const out = []; LIB.TEXTS.forEach(t => t.r.forEach((r, i) => out.push([t, i]))); return out; };
  const libDone = (id, i) => !!(S.lib[id + ':' + i] && S.lib[id + ':' + i].v);
  const mins = w => Math.max(3, Math.round(w / 140));
  function viewLearn() {
    const sub = ['history', 'words', 'french', 'chess'].map(k => `<button class="chip ${LTAB === k ? 'on' : ''}" data-act="l-tab" data-k="${k}">${{ history: 'History', words: 'English words', french: 'Français', chess: 'Chess' }[k]}</button>`).join('');
    return `<section class="hero small"><div class="eyebrow">Learn · the evening slot</div><h1>${{ history: 'History, from the originals', words: 'English vocabulary', french: 'French from zero', chess: 'Chess from zero' }[LTAB]}</h1><div class="meta">${Learn.pills()}</div></section><div class="chips">${sub}</div>${LTAB === 'words' ? Wd.tab() : Learn[LTAB]()}${EXT.learnExtra ? EXT.learnExtra(LTAB) : ''}${resBlock({ history: 'hist', words: 'words', french: 'fr', chess: 'chess' }[LTAB])}`;
  }
  const Learn = {
    pills() {
      const P = libPath(), done = P.filter(([t, i]) => libDone(t.id, i)).length;
      const fr = VK_FRENCH.UNITS.filter(u => S.fr[u.id] && S.fr[u.id].done).length;
      const ch = VK_CHESS.LESSONS.filter(l => S.chess.les && S.chess.les[l.id] && S.chess.les[l.id].v).length;
      const pz = Object.values(S.chess.puz || {}).filter(x => x.ok).length;
      const wd = VK_WORDS.SETS.filter(x => S.wd[x.id] && S.wd[x.id].done).length;
      return `<span class="pill"><span class="dot"></span>${done}/${P.length} readings</span><span class="pill">${wd * 10} words</span><span class="pill">${fr}/${VK_FRENCH.UNITS.length} French units</span><span class="pill">${ch}/${VK_CHESS.LESSONS.length} chess lessons · ${pz} puzzles solved</span>`;
    },
    next() { return libPath().find(([t, i]) => !libDone(t.id, i)); },
    today(ds) {
      const wd = new Date(ds + 'T00:00:00Z').getUTCDay(), b = [], d = day(ds);
      const hs = (C.HABITS.find(h => h.id === 'history') || {}).start || '2027-01-01';
      if (ds >= hs && this.next()) b.push(`<button class="btn ${isOn(d, 'history') ? 'ghost' : ''}" data-act="l-today" data-k="history">History 15 min${isOn(d, 'history') ? ' ✓' : ''}</button>`);
      if (ds >= VK_WORDS.START) { const nxw = VK_WORDS.SETS.find(x => !(S.wd[x.id] && S.wd[x.id].done)); b.push(`<button class="btn ghost" data-act="${nxw ? 'w-set' : 'go'}" data-id="${nxw ? nxw.id : ''}" data-to="learn" data-k="words">Words</button>`); }
      if (ds >= VK_FRENCH.START && [1, 3, 5].includes(wd)) b.push(`<button class="btn ghost" data-act="l-today" data-k="french">Français</button>`);
      if (ds >= VK_CHESS.START && [2, 4, 6].includes(wd)) b.push(`<button class="btn ghost" data-act="l-today" data-k="chess">Chess</button>`);
      return b.length ? `<div class="drills">${b.join('')}</div>` : '';
    },
    history() {
      const nx = this.next();
      return `<h3 class="h">Stories</h3>${Story.shelf()}<h3 class="h">The originals</h3>${nx ? `<div class="card nextcard"><div class="eyebrow">Continue · about ${mins(nx[0].r[nx[1]][1])} min</div><h3>${esc(nx[0].author)}: ${esc(nx[0].r[nx[1]][0])}</h3><small class="muted">${esc(nx[0].title)} · ${esc(nx[0].era)}</small><div class="row"><button class="btn" data-act="l-read" data-id="${nx[0].id}" data-i="${nx[1]}">Read now</button></div></div>` : '<div class="card"><h3>Library finished ✓</h3><p class="small muted">Re-read your favourites, or pick a full book from the Life → Books list.</p></div>'}
        ${LIB.SHELVES.map(([k, name]) => `<h3 class="h">${esc(name)}</h3><div class="card list">${LIB.TEXTS.filter(t => t.shelf === k).map(t => `<details class="libt"><summary><b>${esc(t.author)}</b> · ${esc(t.title)} <small class="muted">${esc(t.era)} · ${t.r.filter((r, i) => libDone(t.id, i)).length}/${t.r.length}</small></summary><p class="small">${esc(t.intro)}</p>${t.r.map((r, i) => `<button class="rd ${libDone(t.id, i) ? 'done' : ''}" data-act="l-read" data-id="${t.id}" data-i="${i}"><span>${libDone(t.id, i) ? '✓' : i + 1}</span>${esc(r[0])} <small class="muted">${mins(r[1])} min</small></button>`).join('')}<p class="small muted">Translation: ${esc(t.tr)} · public domain · <a href="${esc(t.src)}" target="_blank" rel="noopener">source</a></p></details>`).join('')}</div>`).join('')}
        <div class="row"><button class="btn ghost" data-act="l-dlall">Save all texts for offline</button></div>
        <p class="small muted">Readings are extracts chosen for a 15-minute evening slot. Old translations use old spellings; read for the argument, not every name.</p>`;
    },
    french() {
      const U = VK_FRENCH.UNITS, nx = U.find(u => !(S.fr[u.id] && S.fr[u.id].done));
      return `${nx ? `<div class="card nextcard"><div class="eyebrow">Next unit · 15 min</div><h3>${esc(nx.t)}</h3><div class="row"><button class="btn" data-act="l-fr" data-id="${nx.id}">Start</button></div></div>` : '<div class="card"><h3>A1 course complete ✓</h3><p class="small muted">Keep the words alive with daily flashcards, and listen to a slow-news podcast in French.</p></div>'}
        <div class="card list">${U.map((u, i) => { const st = S.fr[u.id]; return `<button class="rd ${st && st.done ? 'done' : ''}" data-act="l-fr" data-id="${u.id}"><span>${st && st.done ? '✓' : i + 1}</span>${esc(u.t)} <small class="muted">${u.w.length} phrases${st && st.best != null ? ' · best ' + st.best + '/8' : ''}</small></button>`; }).join('')}</div>
        <p class="small muted">Tap 🔊 to hear each phrase (uses your phone's French voice). Passing a unit's quiz (6/8) adds its phrases to your daily flashcards.</p>`;
    },
    chess() {
      const L = VK_CHESS.LESSONS, les = S.chess.les || {}, nx = L.find(l => !(les[l.id] && les[l.id].v));
      const daily = Chess.daily(nowIST().date), solvedToday = daily.filter(p => S.chess.puz && S.chess.puz[p.id] && S.chess.puz[p.id].d === nowIST().date).length;
      return `${nx ? `<div class="card nextcard"><div class="eyebrow">Next lesson</div><h3>${esc(nx.t)}</h3><div class="row"><button class="btn" data-act="l-chess" data-id="${nx.id}">Start</button></div></div>` : ''}
        <div class="card"><div class="row-between"><div><h3>Daily puzzles</h3><small class="muted">${solvedToday}/${daily.length} done today · easy to harder</small></div><button class="btn" data-act="l-puz">Solve</button></div></div>
        <div class="card list">${L.map((l, i) => `<button class="rd ${les[l.id] && les[l.id].v ? 'done' : ''}" data-act="l-chess" data-id="${l.id}"><span>${les[l.id] && les[l.id].v ? '✓' : i + 1}</span>${esc(l.t)}</button>`).join('')}</div>
        <p class="small muted">Puzzles are real positions from the Lichess puzzle database (free, CC0). Play games for free at lichess.org.</p>`;
    },
    act(act, a) {
      if (act === 'l-tab') { LTAB = a.dataset.k; render(); }
      if (act === 'l-say') speak(a.dataset.t);
      if (act === 'l-today') { const k = a.dataset.k;
        if (k === 'history') { const nx = this.next(); if (nx) Reader.open(nx[0].id, nx[1]); }
        if (k === 'french') { const u = VK_FRENCH.UNITS.find(x => !(S.fr[x.id] && S.fr[x.id].done)); if (u) Fr.open(u.id); else { LTAB = 'french'; go('learn'); } }
        if (k === 'chess') { const l = VK_CHESS.LESSONS.find(x => !(S.chess.les && S.chess.les[x.id] && S.chess.les[x.id].v)); if (l) Chess.lesson(l.id); else Chess.run(Chess.daily(nowIST().date), 'Daily puzzles'); } }
      if (act === 'l-read') Reader.open(a.dataset.id, +a.dataset.i);
      if (act === 'l-fr') Fr.open(a.dataset.id);
      if (act === 'l-chess') Chess.lesson(a.dataset.id);
      if (act === 'l-puz') Chess.run(Chess.daily(nowIST().date), 'Daily puzzles');
      if (act === 'l-dlall') { let n = 0; LIB.TEXTS.forEach(t => loadLib(t.id, ok => { n += ok ? 1 : 0; if (n === LIB.TEXTS.length) toast('All ' + n + ' texts saved for offline'); })); setTimeout(() => { if (n < LIB.TEXTS.length) toast(n + '/' + LIB.TEXTS.length + ' saved; try again online'); }, 8000); }
    }
  };
  const ov = html => { const o = $('#overlay'); o.innerHTML = html; o.classList.add('show'); o.scrollTop = 0; return o; };
  const ovClose = () => { $('#overlay').classList.remove('show'); $('#overlay').classList.remove('full'); try { speechSynthesis.cancel(); } catch (e) { } render(); };
  const tickHabit = id => { const ds = nowIST().date; const d = day(ds); if (!isOn(d, id)) { d.items[id] = { v: true, ts: ts() }; } };
  const Reader = {
    open(id, i) {
      const t = LIB.TEXTS.find(x => x.id === id); if (!t) return;
      ov(`<div class="quizbox reader"><p class="muted">Opening ${esc(t.title)}…</p></div>`); $('#overlay').classList.add('full');
      loadLib(id, ok => { if (!ok) { ov(`<div class="quizbox reader"><p>This text isn't saved on this device yet. Open it once while online (or use "Save all texts for offline").</p><button class="btn" id="rX">Close</button></div>`); $('#rX').onclick = ovClose; return; } this.show(t, i); });
    },
    show(t, i) {
      const R = LIBDATA[t.id][i], key = t.id + ':' + i, rec = S.lib[key] || {}, fs = LS.get('vikram_fs', 18), first = !Object.keys(S.lib).some(k => k.startsWith(t.id + ':'));
      const body = R.p.map(p => p.startsWith('## ') ? `<h4>${esc(p.slice(3))}</h4>` : `<p${t.verse ? ' class="verse"' : ''}>${esc(p)}</p>`).join('');
      ov(`<div class="quizbox reader" style="--fs:${fs}px"><div class="rtop"><button class="btn sm ghost" id="rX">✕</button><span class="eyebrow">${esc(t.author)} · ${i + 1}/${t.r.length}</span><span><button class="btn sm ghost" id="rS">A−</button><button class="btn sm ghost" id="rL">A+</button></span></div>
        <h2>${esc(R.t)}</h2><p class="small muted">${esc(t.title)} · ${esc(t.era)} · tr. ${esc(t.tr)} · about ${mins(t.r[i][1])} min</p>
        <details class="card" ${first || i === 0 ? 'open' : ''}><summary><b>Context</b></summary><p class="small">${esc(t.intro)}</p></details>
        <div class="rbody">${body}</div>
        <div class="card"><h3>Go further</h3><p class="small muted">The full story is bigger than this extract. Read around it:</p><div class="links">${(t.links || []).map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(n)} · Wikipedia ↗</a>`).join('')}<a href="${esc(t.src)}" target="_blank" rel="noopener">The full original text ↗</a></div></div>
        <div class="card"><h3>Think about</h3><ol class="small">${t.read_for.map(q => `<li>${esc(q)}</li>`).join('')}</ol><textarea id="rNote" rows="3" placeholder="One line worth remembering, in your own words">${esc(rec.note || '')}</textarea>
        <div class="row"><button class="btn" id="rDone">${rec.v ? 'Save note' : 'Done ✓'}</button>${i + 1 < t.r.length ? '<button class="btn ghost" id="rNext">Next part →</button>' : ''}</div></div></div>`);
      $('#rX').onclick = ovClose;
      const setFs = d => { const v = Math.min(24, Math.max(14, fs + d)); LS.set('vikram_fs', v); this.show(t, i); };
      $('#rS').onclick = () => setFs(-1); $('#rL').onclick = () => setFs(1);
      const mark = () => { S.lib[key] = { v: true, d: nowIST().date, note: $('#rNote').value.trim(), ts: ts() }; tickHabit('history'); save(); };
      $('#rDone').onclick = () => { const was = rec.v; mark(); toast(was ? 'Note saved' : 'Reading done · history ticked for today'); if (!was) ovClose(); };
      if ($('#rNext')) $('#rNext').onclick = () => { mark(); this.show(t, i + 1); };
    }
  };
  // ---- French ----
  function speak(text) {
    try { const ss = window.speechSynthesis; if (!ss) throw 0; ss.cancel(); const u = new SpeechSynthesisUtterance(text.replace(/ \/ /g, ', ')); u.lang = 'fr-FR'; u.rate = 0.85;
      const v = ss.getVoices().find(x => /^fr/i.test(x.lang)); if (v) u.voice = v; else if (ss.getVoices().length) toast('No French voice found: add one in your phone\'s text-to-speech settings');
      ss.speak(u); } catch (e) { toast('Audio not supported in this browser'); }
  }
  const Fr = {
    cards() { const out = []; VK_FRENCH.UNITS.forEach(u => { if (S.fr[u.id] && S.fr[u.id].done) u.w.forEach((w, i) => out.push({ id: 'fr-' + u.id + '-' + i, deck: 'français', f: w[0], b: w[1] + '  ·  ' + w[2] })); }); return out; },
    open(id) {
      const u = VK_FRENCH.UNITS.find(x => x.id === id);
      ov(`<div class="quizbox"><div class="row-between"><span class="eyebrow">Français · ${esc(u.t)}</span><button class="btn sm ghost" id="fX">✕</button></div>
        <div class="memory small">${esc(u.tip)}</div>
        <div class="list">${u.w.map((w, i) => `<div class="frw"><button class="btn sm ghost" data-say="${i}" aria-label="Listen">🔊</button><div><b>${esc(w[0])}</b><small>${esc(w[1])}</small><small class="muted">${esc(w[2])}</small></div></div>`).join('')}</div>
        <p class="small muted">Say each one out loud twice. Cover the English and test yourself, then take the quiz.</p>
        <div class="row"><button class="btn" id="fQ">Take the quiz (8 questions)</button><button class="btn ghost" id="fAll">🔊 Play all</button></div></div>`);
      $('#fX').onclick = ovClose;
      $$('[data-say]').forEach(b => b.onclick = () => speak(u.w[+b.dataset.say][0]));
      $('#fAll').onclick = () => { let k = 0; const nxt = () => { if (k >= u.w.length) return; const t = u.w[k++][0]; try { const ss = speechSynthesis; const ut = new SpeechSynthesisUtterance(t); ut.lang = 'fr-FR'; ut.rate = 0.85; const v = ss.getVoices().find(x => /^fr/i.test(x.lang)); if (v) ut.voice = v; ut.onend = () => setTimeout(nxt, 700); ss.speak(ut); } catch (e) { } }; try { speechSynthesis.cancel(); } catch (e) { } nxt(); };
      $('#fQ').onclick = () => this.quiz(u);
    },
    quiz(u) {
      const idx = VK_FRENCH.UNITS.indexOf(u), near = VK_FRENCH.UNITS.slice(Math.max(0, idx - 2), idx + 1).flatMap(x => x.w);
      const pick = [...u.w].sort(() => Math.random() - 0.5).slice(0, 8);
      const qs = pick.map((w, k) => { const dir = k % 2; const pool = (u.w.length >= 4 ? u.w : near).filter(x => x !== w); const ds2 = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
        const opts = [w, ...ds2].sort(() => Math.random() - 0.5); return { q: dir ? w[1] : w[0], say: dir ? null : w[0], opts: opts.map(o => dir ? o[0] : o[1]), a: opts.indexOf(w), dir }; });
      let n = 0, sc = 0;
      const show = () => {
        if (n >= qs.length) { const st = Object.assign({}, S.fr[u.id] || {}), pass = sc >= 6; st.best = Math.max(st.best || 0, sc); if (pass && !st.done) { st.done = true; st.d = nowIST().date; } st.ts = ts(); S.fr[u.id] = st; if (pass) tickHabit('hobby'); save();
          ov(`<div class="quizbox center"><h2 class="qq">${sc}/8 ${pass ? '✓' : ''}</h2><p>${pass ? 'Unit passed. Its phrases are now in your daily flashcards.' : 'Need 6/8 to pass. Listen once more and retry.'}</p><div class="row" style="justify-content:center"><button class="btn" id="fB">Back to unit</button><button class="btn ghost" id="fC">Close</button></div></div>`);
          $('#fB').onclick = () => this.open(u.id); $('#fC').onclick = ovClose; return; }
        const q = qs[n];
        ov(`<div class="quizbox"><div class="row-between"><span class="eyebrow">Quiz · ${n + 1}/8 · ${sc} right</span><button class="btn sm ghost" id="fX">✕</button></div><p class="small muted">${q.dir ? 'Pick the French' : 'What does it mean?'}</p><h2 class="qq">${esc(q.q)} ${q.say ? '<button class="btn sm ghost" id="fS">🔊</button>' : ''}</h2>
          <div class="opts">${q.opts.map((o, i) => `<button class="opt" data-o="${i}">${esc(o)}</button>`).join('')}</div></div>`);
        $('#fX').onclick = ovClose; if (q.say) { $('#fS').onclick = () => speak(q.say); }
        $$('[data-o]').forEach(b => b.onclick = () => { const i = +b.dataset.o; $$('[data-o]').forEach(x => x.disabled = true); b.classList.add(i === q.a ? 'right' : 'wrong'); $$('[data-o]')[q.a].classList.add('right'); if (i === q.a) sc++; if (q.dir) speak(q.opts[q.a]); setTimeout(() => { n++; show(); }, i === q.a ? 650 : 1400); });
      };
      show();
    }
  };
  // ---- Chess ----
  const GL = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const sqName = i => 'abcdefgh'[i % 8] + (Math.floor(i / 8) + 1), sqIdx = s => (s.charCodeAt(0) - 97) + (+s[1] - 1) * 8;
  function fenParse(fen) { const [rows, side] = fen.split(' '); const b = Array(64).fill(null); rows.split('/').forEach((row, ri) => { let f = 0; for (const ch of row) { if (/\d/.test(ch)) f += +ch; else { b[(7 - ri) * 8 + f] = ch; f++; } } }); return { b, side }; }
  function applyUci(pos, u) { const b = pos.b.slice(), f = sqIdx(u.slice(0, 2)), t = sqIdx(u.slice(2, 4)), pc = b[f], white = pc === pc.toUpperCase();
    if (pc.toLowerCase() === 'k' && Math.abs((f % 8) - (t % 8)) === 2) { const rank = Math.floor(f / 8) * 8; if (t % 8 === 6) { b[rank + 5] = b[rank + 7]; b[rank + 7] = null; } else { b[rank + 3] = b[rank]; b[rank] = null; } }
    if (pc.toLowerCase() === 'p' && (f % 8) !== (t % 8) && !b[t]) b[t + (white ? -8 : 8)] = null;
    b[t] = u[4] ? (white ? u[4].toUpperCase() : u[4]) : pc; b[f] = null; return { b, side: white ? 'b' : 'w' }; }
  const Chess = {
    daily(ds) { const pool = VK_PUZZLES.mixed, puz = S.chess.puz || {}; const fresh = pool.filter(p => !puz[p.id] || puz[p.id].d === ds); return fresh.slice(0, 10); },
    lesson(id) {
      const L = VK_CHESS.LESSONS.find(x => x.id === id), done = S.chess.les && S.chess.les[id] && S.chess.les[id].v;
      const P = L.p === 'coords' ? null : (L.p === 'mixed' ? Chess.daily(nowIST().date) : VK_PUZZLES[L.p] || []);
      ov(`<div class="quizbox"><div class="row-between"><span class="eyebrow">Chess · lesson ${VK_CHESS.LESSONS.indexOf(L) + 1}</span><button class="btn sm ghost" id="kX">✕</button></div><h2>${esc(L.t)}</h2>
        <div class="rbody small">${L.body.map(p => p.startsWith('## ') ? `<h4>${esc(p.slice(3))}</h4>` : `<p>${esc(p)}</p>`).join('')}</div>
        <div class="row"><button class="btn" id="kGo">${P ? `Solve ${P.length} puzzles` : 'Square-naming drill (30 s)'}</button><button class="btn ghost" id="kDone">${done ? 'Done ✓' : 'Mark lesson done'}</button></div></div>`);
      $('#kX').onclick = ovClose;
      const mark = () => { S.chess.les = S.chess.les || {}; S.chess.les[id] = { v: true, d: nowIST().date, ts: ts() }; tickHabit('hobby'); save(); };
      $('#kDone').onclick = () => { mark(); toast('Lesson done'); ovClose(); };
      $('#kGo').onclick = () => P ? this.run(P, L.t, () => mark()) : this.coords(() => mark());
    },
    run(list, title, onFinish) {
      let k = 0, solved = 0;
      const next = () => {
        if (k >= list.length) { if (onFinish) onFinish(); tickHabit('hobby'); save(); ov(`<div class="quizbox center"><h2 class="qq">${solved}/${list.length} solved first try</h2><p class="muted">Every miss is a pattern you'll recognise next time.</p><button class="btn" id="kC">Close</button></div>`); $('#kC').onclick = ovClose; return; }
        const p = list[k];
        ov(`<div class="quizbox chessbox"><div class="row-between"><span class="eyebrow">${esc(title)} · ${k + 1}/${list.length}</span><button class="btn sm ghost" id="kX">✕</button></div><p id="kMsg" class="kmsg">Watch the opponent's move…</p><div id="kB"></div>
          <div class="row"><button class="btn sm ghost" id="kH">Hint</button><button class="btn sm ghost" id="kS">Show solution</button><button class="btn sm" id="kN" disabled>Next →</button></div><p class="small muted">Rated ${p.r} on Lichess${p.th.length ? ' · ' + p.th.slice(0, 3).join(', ') : ''}</p></div>`);
        $('#kX').onclick = ovClose;
        Board.puzzle($('#kB'), p, ok => { if (ok) solved++; S.chess.puz = S.chess.puz || {}; S.chess.puz[p.id] = { ok, d: nowIST().date, ts: ts() }; save(); $('#kN').disabled = false; });
        $('#kN').onclick = () => { k++; next(); };
        $('#kH').onclick = () => Board.hint(); $('#kS').onclick = () => Board.solve();
      };
      next();
    },
    coords(onFinish) {
      ov(`<div class="quizbox chessbox"><div class="row-between"><span class="eyebrow">Square drill · 30 seconds</span><button class="btn sm ghost" id="kX">✕</button></div><h2 class="qq" id="cT">Ready?</h2><div id="kB"></div><div class="row"><button class="btn" id="cGo">Start</button><span class="small muted" id="cS"></span></div></div>`);
      $('#kX').onclick = ovClose;
      const best = (S.chess.best && S.chess.best.coords && S.chess.best.coords.v) || 0; $('#cS').textContent = 'Best: ' + best;
      Board.draw($('#kB'), fenParse('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w'), 'w', null);
      $('#cGo').onclick = () => { let sc = 0, target = Math.floor(Math.random() * 64), end = Date.now() + 30000; $('#cT').textContent = 'Tap ' + sqName(target);
        const tm = setInterval(() => { const left = Math.ceil((end - Date.now()) / 1000); $('#cS').textContent = left + ' s · ' + sc + ' right'; if (left <= 0) { clearInterval(tm); Board.onTap = null; const nb = Math.max(best, sc); S.chess.best = S.chess.best || {}; S.chess.best.coords = { v: nb, ts: ts() }; save(); if (onFinish && sc >= 10) onFinish(); $('#cT').textContent = sc + ' squares' + (sc > best ? ' · new best!' : ''); $('#cGo').textContent = 'Again'; } }, 250);
        Board.onTap = i => { if (i === target) { sc++; target = Math.floor(Math.random() * 64); $('#cT').textContent = 'Tap ' + sqName(target); } else if (navigator.vibrate) navigator.vibrate(40); }; };
    }
  };
  const Board = {
    onTap: null,
    draw(el, pos, orient, hl, sel) {
      this.el = el; const order = []; for (let r = 7; r >= 0; r--) for (let f = 0; f < 8; f++) order.push(r * 8 + f); if (orient === 'b') order.reverse();
      el.innerHTML = `<div class="board">${order.map(i => { const pc = pos.b[i], light = ((i % 8) + Math.floor(i / 8)) % 2 === 1;
        return `<div class="sq ${light ? 'l' : 'd'} ${hl && hl.includes(i) ? 'hl' : ''} ${sel === i ? 'sel' : ''}" data-sq="${i}">${pc ? `<span class="pc ${pc === pc.toUpperCase() ? 'pw' : 'pb'}">${GL[pc.toLowerCase()]}︎</span>` : ''}</div>`; }).join('')}</div>`;
      el.querySelectorAll('.sq').forEach(s => s.onclick = () => this.onTap && this.onTap(+s.dataset.sq));
    },
    puzzle(el, p, done) {
      const ms = p.m.split(' '); let pos = fenParse(p.fen), step = 0, sel = null, hl = null, clean = true, over = false;
      const me = pos.side === 'w' ? 'b' : 'w', mine = pc => pc && (me === 'w' ? pc === pc.toUpperCase() : pc === pc.toLowerCase());
      const draw = () => this.draw(el, pos, me, hl, sel);
      const msg = t => { const m = $('#kMsg'); if (m) m.innerHTML = t; };
      const play = u => { hl = [sqIdx(u.slice(0, 2)), sqIdx(u.slice(2, 4))]; pos = applyUci(pos, u); step++; sel = null; draw(); };
      const finish = ok => { over = true; this.onTap = null; msg(ok ? '<b>Solved ✓</b>' : 'Solution shown. Try to see why it works.'); done(ok); };
      const oppMove = () => setTimeout(() => { play(ms[step]); if (step >= ms.length) finish(clean); else msg(`<b>${me === 'w' ? 'White' : 'Black'} to move.</b> Find the best move.`); }, 550);
      draw(); oppMove();
      this.hint = () => { if (over || step % 2 === 0) return; clean = false; sel = sqIdx(ms[step].slice(0, 2)); draw(); msg('Hint: move the highlighted piece.'); };
      this.solve = () => { if (over) return; clean = false; const run = () => { if (step >= ms.length) return finish(false); play(ms[step]); setTimeout(run, 650); }; run(); };
      this.onTap = i => {
        if (over || step % 2 === 0) return;
        if (sel === null || mine(pos.b[i])) { if (mine(pos.b[i])) { sel = i; draw(); } return; }
        const u = sqName(sel) + sqName(i), want = ms[step], last = step === ms.length - 1;
        if (u === want.slice(0, 4) || (last && p.alt.some(x => x.slice(0, 4) === u))) {
          const mv = u === want.slice(0, 4) ? want : p.alt.find(x => x.slice(0, 4) === u);
          play(mv.length === 4 && pos.b[sel] && pos.b[sel].toLowerCase() === 'p' && /[18]$/.test(u) ? mv + 'q' : mv);
          if (step >= ms.length) finish(clean); else { msg('Good. Keep going…'); oppMove(); }
        } else { clean = false; sel = null; draw(); msg('Not that one. Try again.'); if (navigator.vibrate) navigator.vibrate(60); }
      };
    }
  };

  // ================= accountability: focus timer, evidence, pledge, weekly review =================
  const istOf = t => { const d = new Date(t + 330 * 60000); return { date: d.toISOString().slice(0, 10), mins: d.getUTCHours() * 60 + d.getUTCMinutes() }; };
  const focusOn = (ds, kind) => S.focus.filter(f => f.d === ds && (!kind || f.kind === kind));
  const focusMins = (ds, kind, before) => focusOn(ds, kind).filter(f => before == null || f.sm < before).reduce((a, f) => a + f.mins, 0);
  const tsDay = t => t ? istOf(t).date : '';
  const strict = () => !(S.settings.strict && S.settings.strict.v === false);
  // evidence rules: what counts as proof for each habit
  const VERIFY = {
    wake5: { how: 'Open VIKRAM by 5:30', test: (ds, mm) => { const f = S.days[ds] && S.days[ds].firstSeen; return !!f && f.v <= (mm ? 360 : 330); } },
    deep1: { how: 'Focus timer: 45 min before 13:00', act: 'focus', test: (ds, mm) => focusMins(ds, 'study', 780) >= (mm ? 25 : 45) },
    deep2: { how: 'Focus 90 min total, or one timed set', act: 'focus', test: (ds, mm) => focusMins(ds, 'study') >= (mm ? 25 : 90) || S.practice.some(p => p.d === ds && p.mode !== 'quick') },
    aptitude: { how: 'A math sprint or practice set', act: 'mathgo', test: ds => S.math.some(m => m.d === ds) || S.practice.some(p => p.d === ds) },
    meditate: { how: 'Meditation timer', act: 'focus', kind: 'meditate', test: (ds, mm) => focusMins(ds, 'meditate') >= (mm ? 3 : 10) },
    yoga: { how: 'Yoga timer', act: 'focus', kind: 'yoga', test: (ds, mm) => focusMins(ds, 'yoga') >= (mm ? 5 : 15) },
    reading: { how: 'Update pages, a library reading, or a reading timer', test: (ds, mm) => Object.values(S.books).some(b => tsDay(b.ts) === ds) || Object.values(S.lib).some(r => r.d === ds) || focusMins(ds, 'reading') >= (mm ? 5 : 10) },
    history: { how: 'A library reading, or 10 story cards', act: 'l-today', k: 'history', test: ds => Object.values(S.lib).some(r => r.d === ds) || ((S.days[ds] && S.days[ds].st && S.days[ds].st.n) || 0) >= 10 },
    hobby: { how: 'French unit, chess, vocab set or 100 words written', test: ds => Object.values(S.fr).some(r => r.d === ds) || Object.values(S.wd).some(r => r.d === ds) || Object.values((S.chess.les) || {}).some(r => r.d === ds) || Object.values((S.chess.puz) || {}).some(r => r.d === ds) || (((S.writing[ds] && S.writing[ds].text) || '').split(/\s+/).filter(Boolean).length >= 100) },
    journal: { how: 'Write one line in the journal', test: ds => ((S.days[ds] && S.days[ds].journal && S.days[ds].journal.text) || '').trim().length >= 15 },
    review: { how: 'Save the weekly review', act: 'go', to: 'review', test: ds => !!(S.reviews[weekKey(ds)] && S.reviews[weekKey(ds)].d === ds) }
  };
  function autoVerify(ds) {
    if (SIM && !qs.get('test')) return false; const d = day(ds), mm = minimumMode(ds); let ch = false;
    Object.entries(VERIFY).forEach(([id, r]) => { if (habitById[id] && habitById[id].start <= ds && r.test(ds, mm) && !(d.items[id] && d.items[id].v && d.items[id].src === 'auto')) { d.items[id] = { v: true, src: 'auto', ts: ts() }; ch = true; } });
    if (ch) save(); return ch;
  }
  const verified = (ds, id) => { const it = S.days[ds] && S.days[ds].items[id]; return !!(it && it.v && it.src === 'auto'); };
  function targetMins(ds) { const t = (S.settings.targets && S.settings.targets[dayType(ds)]) || { study: 240, class: 120, sunday: 60 }[dayType(ds)] || 120; return +t; }
  // ---- focus timer ----
  const FKINDS = { study: 'Study', reading: 'Reading', meditate: 'Meditation', yoga: 'Yoga', lab: 'Lab / project' };
  const FDEF = { study: 45, reading: 25, meditate: 15, yoga: 25, lab: 60 };
  // harsh, escalating notifications when you leave a focus session (messages in content.js, shared with the server)
  const Nag = {
    timers: [],
    lvl() { return Math.min(3, (S.nag && S.nag.lvl) || 0); },
    msg(l) { const L = C.NAG[Math.min(3, l)], k = ((S.nag && S.nag.k) || 0); S.nag = Object.assign({}, S.nag || {}, { k: k + 1, ts: ts() }); return L[k % L.length]; },
    send(l) { const body = this.msg(l), title = ['Focus. Now.', 'Hey. Back to work.', 'Seriously?', 'VIKRAM is disappointed'][Math.min(3, l)];
      const opt = { body, tag: 'vikram-nag', renotify: true, icon: 'icons/icon-192.png', vibrate: [300, 120, 300, 120, 300], requireInteraction: l >= 2, data: { url: './#today' } };
      try { if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return; if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(r => r.showNotification(title, opt)); else new Notification(title, opt); } catch (e) { } },
    away() { // app hidden during a session
      this.clear(); const base = this.lvl();
      [[12, 0], [60, 1], [180, 2], [420, 3]].forEach(([sec, up]) => this.timers.push(setTimeout(() => { const l = Math.min(3, base + up); S.nag = Object.assign({}, S.nag || {}, { lvl: Math.min(3, Math.max(this.lvl(), l + (up ? 0 : 0))), ts: ts() }); this.send(l); this.fired = l + 1; S.focusAway = { since: S.focusAway && S.focusAway.since, lvl: l, ts: ts() }; save(false); }, sec * 1000)));
      S.focusAway = { since: Date.now(), lvl: base, ts: ts() }; save(false); try { Sync.now(); } catch (e) { }
    },
    back(awayMs) {
      this.clear(); if (this.fired) { S.nag = Object.assign({}, S.nag || {}, { lvl: Math.min(3, this.lvl() + 1), ts: ts() }); } this.fired = 0;
      S.focusAway = { since: null, lvl: 0, ts: ts() }; save(false); try { Sync.now(); } catch (e) { }
      if (awayMs > 12000) toast(this.msg(this.lvl()));
    },
    calm() { if (this.lvl() > 0) S.nag = Object.assign({}, S.nag, { lvl: this.lvl() - 1, ts: ts() }); },
    clear() { this.timers.forEach(clearTimeout); this.timers = []; }
  };
  const Focus = {
    live() { return LS.get('vikram_focus_live', null); },
    defaults(kind) { const ds = nowIST().date, cur = currentBlock(blocksFor(ds), nowIST().mins), tk = tasksForToday(ds).find(t => !taskDone(t)); kind = kind || 'study';
      return { kind, mins: kind === 'study' && minimumMode(ds) ? 25 : FDEF[kind], label: kind === 'study' ? (tk ? (tk.m ? tk.m + ' · ' : '') + tk.t : (cur ? cur.t : 'Study')) : FKINDS[kind] }; },
    open(kind) { if (this.live()) return this.run(); this.start(kind); },
    start(kind) {
      const d = this.defaults(kind); LS.set('vikram_focus_live', Object.assign(d, { start: Date.now(), away: 0, hid: null }));
      try { if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission(); } catch (e) { }
      fab(); this.run();
    },
    set(k, v) { const L = this.live(); if (!L) return; L[k] = v; if (k === 'kind') { L.label = this.defaults(v).label; } LS.set('vikram_focus_live', L); fab(); this.run(); },
    run() {
      const l = this.live(); if (!l) return;
      ov(`<div class="quizbox center focusbox"><div class="row-between"><span class="eyebrow">${esc(FKINDS[l.kind])} · ${l.mins} min</span><button class="btn sm ghost" id="fBg">Hide</button></div>
        <h2 class="small">${esc(l.label)}</h2><div class="fring" id="fRing"><span id="fT">--:--</span></div>
        <div class="chips center">${[25, 45, 60, 90].map(m => `<button class="chip ${m === l.mins ? 'on' : ''}" data-fm="${m}">${m}m</button>`).join('')}</div>
        <div class="chips center">${Object.entries(FKINDS).map(([k, n]) => `<button class="chip ${k === l.kind ? 'on' : ''}" data-fk="${k}">${n}</button>`).join('')}</div>
        <p class="small muted">Leave VIKRAM and it will come after you. Time away doesn't count.</p><button class="btn ghost" id="fStop">Stop now</button></div>`);
      $('#fBg').onclick = () => { $('#overlay').classList.remove('show'); render(); };
      $('#fStop').onclick = () => this.finish(true);
      $$('[data-fm]').forEach(b => b.onclick = () => this.set('mins', +b.dataset.fm));
      $$('[data-fk]').forEach(b => b.onclick = () => this.set('kind', b.dataset.fk));
      clearInterval(this.tm);
      const tick = () => { const L = this.live(); if (!L) return clearInterval(this.tm); const el = (Date.now() - L.start) / 1000, left = Math.max(0, L.mins * 60 - el);
        const t = $('#fT'); if (t) { t.textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(Math.floor(left % 60)).padStart(2, '0'); $('#fRing').style.setProperty('--p', Math.round(100 * (1 - left / (L.mins * 60)))); }
        if (left <= 0) { clearInterval(this.tm); this.finish(false); } };
      tick(); this.tm = setInterval(tick, 1000);
    },
    vis(hidden) { const L = this.live(); if (!L) return; if (hidden) { L.hid = Date.now(); Nag.away(); } else if (L.hid) { const away = Date.now() - L.hid; if (away > 12000) L.away += away; L.hid = null; Nag.back(away); } LS.set('vikram_focus_live', L); },
    finish(early) {
      const L = this.live(); if (!L) return; clearInterval(this.tm); Nag.clear();
      const mins = Math.max(0, Math.min(L.mins, Math.round((Date.now() - L.start - (L.away || 0)) / 60000)));
      if (mins < 10) { LS.set('vikram_focus_live', null); fab(); toast(early ? 'Under 10 focused minutes: not logged. Try again.' : 'Too much time away: not logged'); ovClose(); return; }
      try { if (!early && typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification('VIKRAM · focus done', { body: mins + ' minutes. Good. Log it with one tap.', icon: 'icons/icon-192.png' }); } catch (e) { }
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      ov(`<div class="quizbox center"><span class="eyebrow">${mins} focused minutes · ${esc(FKINDS[L.kind])}</span><h2>How did it go?</h2>
        <div class="opts"><button class="opt" data-fr="done">✓ Did what I planned</button><button class="opt" data-fr="part">Partly</button><button class="opt" data-fr="dist">Got distracted</button></div>
        <input id="fNote" placeholder="Optional: what exactly? e.g. A2, 20 questions"></div>`);
      $$('[data-fr]').forEach(b => b.onclick = () => { const st = istOf(L.start); const note = $('#fNote').value.trim() || b.textContent;
        S.focus.push({ id: 'f' + L.start, d: st.date, sm: st.mins, mins, kind: L.kind, label: L.label, note, res: b.dataset.fr, away: Math.round((L.away || 0) / 60000), ts: ts() });
        if (!L.away && b.dataset.fr !== 'dist') Nag.calm();
        LS.set('vikram_focus_live', null); autoVerify(st.date); save(); fab(); toast(mins + ' verified minutes logged'); ovClose(); });
    }
  };
  document.addEventListener('visibilitychange', () => Focus.vis(document.visibilityState === 'hidden'));
  // floating focus button: one tap from opening VIKRAM to studying
  function fab() {
    let b = document.getElementById('fab'); if (!b) { b = document.createElement('button'); b.id = 'fab'; b.setAttribute('aria-label', 'Focus timer'); b.onclick = () => Focus.open(); document.body.appendChild(b); }
    const L = Focus.live(); clearInterval(fab.tm);
    const paint = () => { const l = Focus.live(); if (!l) { b.className = ''; b.innerHTML = '<span>▶</span><small>Focus</small>'; return; } const left = Math.max(0, l.mins * 60 - (Date.now() - l.start) / 1000);
      b.className = 'live'; b.style.setProperty('--p', Math.round(100 * (1 - left / (l.mins * 60)))); b.innerHTML = `<span>${Math.ceil(left / 60)}</span><small>min</small>`; if (left <= 0 && !$('#overlay').classList.contains('show')) Focus.finish(false); };
    paint(); if (L) fab.tm = setInterval(paint, 15000);
  }
  // ---- pledge ----
  function pledgeSuggest(ds) {
    const out = [], tk = tasksForToday(ds).filter(t => !taskDone(t));
    if (tk[0]) out.push((tk[0].m ? tk[0].m + ': ' : '') + tk[0].t);
    out.push(`${targetMins(ds)} verified focus minutes`);
    if (tk[1]) out.push((tk[1].m ? tk[1].m + ': ' : '') + tk[1].t); else out.push(Cards.due(ds).length ? 'Clear today\'s flashcards' : '10 story cards in the evening');
    return out.slice(0, 3);
  }
  function pledgeCard(ds, n) {
    const d = day(ds), p = d.pledge;
    if (!p) { const sg = pledgeSuggest(ds);
      return `<div class="card pledge"><div class="eyebrow">Today's pledge</div>${sg.map(t => `<div class="pl-s">${esc(t)}</div>`).join('')}<div class="row"><button class="btn" data-act="pledge1">✓ Commit</button><button class="btn sm ghost" data-act="pledge-edit">edit</button></div>
        <div id="plEdit" class="hide">${[0, 1, 2].map(i => `<input class="pin" data-pin="${i}" value="${esc(sg[i] || '')}">`).join('')}<button class="btn mt" data-act="pledge">Commit these</button></div></div>`; }
    const done = p.items.filter(x => x.done).length;
    return `<div class="card pledge"><div class="eyebrow">Pledge · ${done}/${p.items.length} kept · tap when done</div>
      ${p.items.map((x, i) => `<label class="item ${x.done ? 'done' : ''}"><input type="checkbox" data-pl="${i}" ${x.done ? 'checked' : ''}><span>${esc(x.t)}</span></label>`).join('')}</div>`;
  }
  // ---- weekly review ----
  const weekKey = ds => { const wd = (new Date(ds + 'T00:00:00Z').getUTCDay() + 6) % 7; return addDays(ds, -wd); };
  let RWEEK = null;
  function weekStats(wk) {
    const days = [...Array(7)].map((_, i) => addDays(wk, i)), today = nowIST().date, past = days.filter(x => x <= today && x >= '2026-12-01');
    const sc = days.map(x => x <= today && x >= '2026-12-01' ? score(x) : null), fm = days.map(x => focusMins(x));
    let pl = 0, pk = 0; past.forEach(x => { const p = S.days[x] && S.days[x].pledge; if (p) { pl += p.items.length; pk += p.items.filter(i => i.done).length; } });
    const pr = S.practice.filter(p => days.includes(p.d)), q = pr.reduce((a, p) => a + p.n, 0), ok = pr.reduce((a, p) => a + p.sc, 0);
    const cnt = (o, f) => Object.values(o).filter(f).length;
    const st = Object.assign({ thr: 60, allow: 2, amt: 0, to: '' }, S.settings.stake || {});
    const misses = past.filter(x => x < today && score(x) < st.thr).length;
    const habits = C.HABITS.filter(h => h.start <= (past[past.length - 1] || wk)).map(h => { const act = past.filter(x => x >= h.start && x < today && activeItems(x).includes(h.id)); const dn = act.filter(x => isOn(S.days[x] || { items: {} }, h.id)); return { h, n: act.length, k: dn.length, pct: act.length ? Math.round(100 * dn.length / act.length) : null }; }).filter(x => x.n);
    return { days, past, sc, fm, avg: past.length ? Math.round(past.reduce((a, x) => a + score(x), 0) / past.length) : 0, focus: fm.reduce((a, b) => a + b, 0), pl, pk, q, acc: q ? Math.round(100 * ok / q) : null,
      reads: cnt(S.lib, r => days.includes(r.d)), fr: cnt(S.fr, r => days.includes(r.d)), wd: cnt(S.wd, r => days.includes(r.d)), puz: cnt((S.chess.puz) || {}, r => r.ok && days.includes(r.d)), sent: S.sent.filter(x => days.includes(x.d)).length,
      urges: days.reduce((a, x) => a + ((S.days[x] && S.days[x].urges && S.days[x].urges.n) || 0), 0), misses, st, owe: st.amt && misses > st.allow ? st.amt : 0, habits };
  }
  function viewReview() {
    const ds = nowIST().date, wk = RWEEK || weekKey(ds), W = weekStats(wk), P = weekStats(addDays(wk, -7)), rv = S.reviews[wk] || {}, cfg = S.settings.partner || {};
    const delta = (a, b, u = '') => b == null || a == null ? '' : `<small class="${a >= b ? 'up' : 'down'}">${a >= b ? '▲' : '▼'} ${Math.abs(a - b)}${u} vs last week</small>`;
    const maxF = Math.max(60, ...W.fm), tgt = targetMins(ds);
    const chart = `<svg viewBox="0 0 350 170" class="wchart" role="img" aria-label="Daily score and focus minutes">${W.days.map((x, i) => { const sc = W.sc[i], h = sc == null ? 0 : sc * 1.2, fh = W.fm[i] / maxF * 120, X = 14 + i * 48;
      return `<rect x="${X}" y="${140 - h}" width="18" height="${h}" rx="3" class="bs"><title>${fmtD(x)} score ${sc == null ? '–' : sc}</title></rect><rect x="${X + 20}" y="${140 - fh}" width="10" height="${fh}" rx="3" class="bf"><title>${W.fm[i]} focus min</title></rect><text x="${X + 15}" y="158" text-anchor="middle">${'MTWTFSS'[i]}</text>`; }).join('')}
      <line x1="8" x2="344" y1="${140 - Math.min(120, tgt / maxF * 120)}" y2="${140 - Math.min(120, tgt / maxF * 120)}" class="tl"/><text x="344" y="${136 - Math.min(120, tgt / maxF * 120)}" text-anchor="end" class="tt">focus target ${tgt}m</text></svg>`;
    const worst = [...W.habits].filter(x => x.pct != null).sort((a, b) => a.pct - b.pct).slice(0, 2);
    return `<section class="hero small"><div class="eyebrow">Weekly review · ${fmtD(wk)} – ${fmtD(addDays(wk, 6))}</div><h1>The honest numbers</h1><div class="meta"><button class="pill" data-act="r-wk" data-d="-7">← prev</button><button class="pill" data-act="r-wk" data-d="7">next →</button></div></section>
      <div class="kpis">
        <div class="kpi"><b>${W.avg}</b><span>avg score</span>${delta(W.avg, P.avg)}</div>
        <div class="kpi"><b>${(W.focus / 60).toFixed(1)}h</b><span>verified focus</span>${delta(Math.round(W.focus / 6) / 10, Math.round(P.focus / 6) / 10, 'h')}</div>
        <div class="kpi"><b>${W.pk}/${W.pl}</b><span>pledges kept</span></div>
        <div class="kpi"><b>${W.acc == null ? '–' : W.acc + '%'}</b><span>accuracy · ${W.q} Qs</span>${delta(W.acc, P.acc, '%')}</div>
      </div>
      <div class="card"><h3>Day by day</h3>${chart}<p class="small muted"><span class="lg bs"></span> score <span class="lg bf"></span> focus minutes</p></div>
      <div class="card"><h3>Also this week</h3><p class="small">${W.reads} readings · ${W.fr} French units · ${W.wd} word sets · ${W.puz} chess puzzles · ${W.sent} outreach emails · ${W.urges} urges beaten</p>
        ${worst.length ? `<p class="small"><b>Weakest habits:</b> ${worst.map(x => `${esc(x.h.t)} (${x.k}/${x.n})`).join(', ')}. Make one of them next week's focus.</p>` : ''}</div>
      <div class="card ${W.owe ? 'owe' : ''}"><h3>Stake</h3>${W.st.amt ? `<p class="small">Rule: more than ${W.st.allow} day(s) below ${W.st.thr} → ₹${W.st.amt} to ${esc(W.st.to || 'your partner')}. This week: ${W.misses} day(s) below.</p>${W.owe ? `<p><b>You owe ₹${W.owe} to ${esc(W.st.to || 'your partner')}.</b></p><label class="switch"><input type="checkbox" data-act="r-paid" ${S.stakes[wk] && S.stakes[wk].paid ? 'checked' : ''}> Paid</label>` : '<p class="small">Nothing owed. ✓</p>'}` : '<p class="small muted">No stake set. Add one in More → Accountability: a real cost makes the plan real.</p>'}</div>
      <div class="card"><h3>Reflect (5 minutes)</h3>
        <label class="small">What went well?<textarea id="rv1" rows="2">${esc(rv.good || '')}</textarea></label>
        <label class="small">What got in the way?<textarea id="rv2" rows="2">${esc(rv.bad || '')}</textarea></label>
        <label class="small">One change for next week<textarea id="rv3" rows="2">${esc(rv.change || '')}</textarea></label>
        <div class="row"><button class="btn" data-act="r-save">Save review</button><button class="btn ghost" data-act="r-send">Send to ${esc(cfg.name || 'partner')} on WhatsApp</button><button class="btn ghost" data-act="r-copy">Copy report</button></div>
        <p class="small muted">${cfg.name ? '' : 'Set your accountability partner in More → Accountability. '}One person who sees your numbers every Sunday beats any notification.</p></div>`;
  }
  function reportText(wk) {
    const W = weekStats(wk), rv = S.reviews[wk] || {}, nm = (S.profile && S.profile.name) || 'Aryan';
    return `VIKRAM weekly report · ${nm} · ${fmtD(wk)}–${fmtD(addDays(wk, 6))}\n` +
      `Avg day score: ${W.avg}/100\nVerified focus: ${(W.focus / 60).toFixed(1)} h\nPledges kept: ${W.pk}/${W.pl}\n` +
      `Aptitude: ${W.q} questions${W.acc != null ? ', ' + W.acc + '% right' : ''}\nReadings ${W.reads} · French units ${W.fr} · word sets ${W.wd} · chess puzzles ${W.puz} · outreach emails ${W.sent}\n` +
      `Days below ${W.st.thr}: ${W.misses}${W.st.amt ? (W.owe ? ` → I owe you ₹${W.owe}` : ' → nothing owed') : ''}\n` +
      (rv.change ? `Next week I will: ${rv.change}\n` : '') + `Hold me to it.`;
  }
  const Acct = {
    act(act, a) {
      const ds = nowIST().date;
      if (act === 'focus') Focus.open(a.dataset.kind);
      if (act === 'pledge1') { day(ds).pledge = { items: pledgeSuggest(ds).map(t => ({ t, done: false })), at: nowIST().mins, ts: ts() }; save(); render(); }
      if (act === 'pledge-edit') { $('#plEdit').classList.toggle('hide'); }
      if (act === 'pledge') { const items = $$('[data-pin]').map(i => i.value.trim()).filter(Boolean); if (!items.length) return toast('Write at least one outcome'); day(ds).pledge = { items: items.map(t => ({ t, done: false })), at: nowIST().mins, ts: ts() }; save(); render(); }
      if (act === 'r-wk') { RWEEK = addDays(RWEEK || weekKey(ds), +a.dataset.d); render(); }
      const wk = RWEEK || weekKey(ds);
      const readRv = () => { S.reviews[wk] = { good: $('#rv1').value.trim(), bad: $('#rv2').value.trim(), change: $('#rv3').value.trim(), d: ds, ts: ts() }; autoVerify(ds); save(); };
      if (act === 'r-save') { readRv(); toast('Review saved'); render(); }
      if (act === 'r-paid') { S.stakes[wk] = { owed: weekStats(wk).owe, paid: a.checked, ts: ts() }; save(); }
      if (act === 'r-copy') { readRv(); try { navigator.clipboard.writeText(reportText(wk)).then(() => toast('Report copied')); } catch (e) { toast('Copy blocked'); } }
      if (act === 'r-send') { readRv(); const cfg = S.settings.partner || {}, num = (cfg.phone || '').replace(/\D/g, ''); location.href = 'https://wa.me/' + (num ? (num.length === 10 ? '91' + num : num) : '') + '?text=' + encodeURIComponent(reportText(wk)); }
      if (act === 'a-save') { S.settings.strict = { v: $('#aStrict').checked, ts: ts() };
        S.settings.partner = { name: $('#aPName').value.trim(), phone: $('#aPPhone').value.trim(), ts: ts() };
        S.settings.stake = { thr: +$('#aThr').value || 60, allow: +$('#aAllow').value || 0, amt: +$('#aAmt').value || 0, to: $('#aTo').value.trim(), ts: ts() };
        S.settings.targets = { study: +$('#aTS').value || 240, class: +$('#aTC').value || 120, sunday: +$('#aTU').value || 60, ts: ts() }; save(); toast('Saved'); }
    }
  };
  function acctSettings() {
    const p = S.settings.partner || {}, st = Object.assign({ thr: 60, allow: 2, amt: 0, to: '' }, S.settings.stake || {}), tg = Object.assign({ study: 240, class: 120, sunday: 60 }, S.settings.targets || {});
    return `<div class="card"><h3>Accountability</h3>
      <label class="switch"><input type="checkbox" id="aStrict" ${strict() ? 'checked' : ''}> Strict mode: habits that can be proven (study blocks, meditation, reading…) tick only from evidence</label>
      <p class="small"><b>Verified focus target (minutes)</b></p><div class="form row3"><label class="small">Study day<input id="aTS" type="number" value="${tg.study}"></label><label class="small">Class day<input id="aTC" type="number" value="${tg.class}"></label><label class="small">Sunday<input id="aTU" type="number" value="${tg.sunday}"></label></div>
      <p class="small"><b>Accountability partner</b> (gets your Sunday report)</p><div class="form row2"><input id="aPName" placeholder="Name" value="${esc(p.name || '')}"><input id="aPPhone" placeholder="WhatsApp number" value="${esc(p.phone || '')}"></div>
      <p class="small"><b>Stake</b>: if more than <input id="aAllow" type="number" class="mini" value="${st.allow}"> day(s) a week score below <input id="aThr" type="number" class="mini" value="${st.thr}">, I pay ₹<input id="aAmt" type="number" class="mini" value="${st.amt}"> to <input id="aTo" class="mini2" placeholder="whom" value="${esc(st.to)}"></p>
      <button class="btn" data-act="a-save">Save</button>
      <p class="small muted">For alerts your phone can't silence: SETUP.md → "Partner emails" makes the GitHub Action email your partner on Sundays and whenever you go quiet for two days.</p></div>`;
  }
  // ---- words (English vocabulary) ----
  const dictUrl = w => w[4] || 'https://www.merriam-webster.com/dictionary/' + encodeURIComponent(w[0].split(' / ')[0]);
  function speakEn(t) { try { const ss = speechSynthesis; ss.cancel(); const u = new SpeechSynthesisUtterance(t.replace(/ \/ /g, ', ')); u.lang = 'en-IN'; const v = ss.getVoices().find(x => /^en-(IN|GB)/i.test(x.lang)) || ss.getVoices().find(x => /^en/i.test(x.lang)); if (v) u.voice = v; u.rate = 0.9; ss.speak(u); } catch (e) { toast('Audio not supported here'); } }
  const allWords = () => VK_WORDS.SETS.flatMap(s => s.w).concat(Object.keys((S.live && S.live.words) || {}).filter(k => S.live.words[k].v).map(k => [k, S.live.words[k].p || '', S.live.words[k].d || '', S.live.words[k].x || '']));
  const wordOfDay = ds => { const A = allWords(); return A[(diffDays('2026-12-01', ds) % A.length + A.length) % A.length]; };
  const Wd = {
    cards() { const out = []; VK_WORDS.SETS.forEach(s => { if (S.wd[s.id] && S.wd[s.id].done) s.w.forEach((w, i) => out.push({ id: 'wd-' + s.id + '-' + i, deck: 'words', f: w[0], b: w[2] + '  ·  "' + w[3] + '"' })); }); return out; },
    tab() {
      const Sx = VK_WORDS.SETS, nx = Sx.find(s => !(S.wd[s.id] && S.wd[s.id].done)), w = wordOfDay(nowIST().date);
      return `<div class="card wod"><div class="eyebrow">Word of the day</div><h2>${esc(w[0])} <button class="btn sm ghost" data-act="w-say" data-t="${esc(w[0])}">🔊</button></h2><p><i>${esc(w[1])}</i> · ${esc(w[2])}</p><p class="small muted">"${esc(w[3])}"</p><a class="lnk" href="${dictUrl(w)}" target="_blank" rel="noopener">dictionary ↗</a></div>
        ${nx ? `<div class="card nextcard"><div class="eyebrow">Next set · 10 words · 10 min</div><h3>${esc(nx.t)}</h3><div class="row"><button class="btn" data-act="w-set" data-id="${nx.id}">Start</button></div></div>` : ''}
        <div class="card list">${Sx.map((s, i) => { const st = S.wd[s.id]; return `<button class="rd ${st && st.done ? 'done' : ''}" data-act="w-set" data-id="${s.id}"><span>${st && st.done ? '✓' : i + 1}</span>${esc(s.t)} <small class="muted">${st && st.best != null ? 'best ' + st.best + '/8' : '10 words'}</small></button>`; }).join('')}</div>
        <details class="card"><summary><b>Word roots</b> · ${VK_WORDS.ROOTS.length} roots unlock thousands of words</summary><table class="roots">${VK_WORDS.ROOTS.map(r => `<tr><td><b>${esc(r[0])}</b></td><td>${esc(r[1])}<small class="muted"> · ${esc(r[2])}</small><br><small>${esc(r[3])}</small></td></tr>`).join('')}</table></details>
        <p class="small muted">Pass a set's quiz (6/8) and its words join your daily flashcards.</p>`;
    },
    open(id) {
      const s = VK_WORDS.SETS.find(x => x.id === id);
      ov(`<div class="quizbox"><div class="row-between"><span class="eyebrow">Words · ${esc(s.t)}</span><button class="btn sm ghost" id="wX">✕</button></div>
        <div class="list">${s.w.map((w, i) => `<div class="frw"><button class="btn sm ghost" data-say="${i}" aria-label="Listen">🔊</button><div><b>${esc(w[0])}</b> <i class="small muted">${esc(w[1])}</i><small>${esc(w[2])}</small><small class="muted">"${esc(w[3])}"</small><a class="lnk small" href="${dictUrl(w)}" target="_blank" rel="noopener">dictionary ↗</a></div></div>`).join('')}</div>
        <p class="small muted">Read each example aloud, then make your own sentence in your head. Then the quiz.</p><button class="btn" id="wQ">Take the quiz (8 questions)</button></div>`);
      $('#wX').onclick = ovClose; $$('[data-say]').forEach(b => b.onclick = () => speakEn(s.w[+b.dataset.say][0]));
      $('#wQ').onclick = () => this.quiz(s);
    },
    quiz(s) {
      const pick = [...s.w].sort(() => Math.random() - 0.5).slice(0, 8);
      const blankable = w => !w[0].includes(' / ') && new RegExp('\\b' + w[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(w[3]);
      const qs = pick.map((w, k) => { const others = s.w.filter(x => x !== w).sort(() => Math.random() - 0.5).slice(0, 3), opts = [w, ...others].sort(() => Math.random() - 0.5); const type = k % 3 === 2 && blankable(w) ? 'blank' : k % 2 ? 'rev' : 'mean';
        if (type === 'mean') return { p: 'What does it mean?', q: w[0], opts: opts.map(o => o[2]), a: opts.indexOf(w) };
        if (type === 'rev') return { p: 'Which word means this?', q: w[2], opts: opts.map(o => o[0]), a: opts.indexOf(w) };
        return { p: 'Fill the blank', q: w[3].replace(new RegExp('\\b' + w[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'), '_____'), opts: opts.map(o => o[0]), a: opts.indexOf(w) }; });
      let n = 0, sc = 0;
      const show = () => {
        if (n >= qs.length) { const st = Object.assign({}, S.wd[s.id] || {}), pass = sc >= 6; st.best = Math.max(st.best || 0, sc); if (pass && !st.done) st.done = true; st.d = nowIST().date; st.ts = ts(); S.wd[s.id] = st; autoVerify(nowIST().date); save();
          ov(`<div class="quizbox center"><h2 class="qq">${sc}/8 ${pass ? '✓' : ''}</h2><p>${pass ? 'Set passed. These words are now in your daily flashcards.' : 'Need 6/8. Read the examples once more and retry.'}</p><div class="row" style="justify-content:center"><button class="btn" id="wB">Back to set</button><button class="btn ghost" id="wC">Close</button></div></div>`);
          $('#wB').onclick = () => this.open(s.id); $('#wC').onclick = ovClose; return; }
        const q = qs[n];
        ov(`<div class="quizbox"><div class="row-between"><span class="eyebrow">Quiz · ${n + 1}/8 · ${sc} right</span><button class="btn sm ghost" id="wX">✕</button></div><p class="small muted">${q.p}</p><h2 class="qq">${esc(q.q)}</h2><div class="opts">${q.opts.map((o, i) => `<button class="opt" data-o="${i}">${esc(o)}</button>`).join('')}</div></div>`);
        $('#wX').onclick = ovClose;
        $$('[data-o]').forEach(b => b.onclick = () => { const i = +b.dataset.o; $$('[data-o]').forEach(x => x.disabled = true); b.classList.add(i === q.a ? 'right' : 'wrong'); $$('[data-o]')[q.a].classList.add('right'); if (i === q.a) sc++; setTimeout(() => { n++; show(); }, i === q.a ? 650 : 1500); });
      };
      show();
    }
  };
  // ---- go further ----
  const resBlock = k => { const g = VK_RESOURCES.find(x => x.k === k); return g ? `<h3 class="h">Go further</h3><div class="card list res">${g.r.map(r => `<a class="resl" href="${r[1]}" target="_blank" rel="noopener"><b>${esc(r[0])} ↗</b><small>${esc(r[2])}</small></a>`).join('')}</div>` : ''; };
  function viewResources() {
    return `<section class="hero small"><div class="eyebrow">Go further · beyond VIKRAM</div><h1>The best free resources</h1><p>VIKRAM tracks and teaches the core; these take you further. All free, links checked.</p></section>
      ${VK_RESOURCES.map(g => `<h3 class="h">${esc(g.t)}</h3><div class="card list res">${g.r.map(r => `<a class="resl" href="${r[1]}" target="_blank" rel="noopener"><b>${esc(r[0])} ↗</b><small>${esc(r[2])}</small></a>`).join('')}</div>`).join('')}`;
  }

  // ================= stories: swipeable history series =================
  const STDATA = {}, STWAIT = {};
  window.VK_STORY_LOAD = (id, d) => { STDATA[id] = d; (STWAIT[id] || []).forEach(f => f(true)); delete STWAIT[id]; };
  function loadScript(src, ok, bad) { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => { s.remove(); bad && bad(); }; document.head.appendChild(s); }
  function loadStory(id, cb) {
    const need = () => { if (STDATA[id]) return cb(true); if (STWAIT[id]) return STWAIT[id].push(cb); STWAIT[id] = [cb]; loadScript('stories/' + id + '.js', null, () => { (STWAIT[id] || []).forEach(f => f(false)); delete STWAIT[id]; }); };
    if (typeof VK_LAND === 'undefined') loadScript('js/land.js', need, () => need()); else need();
  }
  const SER = id => VK_STORIES.SERIES.find(s => s.id === id);
  const stRec = id => S.stories[id] || { i: 0, max: -1 };
  const Story = {
    pick() { const prog = VK_STORIES.SERIES.map(s => ({ s, r: stRec(s.id) })); const cur = prog.filter(x => x.r.max >= 0 && !x.r.done).sort((a, b) => (b.r.ts || 0) - (a.r.ts || 0))[0]; return (cur || prog.find(x => !x.r.done) || prog[0]).s.id; },
    shelf() {
      const nx = this.pick(), s = SER(nx), r = stRec(nx);
      return `<div class="stshelf">${VK_STORIES.SERIES.map(x => { const rr = stRec(x.id), im = VK_STORIES.IMG[x.cover]; const pct = rr.done ? 100 : rr.n ? Math.round(100 * (rr.max + 1) / rr.n) : 0;
        return `<button class="stp" data-act="s-open" data-id="${x.id}" style="--c:${x.color};--p:${pct}%;${im ? `background-image:linear-gradient(180deg,#0000 35%,#000d),url(stories/img/${x.cover}.jpg)` : ''}"><span class="stt">${esc(x.t)}</span><span class="sts">${esc(x.sub)}</span><span class="stbar"><i></i></span><span class="stn">${rr.done ? '✓ finished' : rr.max >= 0 ? `${rr.max + 1}/${rr.n || x.n || ''} read` : 'new'}</span></button>`; }).join('')}</div>
        <button class="stgo" data-act="s-open" data-id="${nx}"><b>${r.max >= 0 ? 'Continue' : 'Start'}: ${esc(s.t)}</b><small>${r.max >= 0 && r.n ? `card ${Math.min(r.i + 1, r.n)} of ${r.n} · ` : ''}swipe stories instead of reels</small></button>`;
    },
    open(id, at) {
      ov(`<div class="story"><p class="muted center" style="margin-top:40vh">Loading…</p></div>`); $('#overlay').classList.add('full', 'dark');
      loadStory(id, ok => { if (!ok) { ov(`<div class="quizbox"><p>This series isn't saved on this device yet. Open it once while online.</p><button class="btn" id="sX">Close</button></div>`); $('#sX').onclick = () => { $('#overlay').classList.remove('dark'); ovClose(); }; return; }
        const C = STDATA[id], r = stRec(id); this.id = id; this.cards = C; this.i = at != null ? at : (r.done ? 0 : Math.min(r.i || 0, C.length - 1)); this.prevLL = null; this.buildMap(); this.show(); });
    },
    chapterOf(i) { let s = i; while (s > 0 && !this.cards[s].ch) s--; let e = i + 1; while (e < this.cards.length && !this.cards[e].ch) e++; return { s, e, t: this.cards[s].ch || '' }; },
    buildMap() {
      const ser = SER(this.id), pts = this.cards.filter(c => c.ll), lat0 = pts.reduce((a, c) => a + c.ll[0], 0) / (pts.length || 1);
      this.k = Math.cos(lat0 * Math.PI / 180);
      const L = (typeof VK_LAND !== 'undefined' && VK_LAND[ser.land]) || [];
      this.landPath = L.map(r => { let d = ''; for (let j = 0; j < r.length; j += 2) d += (j ? 'L' : 'M') + (r[j] * this.k).toFixed(2) + ' ' + (-r[j + 1]).toFixed(2); return d + 'Z'; }).join('');
      this.span = ser.span;
    },
    xy(ll) { return [ll[1] * this.k, -ll[0]]; },
    mapSvg(c) {
      const route = []; for (let j = 0; j <= this.i; j++) { const cc = this.cards[j]; if (cc.ll) { const p = this.xy(cc.ll); const last = route[route.length - 1]; if (!last || Math.hypot(last[0] - p[0], last[1] - p[1]) > 0.05) route.push(p); } }
      const cur = c.ll ? this.xy(c.ll) : route[route.length - 1] || [0, 0];
      const w = this.span * this.k * 1.4, h = this.span * 0.7, vb = [cur[0] - w / 2, cur[1] - h / 2, w, h];
      const prevPts = route.slice(0, -1), lastSeg = route.length > 1 ? route.slice(-2) : null;
      const sw = this.span / 160;
      return `<svg class="smap" viewBox="${vb.join(' ')}" preserveAspectRatio="xMidYMid slice" data-vb="${vb.join(' ')}"><rect x="${vb[0] - 400}" y="${vb[1] - 400}" width="${w + 800}" height="${h + 800}" class="sea"/><path d="${this.landPath}" class="land" stroke-width="${sw / 2}"/>
        ${prevPts.length > 1 ? `<polyline points="${prevPts.map(p => p.join(',')).join(' ')}" class="route" stroke-width="${sw}"/>` : ''}
        ${lastSeg ? `<polyline points="${lastSeg.map(p => p.join(',')).join(' ')}" class="route new" stroke-width="${sw}" pathLength="1"/>` : ''}
        ${route.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="${sw * 1.2}" class="dot"/>`).join('')}
        ${c.ll ? `<circle cx="${cur[0]}" cy="${cur[1]}" r="${sw * 3}" class="pulse"/><circle cx="${cur[0]}" cy="${cur[1]}" r="${sw * 1.8}" class="pin" stroke-width="${sw * 0.8}"/><text x="${cur[0] + sw * 3.5}" y="${cur[1] - sw * 2.5}" font-size="${sw * 6}" stroke-width="${sw * 0.9}" class="plbl">${esc(c.pl || '')}</text>` : ''}</svg>`;
    },
    show() {
      const C = this.cards, c = C[this.i], ser = SER(this.id), ch = this.chapterOf(this.i), tg = VK_STORIES.TAGS[c.tag] || VK_STORIES.TAGS.fact, im = c.img && VK_STORIES.IMG[c.img];
      const r = Object.assign({}, stRec(this.id)); const fresh = this.i > (r.max == null ? -1 : r.max);
      r.i = this.i; r.n = C.length; if (fresh) { r.max = this.i; const d = day(nowIST().date); d.st = { n: ((d.st && d.st.n) || 0) + 1, ts: ts() }; }
      if (this.i === C.length - 1) r.done = true; r.ts = ts(); S.stories[this.id] = r; autoVerify(nowIST().date); save();
      const html = `<div class="story" style="--c:${ser.color}">
        <div class="sbars">${C.slice(ch.s, ch.e).map((x, j) => `<i class="${ch.s + j < this.i ? 'full' : ch.s + j === this.i ? 'cur' : ''}"></i>`).join('')}</div>
        <div class="shead"><div><b>${esc(ser.t)}</b><small>${esc(ch.t)} · ${this.i + 1}/${C.length}</small></div><button class="sx" id="sX" aria-label="Close">✕</button></div>
        <div class="svis ${im ? 'hasimg' : ''}">${im ? `<img src="stories/img/${c.img}.jpg" alt="${esc(im.alt || c.t)}" loading="eager"><div class="minimap">${this.mapSvg(c)}</div>` : this.mapSvg(c)}</div>
        ${im ? `<a class="scred" href="${esc(im.page)}" target="_blank" rel="noopener">Image: ${esc(im.by)} · ${esc(im.lic)} · Wikimedia Commons</a>` : ''}
        <div class="sbody" id="sBody"><div class="smeta"><span class="sy">${esc(c.y || '')}</span>${c.pl ? `<span class="spl">${esc(c.pl)}</span>` : ''}<span class="stag t-${c.tag}" title="${esc(tg[1])}">${tg[0]}</span></div>
          <h2>${esc(c.t)}</h2>${c.x.split(/\n\n+/).map(t => `<p>${esc(t)}</p>`).join('')}
          <div class="ssrc">${(c.w || []).map(w => `<a href="https://en.wikipedia.org/wiki/${w}" target="_blank" rel="noopener" ${EXT.acts['x-open'] ? 'data-act="x-open" data-t="' + esc(decodeURIComponent(w)) + '"' : ''}>${esc(decodeURIComponent(w).replace(/_/g, ' '))} ›</a>`).join('')}</div></div>
        <div class="snav"><button id="sPrev" aria-label="Previous">‹</button><span class="small">scroll to read · tap right for next</span><button id="sNext" aria-label="Next">›</button></div></div>`;
      const o = $('#overlay'); o.innerHTML = html; o.classList.add('show', 'full', 'dark');
      const svg = o.querySelector('.svis svg'); this.animate(svg, c);
      $('#sX').onclick = () => { $('#overlay').classList.remove('dark'); ovClose(); };
      $('#sPrev').onclick = () => this.prev(); $('#sNext').onclick = () => this.next();
      const st = o.querySelector('.story'); let x0 = null, y0 = null, t0 = 0;
      st.ontouchstart = e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); };
      st.ontouchend = e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null; this.swiped = Date.now(); if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return; e.preventDefault(); if (dx < 0) this.next(); else this.prev(); };
      st.onclick = e => { if (Date.now() - (this.swiped || 0) < 400) return; if (e.target.closest('a,button')) return; const wv = window.innerWidth; if (e.clientX < wv * 0.3) this.prev(); else this.next(); };
      document.onkeydown = e => { if (!$('#overlay .story')) { document.onkeydown = null; return; } if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') this.next(); if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') this.prev(); if (e.key === 'Escape') $('#sX').click(); };
      this.prevLL = c.ll || this.prevLL;
    },
    animate(svg, c) {
      if (!svg) return; const to = svg.dataset.vb.split(' ').map(Number), from = this.lastVB || to; this.lastVB = to; const t0 = performance.now(), D = 900;
      const step = t => { const k = Math.min(1, (t - t0) / D), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; svg.setAttribute('viewBox', from.map((v, j) => v + (to[j] - v) * e).join(' ')); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    },
    next() {
      const c = this.cards[this.i];
      if (c.q && !this.answered) return this.quiz(c.q);
      this.answered = false;
      if (this.i < this.cards.length - 1) { this.i++; this.show(); $('#overlay').scrollTop = 0; } else this.end();
    },
    prev() { this.answered = false; if (this.i > 0) { this.i--; this.show(); } },
    quiz(q) {
      const o = $('#overlay'); const box = document.createElement('div'); box.className = 'squiz';
      box.innerHTML = `<div class="sqin"><div class="eyebrow">Quick check · one tap</div><h3>${esc(q.q)}</h3><div class="opts">${q.o.map((x, i) => `<button class="opt" data-o="${i}">${esc(x)}</button>`).join('')}</div><button class="btn sm ghost" id="sqSkip">Skip</button></div>`;
      o.querySelector('.story').appendChild(box);
      box.onclick = e => e.stopPropagation(); box.ontouchend = e => e.stopPropagation();
      box.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const i = +b.dataset.o; box.querySelectorAll('[data-o]').forEach(x => x.disabled = true); b.classList.add(i === q.a ? 'right' : 'wrong'); box.querySelectorAll('[data-o]')[q.a].classList.add('right');
        const r = S.stories[this.id]; r.qok = (r.qok || 0) + (i === q.a ? 1 : 0); r.qn = (r.qn || 0) + 1; r.ts = ts(); save(); if (navigator.vibrate) navigator.vibrate(i === q.a ? 15 : [30, 40, 30]); setTimeout(() => { this.answered = true; this.next(); }, i === q.a ? 700 : 1500); });
      box.querySelector('#sqSkip').onclick = () => { this.answered = true; this.next(); };
    },
    end() {
      const ser = SER(this.id), r = stRec(this.id), nx = VK_STORIES.SERIES.find(s => !stRec(s.id).done && s.id !== this.id);
      ov(`<div class="quizbox center"><div class="eyebrow">Series complete</div><h2>${esc(ser.t)} ✓</h2><p class="muted">${this.cards.length} cards${r.qn ? ` · quick checks ${r.qok || 0}/${r.qn}` : ''}</p>
        ${ser.primary.length ? `<div class="card" style="text-align:left"><h3>Read the originals</h3>${ser.primary.map(([n, u]) => `<a class="lnk" href="${u}" target="_blank" rel="noopener">${esc(n)} ↗</a><br>`).join('')}</div>` : ''}
        <div class="row" style="justify-content:center">${nx ? `<button class="btn" id="sN">Next series: ${esc(nx.t)}</button>` : ''}<button class="btn ghost" id="sC">Close</button></div></div>`);
      $('#overlay').classList.remove('dark');
      if (nx) $('#sN').onclick = () => this.open(nx.id, 0); $('#sC').onclick = ovClose;
    }
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
          const merged = merge(remote, S); const local = S; S = merged; ['days', 'tasks', 'taskDue', 'books', 'writing', 'subs', 'settings', 'srs', 'contacts', 'coState', 'lib', 'fr', 'chess', 'wd', 'reviews', 'stakes', 'stories', 'gita', 'live', 'my'].forEach(k => S[k] = S[k] || {}); C.setPlan(S.settings.seasonPlan); S.math = S.math || []; S.practice = S.practice || []; S.sent = S.sent || []; S.focus = S.focus || []; LS.set(KEY, S);
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
  EXT.kit = { $, $$, esc, S: () => S, save, day, nowIST, ts, toast, ov, ovClose, render, go, loadScript, LS, speak, speakEn, addDays, fmtD, activeItems, debounce, burst, tab: () => TAB };
  (EXT.boot || []).forEach(f => { try { f(EXT.kit); } catch (e) { console.error(e); } });
  save(false); render(); fab(); Sync.now();
  window.VIKRAM = { parseCSV, Out, S: () => S, merge, score, streakInfo, activeItems, dayType, blocksFor, xp };
})();
