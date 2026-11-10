/* VIKRAM weekly report to yourself. Built on the server from state.json every Monday morning, forever.
   No AI and no outside service: every sentence comes from rules over your own data, so it cannot break or run out. */
const addDays = (ds, n) => { const d = new Date(ds + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dname = ds => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(ds + 'T00:00:00Z').getUTCDay()];
const fmt = ds => new Date(ds + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const hrs = m => (m / 60).toFixed(1);
const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function build(S, C, wk, h) { // wk = Monday of the week being reported; h = { blocksFor, score }
  const days = [...Array(7)].map((_, i) => addDays(wk, i)), prev = days.map(d => addDays(d, -7));
  const D = ds => (S.days && S.days[ds]) || {}, on = (ds, id) => !!(D(ds).items && D(ds).items[id] && D(ds).items[id].v);
  const ids = ds => { const out = []; h.blocksFor(S, ds).forEach(b => (b.items || []).forEach(id => { const hb = C.HABITS.find(x => x.id === id); const off = S.my && S.my.off && S.my.off[C.seasonAt(ds).id + ':' + id]; if (hb && hb.start <= ds && !out.includes(id) && !(off && off.v)) out.push(id); })); Object.keys((S.my && S.my.habits) || {}).forEach(id => { const m = S.my.habits[id]; if (m.v && m.season === C.seasonAt(ds).id) out.push(id); }); return out; };
  const hname = id => (C.HABITS.find(x => x.id === id) || {}).t || ((S.my && S.my.habits && S.my.habits[id]) || {}).t || id;
  const sc = ds => { const i = ids(ds); return i.length ? Math.round(100 * i.filter(id => on(ds, id)).length / i.length) : 0; };
  const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0;
  const F = (S.focus || []), fIn = set => F.filter(f => set.includes(f.d)), sum = a => a.reduce((x, f) => x + (f.mins || 0), 0);
  const scores = days.map(sc), pscores = prev.map(sc), A = avg(scores), PA = avg(pscores);
  const fw = fIn(days), fp = fIn(prev), fm = sum(fw), fpm = sum(fp);
  const active = days.filter(d => Object.values(D(d).items || {}).some(x => x.v) || F.some(f => f.d === d)).length;
  const seasonName = C.seasonAt(days[6]).n, name = (S.profile && S.profile.name) || 'Aryan';
  // focus breakdown
  const byKind = {}; fw.forEach(f => byKind[f.kind || 'study'] = (byKind[f.kind || 'study'] || 0) + f.mins);
  const slot = { 'before noon': 0, 'afternoon': 0, 'evening': 0 }; fw.forEach(f => { slot[f.sm < 720 ? 'before noon' : f.sm < 1020 ? 'afternoon' : 'evening'] += f.mins; });
  const dist = fw.filter(f => f.res === 'dist').length, away = Math.round(fw.reduce((a, f) => a + (f.away || 0), 0));
  const fday = days.map(d => sum(F.filter(f => f.d === d))), bestI = scores.indexOf(Math.max(...scores)), worstI = scores.indexOf(Math.min(...scores));
  // habits
  const rate = {}; days.forEach(d => ids(d).forEach(id => { rate[id] = rate[id] || [0, 0]; rate[id][1]++; if (on(d, id)) rate[id][0]++; }));
  const ranked = Object.keys(rate).filter(id => rate[id][1] >= 3).map(id => [id, rate[id][0], rate[id][1]]).sort((a, b) => b[1] / b[2] - a[1] / a[2]);
  const top = ranked.slice(0, 3), bottom = ranked.slice(-3).reverse().filter(x => x[1] / x[2] < 0.6);
  // pledges, tasks, practice, learning
  let pl = 0, pk = 0; days.forEach(d => { const p = D(d).pledge; if (p && p.items) { pl += p.items.length; pk += p.items.filter(i => i.done).length; } });
  const t0 = Date.parse(wk + 'T00:00:00+05:30'), t1 = t0 + 7 * 864e5;
  const done = Object.keys(S.tasks || {}).filter(id => S.tasks[id].done && S.tasks[id].ts >= t0 && S.tasks[id].ts < t1);
  const tname = id => { const t = (C.TASKS || []).find(x => x.id === id); return t ? t.t : ((S.my && S.my.tasks && S.my.tasks[id]) || {}).t || id; };
  const pr = (S.practice || []).filter(p => days.includes(p.d)), q = pr.reduce((a, p) => a + (p.n || 0), 0), ok = pr.reduce((a, p) => a + (p.sc || 0), 0);
  const cnt = k => days.reduce((a, d) => a + ((D(d)[k] && D(d)[k].n) || 0), 0), lv = k => days.reduce((a, d) => a + ((D(d).lv && D(d).lv[k]) || 0), 0);
  const stories = cnt('st'), verses = cnt('gv'), wiki = lv('wiki'), fr = lv('fr'), words = lv('en');
  const notes = Object.keys((S.gita && S.gita.notes) || {}).filter(k => S.gita.notes[k].t && S.gita.notes[k].ts >= t0 && S.gita.notes[k].ts < t1);
  // four-week trend and weekday pattern
  const trend = [3, 2, 1, 0].map(w => avg(days.map(d => sc(addDays(d, -7 * w)))));
  const ftrend = [3, 2, 1, 0].map(w => sum(fIn(days.map(d => addDays(d, -7 * w)))));
  const wdAvg = days.map((d, i) => avg([0, 1, 2, 3].map(w => sc(addDays(d, -7 * w))))), weakWd = wdAvg.indexOf(Math.min(...wdAvg));
  let streak = 0; for (let d = days[6]; sc(d) >= 60 && streak < 400; d = addDays(d, -1)) streak++;
  const tgt = ((S.settings && S.settings.targets) || {}).focus || 0; // weekly focus hours target, if set
  // ---------- the analysis: plain sentences from rules ----------
  const an = [];
  if (!active) an.push('Nothing was logged this week. No analysis is possible without data. The only goal for next week: open VIKRAM once a day and tap Focus once.');
  else {
    an.push(A >= PA + 5 ? `Your average day score rose from ${PA} to ${A}. The week was better than the last one.` : A <= PA - 5 ? `Your average day score fell from ${PA} to ${A}. This week was weaker than the last one.` : `Your average day score held at ${A} (last week ${PA}).`);
    an.push(fm >= fpm * 1.15 && fm > 60 ? `Verified focus went up to ${hrs(fm)} h from ${hrs(fpm)} h.` : fm <= fpm * 0.85 && fpm > 60 ? `Verified focus dropped to ${hrs(fm)} h from ${hrs(fpm)} h. This is the number that decides results.` : `Verified focus was ${hrs(fm)} h (last week ${hrs(fpm)} h).`);
    if (tgt) an.push(fm / 60 >= tgt ? `You hit your ${tgt} h weekly focus target.` : `You were ${(tgt - fm / 60).toFixed(1)} h short of your ${tgt} h weekly focus target.`);
    if (active < 7) an.push(`You used VIKRAM on ${active} of 7 days. The ${7 - active} empty day${7 - active > 1 ? 's' : ''} cost more than any bad day did.`);
    if (fm > 0) { const best = Object.keys(slot).sort((a, b) => slot[b] - slot[a])[0]; an.push(`${Math.round(100 * slot[best] / fm)}% of your focus happened ${best}. ${best === 'before noon' ? 'Protect your mornings; that is where your work gets done.' : 'Your mornings are underused; the plan depends on them.'}`); }
    if (dist || away > 20) an.push(`${dist} session${dist === 1 ? '' : 's'} ended as "distracted" and you spent about ${away} min away from the app mid-session.`);
    if (scores[bestI] !== scores[worstI]) an.push(`Best day: ${dname(days[bestI])} (${scores[bestI]}, ${fday[bestI]} focus min). Worst: ${dname(days[worstI])} (${scores[worstI]}).`);
    if (trend.some(x => x > 0) && Math.max(...wdAvg) - wdAvg[weakWd] >= 15) an.push(`Over the last four weeks ${dname(days[weakWd])} is your weakest day on average (${wdAvg[weakWd]}). Plan it lighter or guard it harder.`);
    if (bottom.length) an.push(`Habits slipping: ${bottom.map(x => `${hname(x[0])} (${x[1]}/${x[2]})`).join(', ')}.`);
    if (top.length) an.push(`Habits holding: ${top.map(x => `${hname(x[0])} (${x[1]}/${x[2]})`).join(', ')}.`);
    if (pl) an.push(`You kept ${pk} of ${pl} morning pledges.`);
    if (trend[3] > trend[2] && trend[2] > trend[1]) an.push('Three weeks of improvement in a row. Whatever you changed, keep it.');
    if (trend[3] < trend[2] && trend[2] < trend[1]) an.push('Three weeks of decline in a row. Cut the plan down to the minimum version for a week and rebuild from there.');
  }
  // one thing for next week
  let one;
  if (!active) one = 'Open VIKRAM every day and start one 25-minute focus session.';
  else if (active < 5) one = 'Show up all 7 days, even if it is one 25-minute session.';
  else if (fm < 300) one = 'Double your verified focus: one timer before breakfast every day.';
  else if (bottom.length) one = `Fix one habit only: ${hname(bottom[0][0])}. Do the minimum version daily.`;
  else if (dist >= 3) one = 'Phone in another room during focus sessions. Aim for zero "distracted" endings.';
  else one = `Hold the standard and add 10%: target ${hrs(fm * 1.1)} h of focus.`;
  const rv = (S.reviews || {})[wk] || {};
  const bar = n => '█'.repeat(Math.round(n / 10)) + '░'.repeat(10 - Math.round(n / 10));
  const rows = days.map((d, i) => `${dname(d)} ${fmt(d).padEnd(6)}  ${bar(scores[i])} ${String(scores[i]).padStart(3)}   ${String(fday[i]).padStart(3)} min`);
  const learn = [stories && `${stories} story cards`, verses && `${verses} Gita verses`, notes.length && `${notes.length} Gita reflections`, wiki && `${wiki} Wikipedia articles`, fr && `${fr} French sentences`, words && `${words} new words`, q && `${q} aptitude questions (${Math.round(100 * ok / q)}% right)`].filter(Boolean);
  const subject = `VIKRAM week of ${fmt(wk)}: score ${A}, focus ${hrs(fm)} h${A >= PA + 5 ? ' ↑' : A <= PA - 5 ? ' ↓' : ''}`;
  const text = [`${name}, your week (${fmt(wk)} to ${fmt(days[6])}) · ${seasonName}`, '', `Average day score: ${A}/100 (last week ${PA})`, `Verified focus: ${hrs(fm)} h (last week ${hrs(fpm)} h)${Object.keys(byKind).length > 1 ? ' · ' + Object.keys(byKind).map(k => `${k} ${hrs(byKind[k])} h`).join(', ') : ''}`, `Days used: ${active}/7 · streak of days at 60+: ${streak}`, '', 'DAY BY DAY (score, focus)', ...rows, '', 'WHAT THE NUMBERS SAY', ...an.map(x => '- ' + x), '', `Done this week: ${done.length ? done.map(tname).join('; ') : 'no tasks or goals ticked'}`, `Learning: ${learn.length ? learn.join(', ') : 'nothing logged'}`, `Four-week trend (score): ${trend.join(' → ')} · (focus h): ${ftrend.map(hrs).join(' → ')}`, rv.change ? `Your own plan from the weekly review: ${rv.change}` : 'You did not write a weekly review. Two minutes on Sunday makes this report sharper.', '', `ONE THING FOR NEXT WEEK: ${one}`, '', 'Sent automatically by VIKRAM every Monday. Open: https://vikram007sage.github.io/VIKRAM/#review'].join('\n');
  const td = 'padding:4px 10px 4px 0;font:14px Georgia,serif;color:#222';
  const html = `<div style="max-width:620px;margin:0 auto;font:16px/1.55 Georgia,serif;color:#1c1c1c"><div style="background:#12382b;color:#fff;border-radius:14px;padding:22px 24px"><div style="font:11px monospace;letter-spacing:.14em;text-transform:uppercase;opacity:.8">VIKRAM · ${esc(seasonName)} · ${fmt(wk)} to ${fmt(days[6])}</div><div style="font-size:44px;font-weight:bold;line-height:1.1;margin-top:8px">${A}<span style="font-size:18px;opacity:.7"> /100 ${A > PA ? '▲' : A < PA ? '▼' : ''} ${Math.abs(A - PA) || ''}</span></div><div style="margin-top:4px">${hrs(fm)} h verified focus · ${active}/7 days · streak ${streak}</div></div>
<h3 style="margin:22px 0 6px">Day by day</h3><table style="border-collapse:collapse">${days.map((d, i) => `<tr><td style="${td}">${dname(d)} ${fmt(d)}</td><td style="${td}"><div style="width:160px;background:#e8e4d8;border-radius:4px"><div style="width:${scores[i]}%;background:${scores[i] >= 60 ? '#1f7a4d' : '#c0702a'};height:10px;border-radius:4px"></div></div></td><td style="${td}">${scores[i]}</td><td style="${td};color:#666">${fday[i]} min</td></tr>`).join('')}</table>
<h3 style="margin:22px 0 6px">What the numbers say</h3><ul style="padding-left:20px;margin:0">${an.map(x => `<li style="margin-bottom:6px">${esc(x)}</li>`).join('')}</ul>
<h3 style="margin:22px 0 6px">Done and learned</h3><p style="margin:0">${done.length ? esc(done.map(tname).join('; ')) : 'No tasks or goals ticked.'}<br>${learn.length ? esc(learn.join(', ')) : 'No learning logged.'}</p>
<p style="color:#555;font-size:14px">Four-week score trend: ${trend.join(' → ')} · focus hours: ${ftrend.map(hrs).join(' → ')}${rv.change ? '<br>Your plan from the weekly review: ' + esc(rv.change) : '<br>No weekly review written. Two minutes on Sunday makes this sharper.'}</p>
<div style="background:#fff4e2;border-left:4px solid #c0702a;border-radius:0 10px 10px 0;padding:14px 16px;margin:18px 0"><div style="font:11px monospace;letter-spacing:.12em;text-transform:uppercase;color:#c0702a">One thing for next week</div><div style="font-size:19px;font-weight:bold;margin-top:4px">${esc(one)}</div></div>
<p style="color:#888;font-size:12px">Sent automatically by VIKRAM every Monday morning. <a href="https://vikram007sage.github.io/VIKRAM/#review">Open VIKRAM</a></p></div>`;
  return { subject, text, html };
}
module.exports = { build };
