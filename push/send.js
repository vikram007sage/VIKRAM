/* VIKRAM nudger. Runs in GitHub Actions every ~15 min. Reads state.json from the PRIVATE data repo,
   works out which nudges fell due since the last run (IST), sends Web Push to every subscribed device,
   and records lastRun. Quiet by design: never logs personal data. */
const webpush = require('web-push');
const C = require('../js/content.js');
const { DATA_TOKEN, DATA_REPO, VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT = 'mailto:vikram@example.com', DRY_RUN, STATE_FILE, NOW } = process.env;
const API = `https://api.github.com/repos/${DATA_REPO}/contents/`;
const H = { Authorization: `Bearer ${DATA_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'vikram-nudger' };
const toMin = hm => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };

function ist(d) { const t = new Date(d.getTime() + 330 * 60000); return { date: t.toISOString().slice(0, 10), mins: t.getUTCHours() * 60 + t.getUTCMinutes() }; }
async function getFile(path) {
  if (STATE_FILE && path === 'state.json') return { json: JSON.parse(require('fs').readFileSync(STATE_FILE, 'utf8')), sha: null };
  const r = await fetch(API + path, { headers: H }); if (r.status === 404) return { json: null, sha: null }; if (!r.ok) throw new Error('read ' + path + ' ' + r.status);
  const j = await r.json(); let txt = j.content ? Buffer.from(j.content, 'base64').toString('utf8') : '';
  if (!txt && j.size) { const rr = await fetch(API + path, { headers: { ...H, Accept: 'application/vnd.github.raw' } }); txt = await rr.text(); }
  return { json: txt ? JSON.parse(txt) : null, sha: j.sha };
}
async function putFile(path, obj, sha, msg) {
  if (DRY_RUN) return; const body = { message: msg, content: Buffer.from(JSON.stringify(obj)).toString('base64') }; if (sha) body.sha = sha;
  const r = await fetch(API + path, { method: 'PUT', headers: H, body: JSON.stringify(body) }); if (!r.ok) throw new Error('write ' + path + ' ' + r.status);
}

function dayType(S, ds) { const o = S.settings && S.settings.dayType && S.settings.dayType[ds]; return (o && o.v) || C.defaultDayType(ds); }
function blocksFor(S, ds) { const t = dayType(S, ds), e = S.settings && S.settings.blocks && S.settings.blocks[t]; return (e && e.list) || C.SCHEDULES[t].blocks; }
function score(S, ds) {
  const d = S.days && S.days[ds]; if (!d) return 0; const ids = [];
  blocksFor(S, ds).forEach(b => (b.items || []).forEach(id => { const h = C.HABITS.find(x => x.id === id); if (h && h.start <= ds && !ids.includes(id)) ids.push(id); }));
  return ids.length ? Math.round(100 * ids.filter(id => d.items && d.items[id] && d.items[id].v).length / ids.length) : 0;
}
const ticked = (S, ds, id) => !!(S.days && S.days[ds] && S.days[ds].items && S.days[ds].items[id] && S.days[ds].items[id].v);
const touched = (S, ds) => !!(S.days && S.days[ds] && Object.values(S.days[ds].items || {}).some(x => x.v)) || (S.focus || []).some(f => f.d === ds);
const focusMins = (S, ds, before) => (S.focus || []).filter(f => f.d === ds && f.kind === 'study' && (before == null || f.sm < before)).reduce((a, f) => a + f.mins, 0);
const pledge = (S, ds) => S.days && S.days[ds] && S.days[ds].pledge;
const addDays = (ds, n) => { const d = new Date(ds + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const weekKey = ds => addDays(ds, -((new Date(ds + 'T00:00:00Z').getUTCDay() + 6) % 7));
function weekReport(S, wk, today) {
  const days = [...Array(7)].map((_, i) => addDays(wk, i)).filter(d => d <= today && d >= '2026-12-01');
  const avg = days.length ? Math.round(days.reduce((a, d) => a + score(S, d), 0) / days.length) : 0;
  const focus = (S.focus || []).filter(f => days.includes(f.d)).reduce((a, f) => a + f.mins, 0);
  let pl = 0, pk = 0; days.forEach(d => { const p = pledge(S, d); if (p) { pl += p.items.length; pk += p.items.filter(i => i.done).length; } });
  const pr = (S.practice || []).filter(p => days.includes(p.d)), q = pr.reduce((a, p) => a + p.n, 0), ok = pr.reduce((a, p) => a + p.sc, 0);
  const st = Object.assign({ thr: 60, allow: 2, amt: 0, to: '' }, (S.settings && S.settings.stake) || {});
  const misses = days.filter(d => d < today && score(S, d) < st.thr).length, rv = (S.reviews || {})[wk] || {};
  return [`Average day score: ${avg}/100`, `Verified focus: ${(focus / 60).toFixed(1)} hours`, `Pledges kept: ${pk}/${pl}`, `Aptitude practice: ${q} questions${q ? `, ${Math.round(100 * ok / q)}% right` : ''}`,
    `Days below ${st.thr}: ${misses}${st.amt ? (misses > st.allow ? ` (stake: owes ₹${st.amt} to ${st.to || 'you'})` : ' (no stake owed)') : ''}`, rv.change ? `His plan for next week: ${rv.change}` : 'He has not written his weekly review yet.'].join('\n');
}
async function mail(subject, text) {
  const { SMTP_USER, SMTP_PASS, PARTNER_EMAIL } = process.env; if (!SMTP_USER || !SMTP_PASS || !PARTNER_EMAIL) return false;
  if (DRY_RUN) { console.log('would email partner:', subject); if (process.env.SHOW_MAIL) console.log(text); return true; }
  const nodemailer = require('nodemailer');
  const t = nodemailer.createTransport({ service: 'gmail', auth: { user: SMTP_USER, pass: SMTP_PASS } });
  await t.sendMail({ from: `VIKRAM <${SMTP_USER}>`, to: PARTNER_EMAIL, subject, text }); return true;
}

function nudgesFor(S, ds) {
  const out = [];
  blocksFor(S, ds).forEach(b => { if (b.nudge) out.push({ at: b.s, title: b.t, body: b.nudge, tag: 'blk-' + b.s }); (b.extra || []).forEach(x => out.push({ at: x.at, title: b.t, body: x.msg, tag: 'x-' + x.at })); });
  // smart nudges (conditions checked at send time)
  out.push({ at: '07:20', title: 'Vikram', body: 'Your day is already planned. Open Vikram and tick the morning ritual.', tag: 'smart-open', cond: () => !touched(S, ds) });
  out.push({ at: '11:00', title: 'Deep block check', body: 'Study block 1 isn\'t ticked yet. 25 focused minutes still counts.', tag: 'smart-deep', cond: () => !ticked(S, ds, 'deep1') });
  out.push({ at: '09:30', title: 'Morning pledge', body: 'No pledge yet. Write the 3 outcomes that make today a win.', tag: 'smart-pledge', cond: () => !pledge(S, ds) });
  out.push({ at: '13:15', title: 'Verified minutes', body: 'Your morning has less than 45 verified focus minutes. Start a 25-minute timer before lunch ends.', tag: 'smart-focus', cond: () => dayType(S, ds) !== 'sunday' && focusMins(S, ds, 780) < 45 });
  out.push({ at: '20:30', title: 'Evening check', body: 'Tick your pledge. If something slipped, write one honest line about why.', tag: 'smart-eve', cond: () => { const p = pledge(S, ds); return p && p.items.some(i => !i.done) && !p.why; } });
  if (new Date(ds + 'T00:00:00Z').getUTCDay() === 0) out.push({ at: '20:45', title: 'Weekly review', body: 'Five minutes: look at the week\'s numbers and send the report to your partner.', tag: 'smart-review', cond: () => !((S.reviews || {})[weekKey(ds)]) });
  out.push({ at: '19:50', title: 'Minimum day', body: 'Low score today. Do the 3-task minimum: 5 sun salutations, one math sprint, 2 pages. Never miss twice.', tag: 'smart-min', cond: () => score(S, ds) < 40 });
  if (S.comeback && S.comeback.active) out.push({ at: '05:10', title: 'Welcome back', body: 'Comeback mode: just 3 tasks today. Start with the first one.', tag: 'smart-cb' });
  return out.filter(n => ds >= '2026-12-01');
}

(async () => {
  const now = NOW ? new Date(NOW) : new Date(), n = ist(now);
  const { json: S } = await getFile('state.json'); if (!S) { console.log('no state yet'); return; }
  const { json: log0, sha: logSha } = await getFile('push-log.json'); const log = log0 || {};
  const lastRun = log.lastRun ? new Date(log.lastRun) : new Date(now.getTime() - 16 * 60000);
  const from = new Date(Math.max(lastRun.getTime(), now.getTime() - 60 * 60000)); // never send anything older than 60 min
  const f = ist(from);
  const due = []; const days = f.date === n.date ? [n.date] : [f.date, n.date];
  days.forEach(ds => nudgesFor(S, ds).forEach(x => { const m = toMin(x.at); const lo = ds === f.date ? f.mins : -1, hi = ds === n.date ? n.mins : 1440; if (m > lo && m <= hi && (!x.cond || x.cond())) due.push(x); }));
  const subs = Object.entries(S.subs || {}).filter(([, v]) => v && v.sub && v.sub.endpoint);
  console.log(`window ${f.date} ${f.mins} → ${n.date} ${n.mins}: ${due.length} nudge(s), ${subs.length} device(s)`);
  // partner emails (optional: only if SMTP_USER, SMTP_PASS and PARTNER_EMAIL secrets exist)
  let mailed = false; const nm = (S.profile && S.profile.name) || 'Aryan', pn = process.env.PARTNER_NAME || 'there';
  try {
    const wk = weekKey(n.date);
    if (n.date >= '2026-12-06' && new Date(n.date + 'T00:00:00Z').getUTCDay() === 0 && n.mins >= 1290 && log.weeklySent !== wk) {
      if (await mail(`${nm}'s week on VIKRAM`, `Hi ${pn},\n\n${nm} asked VIKRAM to send you his numbers every Sunday so someone holds him to his plan.\n\n${weekReport(S, wk, n.date)}\n\nA one-line reply ("saw it, push harder on X") is all it takes.\n\nVIKRAM`)) { log.weeklySent = wk; mailed = true; }
    }
    const y1 = addDays(n.date, -1), y2 = addDays(n.date, -2);
    if (y2 >= '2026-12-01' && n.mins >= 720 && !touched(S, y1) && !touched(S, y2) && !touched(S, n.date) && log.silentSent !== y1) {
      if (await mail(`${nm} has gone quiet`, `Hi ${pn},\n\n${nm} hasn't logged anything in VIKRAM for two days (${y2} and ${y1}). He asked for you to be told when this happens.\n\nA short call or message today would help him restart. The rule is simple: never miss three days in a row.\n\nVIKRAM`)) { log.silentSent = y1; mailed = true; }
    }
  } catch (e) { console.log('mail error', e.message); }
  if (DRY_RUN) { due.forEach(d => console.log('  would send', d.at, d.title)); return; }
  if (!due.length && !mailed) return; // no write, keeps the data repo quiet
  if (!due.length) { log.lastRun = now.toISOString(); await putFile('push-log.json', log, logSha, 'nudger mail'); return; }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  const dead = [];
  for (const d of due) for (const [id, v] of subs) {
    try { await webpush.sendNotification(v.sub, JSON.stringify({ title: d.title, body: d.body, tag: d.tag, url: './#today' }), { TTL: 1800, urgency: 'high' }); }
    catch (e) { if (e.statusCode === 404 || e.statusCode === 410) dead.push(id); else console.log('push error', e.statusCode || e.message); }
  }
  log.lastRun = now.toISOString(); log.sent = (log.sent || 0) + due.length * subs.length; log.dead = [...new Set([...(log.dead || []), ...dead])];
  await putFile('push-log.json', log, logSha, 'nudger run');
})().catch(e => { console.log('nudger failed:', e.message); process.exit(1); });
