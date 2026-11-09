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
  ['days', 'tasks', 'taskDue', 'books', 'writing', 'subs', 'settings'].forEach(k => S[k] = S[k] || {});
  S.math = S.math || [];
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
  const tabs = ['today', 'prep', 'feed', 'life', 'more'];
  function go(t) { TAB = tabs.includes(t) ? t : 'today'; try { history.replaceState(null, '', '#' + TAB + location.search.replace(/^/, '')); } catch (e) { } render(); window.scrollTo(0, 0); }
  window.addEventListener('hashchange', () => { const t = location.hash.replace('#', ''); if (t !== TAB && tabs.includes(t)) { TAB = t; render(); } });
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600); }

  function render() {
    $$('.tabbar button').forEach(b => b.classList.toggle('on', b.dataset.tab === TAB));
    const v = $('#view');
    v.innerHTML = ({ today: viewToday, prep: viewPrep, feed: viewFeed, life: viewLife, more: viewMore }[TAB])();
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
    <h3 class="h">Deadlines</h3>
    ${Object.keys(months).sort().map(k => `<details ${k <= ds.slice(0, 7) || k === addDays(ds, 20).slice(0, 7) ? 'open' : ''}><summary>${new Date(k + '-01T00:00:00Z').toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })} <small>${months[k].filter(taskDone).length}/${months[k].length}</small></summary><div class="list">${months[k].map(t => taskRow(t, ds)).join('')}</div></details>`).join('')}
    <h3 class="h">Notes library</h3>
    ${tracks.map(tr => `<div class="eyebrow mt">${esc(tr)}</div><div class="mods">${C.MODULES.filter(m => m.track === tr).map(m => `<div class="mod ${m.local ? 'ready' : ''}"><span class="code">${m.c}</span><b>${esc(m.t)}</b>${m.local ? `<a href="${m.local}">Open ↗</a>` : `<small>due ${fmtD(m.due)}</small>`}</div>`).join('')}</div>`).join('')}`;
  }
  function spark(arr) {
    if (arr.length < 2) return '<p class="muted small">Your scores will chart here.</p>';
    const w = 300, h = 50, mx = Math.max(...arr, 10), pts = arr.map((v, i) => `${(i / (arr.length - 1)) * w},${h - (v / mx) * (h - 6) - 3}`).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" class="spark"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
  }

  // ---------- FEED ----------
  let feedIdx = LS.get('vikram_feed_idx', Math.floor(Math.random() * C.FEED.length));
  function viewFeed() {
    const c = C.FEED[feedIdx % C.FEED.length], ds = nowIST().date, dd = day(ds);
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
    if (act === 'feednext' || act === 'feedprev') { feedIdx = (feedIdx + (act === 'feednext' ? 1 : C.FEED.length - 1)) % C.FEED.length; LS.set('vikram_feed_idx', feedIdx); if (act === 'feednext') { const d = day(ds); d.cards = { n: ((d.cards && d.cards.n) || 0) + 1, ts: ts() }; save(); } render(); }
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
          const merged = merge(remote, S); const local = S; S = merged; ['days', 'tasks', 'taskDue', 'books', 'writing', 'subs', 'settings'].forEach(k => S[k] = S[k] || {}); S.math = S.math || []; LS.set(KEY, S);
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
  $$('.tabbar button').forEach(b => b.onclick = () => go(b.dataset.tab));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { Sync.now(); render(); } else if (Sync.cfg()) Sync.now(); });
  window.addEventListener('online', () => Sync.now());
  setInterval(() => Sync.now(), 180000);
  save(false); render(); Sync.now();
  window.VIKRAM = { S: () => S, merge, score, streakInfo, activeItems, dayType, blocksFor, xp };
})();
