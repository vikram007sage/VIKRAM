/* VIKRAM · Bhagavad Gita. All 701 verses (this edition counts chapter 13 as 35 verses), bundled per chapter in gita/c<N>.js.
   Text data: github.com/gita/gita (released into the public domain by its maintainers). Translations: Shri Purohit Swami, Swami Sivananda.
   Commentary: Swami Sivananda. "In plain words" lines are VIKRAM's own explanations, not a translation. */
(function () {
  const X = window.VK_EXT = window.VK_EXT || { views: {}, binds: {}, acts: {}, tabs: [], boot: [] };
  X.boot = X.boot || []; X.tabs.push('gita');
  let K = null;
  const CH = [[1, "Arjun Viṣhād Yog", "Arjuna's Dilemma", "अर्जुनविषादयोग", 47], [2, "Sānkhya Yog", "Transcendental Knowledge", "सांख्ययोग", 72], [3, "Karm Yog", "Path of Selfless Service", "कर्मयोग", 43], [4, "Jñāna Karm Sanyās Yog", "Knowledge and the Discipline of Action", "ज्ञानकर्मसंन्यासयोग", 42], [5, "Karm Sanyās Yog", "Path of Renunciation", "कर्मसंन्यासयोग", 29], [6, "Dhyān Yog", "Path of Meditation", "ध्यानयोग", 47], [7, "Jñāna Vijñāna Yog", "Knowledge and Realisation", "ज्ञानविज्ञानयोग", 30], [8, "Akṣhar Brahma Yog", "The Imperishable Absolute", "अक्षरब्रह्मयोग", 28], [9, "Rāja Vidyā Yog", "The Royal Knowledge and Royal Secret", "राजविद्याराजगुह्ययोग", 34], [10, "Vibhūti Yog", "The Divine Glories", "विभूतियोग", 42], [11, "Viśhwarūp Darśhan Yog", "The Vision of the Cosmic Form", "विश्वरूपदर्शनयोग", 55], [12, "Bhakti Yog", "The Yoga of Devotion", "भक्तियोग", 20], [13, "Kṣhetra Kṣhetrajña Vibhāg Yog", "The Field and the Knower of the Field", "क्षेत्र-क्षेत्रज्ञविभागयोग", 35], [14, "Guṇa Traya Vibhāg Yog", "The Three Qualities of Nature", "गुणत्रयविभागयोग", 27], [15, "Puruṣhottam Yog", "The Supreme Person", "पुरुषोत्तमयोग", 20], [16, "Daivāsura Sampad Vibhāg Yog", "The Divine and the Demonic Natures", "दैवासुरसम्पद्विभागयोग", 24], [17, "Śhraddhā Traya Vibhāg Yog", "The Three Kinds of Faith", "श्रद्धात्रयविभागयोग", 28], [18, "Mokṣha Sanyās Yog", "Liberation through Renunciation", "मोक्षसंन्यासयोग", 78]];
  const INTRO = {
    1: "Two armies stand ready at Kurukshetra. Arjuna asks Krishna to drive his chariot between them, sees his teachers, cousins and friends on both sides, and breaks down. He drops his bow. The whole Gita is the answer to this moment.",
    2: "Krishna starts teaching, and this chapter is the Gita in miniature. You are not just the body; do your duty; work without clinging to results; and learn to stay steady in pleasure and pain.",
    3: "If knowledge is higher, why act at all? Because nobody can stay without acting even for a moment. So act, but as an offering, without selfish attachment, and set an example for others.",
    4: "Krishna says this teaching is ancient and that he comes whenever dharma declines. Action done with understanding does not bind you, and knowledge burns up doubt like fire burns wood.",
    5: "Giving up action or doing it selflessly: which is better? Both lead to the same place, but selfless action is easier. Be like the lotus leaf, in the water yet untouched by it.",
    6: "The practical chapter on meditation: how to sit, where to fix the mind, how to live moderately. The mind is restless like the wind, but practice and detachment can train it. No sincere effort is ever wasted.",
    7: "Krishna describes himself as the source of everything: the taste in water, the light in the sun and moon. Four kinds of people turn to him, and the wise one is dearest.",
    8: "What is Brahman, what is karma, and what happens at death? What you think of at the end is what you become, so remember the highest at all times and keep doing your work.",
    9: "The 'royal secret': the divine pervades everything, yet is not limited by it. Offer a leaf, a flower, a fruit or water with love and it is accepted. No one who is devoted is ever lost.",
    10: "Arjuna asks where he can see the divine in the world. Krishna lists his glories: the best of every kind. All of it is a spark of a single splendour.",
    11: "Arjuna asks to see it directly, and Krishna shows the cosmic form: all beings, all time, creation and destruction at once. Arjuna is awed and frightened, and asks for the gentle form again.",
    12: "Worship the formless or a personal God? Both work, but devotion to a form is easier for embodied beings. Then a portrait of the devotee Krishna loves: without hatred, friendly, calm, content.",
    13: "The body is the 'field', and the one who knows it is the 'knower of the field'. Knowledge here means humility, non-violence, honesty and steadiness. See the same Lord in all beings.",
    14: "Nature has three qualities. Sattva is clarity, rajas is restless drive, tamas is dullness. Everyone is a mix. Learn to notice which one is running you, and rise above all three.",
    15: "The world is pictured as an upside-down tree with roots above. Cut it with the axe of detachment. Beyond the perishable and the imperishable is the Supreme Person.",
    16: "Two kinds of nature. The divine: fearlessness, honesty, self-control, compassion. The demonic: arrogance, anger, cruelty, endless desire. Lust, anger and greed are called the three gates to ruin.",
    17: "Faith, food, sacrifice, discipline and giving each come in three kinds, following the three qualities. What you love and what you eat show what you are made of.",
    18: "The summary. Don't give up action; give up attachment to its fruit. Do your own duty, even imperfectly. Then the final word: let go of everything and take refuge in me; do not grieve. Arjuna picks up his bow: 'My doubts are gone.'"
  };
  const MOMENTS = { lazy: ['Lazy, putting it off', [[3, 8], [6, 5], [3, 19], [2, 47], [18, 48]]], anxious: ['Anxious about results', [[2, 48], [2, 14], [6, 35], [12, 15], [18, 66]]], angry: ['Angry', [[2, 62], [2, 63], [16, 21], [5, 23], [2, 56]]], afraid: ['Afraid to fail', [[2, 38], [2, 40], [6, 40], [2, 3], [18, 66]]], lost: ['Lost, confused', [[2, 7], [3, 35], [4, 34], [18, 63], [18, 73]]], distracted: ['Distracted', [[6, 26], [6, 35], [6, 6], [2, 67], [2, 58]]], grieving: ['Grieving', [[2, 11], [2, 13], [2, 20], [2, 22], [2, 27]]], proud: ['Proud, comparing', [[3, 27], [16, 4], [2, 71], [18, 26], [12, 13]]] };
  const XCH = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18]; // chapters that have gita/x<N>.js ("in plain words")
  const DATA = {}, WAIT = {}, XP = {};
  window.VK_GITA_LOAD = (n, d) => { DATA[n] = d; (WAIT[n] || []).forEach(f => f(true)); delete WAIT[n]; };
  window.VK_GITA_XLOAD = (n, d) => { XP[n] = d; };
  function script(src, bad, ok) { const s = document.createElement('script'); s.src = src; s.onload = () => ok && ok(); s.onerror = () => { s.remove(); bad && bad(); }; document.head.appendChild(s); }
  function load(n, cb) { if (DATA[n]) return cb(true); if (WAIT[n]) return WAIT[n].push(cb); WAIT[n] = [cb]; const main = () => script('gita/c' + n + '.js', () => { (WAIT[n] || []).forEach(f => f(false)); delete WAIT[n]; }); if (XCH.includes(n) && !XP[n]) script('gita/x' + n + '.js', main, main); else main(); }
  function plain(c, v) { const x = XP[c]; if (!x) return ''; if (x[v]) return x[v]; for (const k in x) { const m = k.split('-'); if (m.length === 2 && v >= +m[0] && v <= +m[1]) return x[k]; } return ''; }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // verse of the day: a fixed shuffle of every verse after the roll-call in 1.1–1.27, so the full Gita comes round in 674 days
  function votdRef(ds) { const dn = Math.floor(Date.parse(ds + 'T00:00:00Z') / 86400000); let i = ((dn * 263 + 111) % 674) + 27; for (const c of CH) { if (i < c[4]) return [c[0], i + 1]; i -= c[4]; } return [2, 47]; }
  const LSg = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  function votd(cb) { const ds = K ? K.nowIST().date : new Date().toISOString().slice(0, 10), c = LSg('vikram_votd'); if (c && c.ds === ds) return cb(c);
    const r = votdRef(ds); load(r[0], ok => { if (!ok) return cb(c || null); const v = DATA[r[0]][r[1] - 1], o = { ds, c: r[0], v: r[1], t: v[4] || v[5], sk: v[1] }; try { localStorage.setItem('vikram_votd', JSON.stringify(o)); } catch (e) { } cb(o); }); }
  const G = () => { const S = K.S(); S.gita = S.gita || {}; ['saved', 'read', 'notes', 'quiz'].forEach(k => S.gita[k] = S.gita[k] || {}); return S.gita; };
  const readN = c => { const r = G().read[c]; return r ? Math.min(r.m, CH[c - 1][4]) : 0; };
  const totalRead = () => CH.reduce((a, c) => a + readN(c[0]), 0);

  // ---------- home ----------
  X.views.gita = function () {
    const g = G(), v = LSg('vikram_votd'), p = g.pos || { c: 1, v: 1 }, tr = totalRead();
    const saved = Object.keys(g.saved).filter(k => g.saved[k].v).sort((a, b) => g.saved[b].ts - g.saved[a].ts);
    const notes = Object.keys(g.notes).filter(k => g.notes[k].t).sort((a, b) => g.notes[b].ts - g.notes[a].ts);
    return `<section class="hero small gita-hero"><div class="eyebrow">Bhagavad Gita · verse of the day${v ? ' · ' + v.c + '.' + v.v : ''}</div>
      <h1 class="gq">${v ? esc(v.t) : 'Loading today\'s verse…'}</h1>
      <div class="meta"><span class="pill"><span class="dot"></span>${tr} / 701 verses read</span><span class="pill">${saved.length} kept</span><span class="pill">${notes.length} reflections</span></div>
      ${v ? `<button class="btn" data-act="g-open" data-c="${v.c}" data-v="${v.v}" data-one="1">Open with meaning</button>` : ''}</section>
    <button class="card nextcard gcont" data-act="g-open" data-c="${p.c}" data-v="${p.v}"><span><b>${tr ? 'Continue' : 'Start'}: Chapter ${p.c}, verse ${p.v}</b><small>${esc(CH[p.c - 1][1])} · ${esc(CH[p.c - 1][2])}</small></span><span class="go">▶</span></button>
    <div class="card"><div class="eyebrow">A verse for this moment</div><p class="muted small">How are you right now? Five verses that speak to it.</p><div class="chips">${Object.keys(MOMENTS).map(k => `<button class="chip" data-act="g-moment" data-k="${k}">${MOMENTS[k][0]}</button>`).join('')}</div></div>
    <div class="eyebrow gsec">The 18 chapters</div>
    <div class="gch">${CH.map(c => { const n = readN(c[0]), q = g.quiz[c[0]]; return `<button class="gtile ${n >= c[4] ? 'done' : ''}" data-act="g-ch" data-c="${c[0]}"><span class="gn">${c[0]}</span><b>${esc(c[2])}</b><small>${esc(c[1])}</small><i><u style="width:${Math.round(100 * n / c[4])}%"></u></i><small class="muted">${n}/${c[4]}${q ? ' · quiz ' + q.best + '/' + q.of : ''}</small></button>`; }).join('')}</div>
    ${saved.length ? `<div class="card"><div class="row-between"><div class="eyebrow">Verses you kept</div><button class="btn sm" data-act="g-saved">Swipe through</button></div><div class="chips">${saved.slice(0, 40).map(k => { const r = k.split('.'); return `<button class="chip" data-act="g-open" data-c="${r[0]}" data-v="${r[1]}" data-one="1">${k}</button>`; }).join('')}</div></div>` : ''}
    ${notes.length ? `<div class="card"><div class="eyebrow">Your reflections</div>${notes.slice(0, 8).map(k => { const r = k.split('.'); return `<button class="gnote" data-act="g-open" data-c="${r[0]}" data-v="${r[1]}" data-one="1"><b>${k}</b> ${esc(g.notes[k].t)}</button>`; }).join('')}${notes.length > 8 ? `<p class="muted small">${notes.length - 8} more inside the verses.</p>` : ''}</div>` : ''}
    ${X.gitaExtra ? X.gitaExtra() : ''}
    <p class="muted small center">Translation: Shri Purohit Swami (1935). Second translation and commentary: Swami Sivananda. "In plain words" is VIKRAM's own explanation of every verse (some cover a group of verses), not a translation. Text data from the open gita/gita project. Full text works offline once a chapter has been opened. Opening photos: Wikimedia Commons, credited on each screen.</p>`;
  };
  X.binds.gita = function () { if (!LSg('vikram_votd') || LSg('vikram_votd').ds !== K.nowIST().date) votd(o => { if (o && K.tab() === 'gita') K.render(); }); };
  X.todayCard = function () { const v = LSg('vikram_votd'); if (!v || !K || v.ds !== K.nowIST().date) return ''; return `<button class="card gtoday" data-act="g-open" data-c="${v.c}" data-v="${v.v}" data-one="1"><div class="eyebrow">Gita · ${v.c}.${v.v}</div><p>${esc(v.t)}</p></button>`; };

  // ---------- player ----------
  const P = {
    list: [], i: 0, mode: 'ch',
    layer() { let l = document.getElementById('gl'); if (!l) { l = document.createElement('div'); l.id = 'gl'; l.className = 'gl'; document.body.appendChild(l); } return l; },
    open(list, i, mode, title) { this.list = list; this.i = Math.max(0, Math.min(i || 0, list.length - 1)); this.mode = mode || 'ch'; this.title = title || ''; this.layer().classList.add('show'); document.body.classList.add('noscroll'); this.show(); },
    close() { try { this.audio && this.audio.pause(); } catch (e) { } this.layer().classList.remove('show'); this.layer().innerHTML = ''; document.body.classList.remove('noscroll'); K.render(); },
    show() { const r = this.list[this.i], L = this.layer(); if (!DATA[r[0]]) { L.innerHTML = '<div class="gcard"><p class="gmsg">Opening chapter ' + r[0] + '…</p></div>'; return load(r[0], ok => { if (!ok) { L.innerHTML = '<div class="gcard"><p class="gmsg">This chapter isn\'t saved on this device yet. Open it once while online.</p><button class="btn" data-act="g-x">Close</button></div>'; return; } this.show(); }); }
      const c = r[0], n = r[1], v = DATA[c][n - 1], g = G(), key = c + '.' + n, ch = CH[c - 1], ex = plain(c, n), sv = g.saved[key] && g.saved[key].v, note = (g.notes[key] && g.notes[key].t) || '';
      if (this.mode === 'ch') { const rd = g.read[c]; if (!rd || rd.m < n) g.read[c] = { m: n, ts: K.ts() }; g.pos = { c, v: n, ts: K.ts() }; }
      const ds = K.nowIST().date, d = K.day(ds), seen = (this.seen = this.seen || {}); if (!seen[key]) { seen[key] = 1; d.gv = { n: ((d.gv && d.gv.n) || 0) + 1, ts: K.ts() }; } K.save();
      const first = this.mode === 'ch' && n === 1;
      L.innerHTML = `<div class="gtop"><button class="gx" data-act="g-x" aria-label="Close">✕</button><div><b>${this.mode === 'ch' ? 'Chapter ' + c + ' · ' + esc(ch[1]) : esc(this.title)}</b><small>${this.mode === 'ch' ? esc(ch[2]) : 'Chapter ' + c + ' · ' + esc(ch[2])}</small></div><span class="gcount">${this.i + 1}/${this.list.length}</span></div>
      <div class="gbar"><u style="width:${100 * (this.i + 1) / this.list.length}%"></u></div>
      <div class="gcard" id="gCard">
        ${first ? `<div class="gintro"><div class="eyebrow">Before you begin · chapter ${c}</div><p>${esc(INTRO[c])}</p></div>` : ''}
        <div class="gref">${c}.${n}</div>
        <div class="gsk" lang="sa">${esc(v[1]).replace(/\n/g, '<br>')}</div>
        <div class="gtl">${esc(v[2]).replace(/\n/g, '<br>')}</div>
        <div class="row center"><button class="btn sm ghost" data-act="g-chant">🔊 Sanskrit</button><button class="btn sm ghost" data-act="g-say">🔊 English</button></div>
        <p class="gen">${esc(v[4] || v[5])}</p><small class="gby">tr. Shri Purohit Swami</small>
        ${ex ? `<div class="gplain"><div class="eyebrow">In plain words</div><p>${esc(ex)}</p></div>` : ''}
        ${v[5] && v[4] ? `<details><summary>Another translation · Swami Sivananda</summary><p>${esc(v[5])}</p></details>` : ''}
        ${v[6] ? `<details ${ex ? '' : 'open'}><summary>Commentary · Swami Sivananda</summary><p>${esc(v[6])}</p></details>` : ''}
        <details><summary>Word by word</summary><p class="gwm">${esc(v[3]).split(';').map(w => { const m = w.split('—'); return m.length > 1 ? '<b>' + m[0].trim() + '</b> ' + m.slice(1).join('—').trim() : w; }).join(' · ')}</p></details>
        <label class="gnl"><span class="eyebrow">Your one line</span><textarea id="gNote" rows="2" placeholder="What does this verse say to you today?">${esc(note)}</textarea></label>
        <a class="lnk" href="https://www.gitasupersite.iitk.ac.in/srimad?language=dv&field_chapter_value=${c}&field_nsutra_value=${n}" target="_blank" rel="noopener">More commentaries · Gita Supersite, IIT Kanpur ↗</a>
      </div>
      <div class="gnav"><button class="btn ghost" data-act="g-prev" ${this.i ? '' : 'disabled'}>←</button><button class="btn gkeep ${sv ? 'on' : ''}" data-act="g-keep">${sv ? '♥ Kept' : '♡ Keep'}</button><button class="btn" data-act="g-next">${this.i < this.list.length - 1 ? 'Next →' : (this.mode === 'ch' ? 'Finish chapter' : 'Done')}</button></div>
      <p class="ghint">swipe left for next · swipe right to keep</p>`;
      const card = document.getElementById('gCard'); card.scrollTop = 0;
      const ta = document.getElementById('gNote'); ta.oninput = K.debounce(() => { G().notes[key] = { t: ta.value.trim(), ts: K.ts() }; K.save(); }, 500);
      let x0 = null, y0 = 0; card.ontouchstart = e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; };
      card.ontouchend = e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null; if (Math.abs(dx) < 60 || Math.abs(dx) < 1.5 * Math.abs(dy)) return; if (dx > 0) this.keep(true); this.next(); };
    },
    keep(force) { const r = this.list[this.i], key = r[0] + '.' + r[1], g = G(), on = force ? true : !(g.saved[key] && g.saved[key].v); g.saved[key] = { v: on, ts: K.ts() }; K.save(); if (force) K.toast('♥ Kept ' + key); else this.show(); },
    next() { if (this.i < this.list.length - 1) { this.i++; return this.show(); } if (this.mode === 'ch') return this.done(this.list[0][0]); this.close(); },
    prev() { if (this.i) { this.i--; this.show(); } },
    done(c) { const q = G().quiz[c], nx = c < 18 ? c + 1 : null;
      this.layer().innerHTML = `<div class="gcard gdone"><div class="sp-om">ॐ</div><h2>Chapter ${c} complete</h2><p>${esc(CH[c - 1][2])} · ${CH[c - 1][4]} verses</p><p class="muted">${totalRead()} of 701 verses read.</p>
        <button class="btn" data-act="g-quiz" data-c="${c}">Play the chapter quiz${q ? ' (best ' + q.best + '/' + q.of + ')' : ''}</button>
        ${nx ? `<button class="btn ghost" data-act="g-ch" data-c="${nx}">Next: chapter ${nx} · ${esc(CH[nx - 1][2])}</button>` : '<p>You have read the whole Gita. Start again; it reads differently the second time.</p>'}
        <button class="btn ghost" data-act="g-x">Close</button></div>`; },
    chant() { const r = this.list[this.i]; try { this.audio && this.audio.pause(); this.audio = new Audio('https://raw.githubusercontent.com/gita/gita/main/data/verse_recitation/' + r[0] + '/' + r[1] + '.mp3'); this.audio.play().catch(() => K.toast('Recitation needs internet')); } catch (e) { K.toast('Recitation needs internet'); } },
    say() { const r = this.list[this.i], v = DATA[r[0]][r[1] - 1]; try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(v[4] || v[5]); u.lang = 'en-IN'; u.rate = 0.9; speechSynthesis.speak(u); } catch (e) { K.toast('Audio not supported here'); } }
  };

  // ---------- chapter quiz: who is speaking + what does this word mean (built from the text itself) ----------
  const SPK = [['धृतराष्ट्र', 'Dhritarashtra'], ['सञ्जय', 'Sanjaya'], ['संजय', 'Sanjaya'], ['अर्जुन', 'Arjuna'], ['भगवान', 'Krishna']];
  function speakers(c) { let cur = null; return DATA[c].map(v => { const l = v[1].split('\n').find(x => x.includes('उवाच')); if (l) { const s = SPK.find(p => l.includes(p[0])); if (s) cur = s[1]; } return cur; }); }
  const shuf = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
  const Q = {
    start(c) { load(c, ok => { if (!ok) return K.toast('Open the chapter once while online'); const V = DATA[c], sp = speakers(c), who = [...new Set(sp.filter(Boolean))];
        const words = []; V.forEach(v => v[3].split(';').forEach(w => { const m = w.split('—'); if (m.length === 2 && m[0].trim().length > 3 && m[1].trim().length > 2 && m[1].trim().length < 40) words.push([m[0].trim(), m[1].trim()]); }));
        const qs = []; const pickV = shuf(V.map((v, i) => i)).slice(0, 12);
        if (who.length > 1) pickV.slice(0, 3).forEach(i => { if (sp[i]) qs.push({ q: 'Who is speaking?', ctx: c + '.' + (i + 1) + ' · “' + (V[i][4] || V[i][5]) + '”', o: shuf(['Krishna', 'Arjuna', 'Sanjaya', 'Dhritarashtra']), a: sp[i] }); });
        pickV.slice(3, 6).forEach(i => { const others = shuf(CH.filter(x => x[0] !== c)).slice(0, 3).map(x => x[2]); qs.push({ q: 'Which chapter is this verse from?', ctx: '“' + (V[i][4] || V[i][5]) + '”', o: shuf(others.concat(CH[c - 1][2])), a: CH[c - 1][2] }); });
        shuf(words).slice(0, 8 - Math.min(qs.length, 5)).forEach(w => { const wrong = shuf(words.filter(x => x[1] !== w[1])).slice(0, 3).map(x => x[1]); if (wrong.length === 3) qs.push({ q: 'What does “' + w[0] + '” mean?', ctx: 'From chapter ' + c, o: shuf(wrong.concat(w[1])), a: w[1] }); });
        this.c = c; this.qs = shuf(qs).slice(0, 8); this.i = 0; this.ok = 0; P.layer().classList.add('show'); document.body.classList.add('noscroll'); this.show(); }); },
    show() { const q = this.qs[this.i]; if (!q) { const g = G(), b = g.quiz[this.c]; if (!b || this.ok > b.best) g.quiz[this.c] = { best: this.ok, of: this.qs.length, ts: K.ts() }; K.save();
        P.layer().innerHTML = `<div class="gcard gdone"><div class="sp-om">ॐ</div><h2>${this.ok} / ${this.qs.length}</h2><p>Chapter ${this.c} quiz</p><button class="btn" data-act="g-quiz" data-c="${this.c}">Play again</button><button class="btn ghost" data-act="g-x">Close</button></div>`; return; }
      P.layer().innerHTML = `<div class="gtop"><button class="gx" data-act="g-x">✕</button><div><b>Chapter ${this.c} quiz</b><small>${this.i + 1} of ${this.qs.length} · ${this.ok} right</small></div><span></span></div><div class="gcard"><p class="gctx">${esc(q.ctx)}</p><h2 class="gqq">${esc(q.q)}</h2><div class="opts">${q.o.map((o, i) => `<button class="opt" data-act="g-ans" data-i="${i}">${esc(o)}</button>`).join('')}</div></div>`; },
    ans(i, el) { const q = this.qs[this.i]; if (this.lock) return; this.lock = true; const right = q.o[i] === q.a; if (right) this.ok++; el.classList.add(right ? 'right' : 'wrong'); if (!right) document.querySelectorAll('#gl .opt').forEach((b, k) => { if (q.o[k] === q.a) b.classList.add('right'); }); setTimeout(() => { this.lock = false; this.i++; this.show(); }, right ? 600 : 1500); }
  };

  const chList = c => Array.from({ length: CH[c - 1][4] }, (_, i) => [c, i + 1]);
  Object.assign(X.acts, {
    'g-open'(a) { const c = +a.dataset.c, v = +a.dataset.v; if (a.dataset.one) P.open([[c, v]].concat(chList(c).slice(v)), 0, 'list', 'Verse ' + c + '.' + v + ' onwards'); else P.open(chList(c), v - 1, 'ch'); },
    'g-ch'(a) { const c = +a.dataset.c, n = readN(c); P.open(chList(c), n >= CH[c - 1][4] ? 0 : n, 'ch'); },
    'g-moment'(a) { const m = MOMENTS[a.dataset.k]; P.open(m[1], 0, 'list', m[0]); },
    'g-saved'() { const g = G(); P.open(Object.keys(g.saved).filter(k => g.saved[k].v).map(k => k.split('.').map(Number)), 0, 'list', 'Verses you kept'); },
    'g-x'() { P.close(); }, 'g-next'() { P.next(); }, 'g-prev'() { P.prev(); }, 'g-keep'() { P.keep(); }, 'g-chant'() { P.chant(); }, 'g-say'() { P.say(); },
    'g-quiz'(a) { Q.start(+a.dataset.c); }, 'g-ans'(a) { Q.ans(+a.dataset.i, a); }
  });
  X.gita = { votd, votdRef, load, data: DATA, CH, card(cb) { votd(cb); } };

  // ---------- opening scene ----------
  const ART = [
    { src: 'gita/img/s1.jpg', line: 'STILL MIND. LOUD RESULTS.', credit: 'Adiyogi Shiva · photo: Anu 21 Anusha, CC0', pos: '50% 35%' },
    { src: 'gita/img/s2.jpg', line: 'STRENGTH WITH DEVOTION.', credit: 'Hanuman statue · photo: Harshakamanuru, CC BY-SA 4.0', pos: '50% 30%' },
    { src: 'gita/img/s3.jpg', line: 'EARN IT.', credit: 'Lamborghini Aventador SVJ · photo: Alexander-93, CC BY-SA 4.0', pos: '45% 50%' },
    { src: 'gita/img/s4.jpg', line: 'WORK NOW. DRIVE LATER.', credit: 'Porsche 911 GT3 RS · photo: Alexander-93, CC BY-SA 4.0', pos: '55% 50%' },
    { src: 'gita/img/s5.jpg', line: 'FAST IS BUILT SLOWLY.', credit: 'Kawasaki Ninja H2 · photo: Rainmaker47, CC BY-SA 4.0', pos: '50% 60%' },
    { src: 'gita/img/s6.jpg', line: 'LADAKH IS WAITING.', credit: 'Royal Enfield on the road · photo: Chris Hunkeler, CC BY-SA 2.0', pos: '30% 50%' },
    { src: 'gita/img/s7.jpg', line: 'AIM HIGHER.', credit: 'Milky Way over the Matterhorn · photo: Giles Laurent, CC BY-SA 4.0', pos: '50% 60%' },
    { src: 'gita/img/s8.jpg', line: 'GO SEE IT.', credit: 'Northern lights, Mývatn, Iceland · photo: Giles Laurent, CC BY-SA 4.0', pos: '45% 50%' },
    { src: 'gita/img/s9.jpg', line: 'THE WORLD IS BIG. GET OUT THERE.', credit: 'Kabukicho, Tokyo · photo: Basile Morin, CC BY-SA 4.0', pos: '50% 40%' },
    { src: 'gita/img/s10.jpg', line: 'SMALL TENT. BIG SKY.', credit: 'Milky Way at Elbrus · photo: oliwok, CC BY 4.0', pos: '50% 70%' },
    { src: 'gita/img/s11.jpg', line: 'A YEAR OF TRAVEL. PAY FOR IT NOW.', credit: 'Oia, Santorini · photo: Giles Laurent, CC BY-SA 4.0', pos: '70% 50%' },
    { src: 'gita/img/s12.jpg', line: 'CLIMB.', credit: 'Matterhorn at sunset · photo: Sam Ferrara, CC0', pos: '55% 50%' }
  ];
  function splash() {
    const el = document.getElementById('splash'); if (!el) return; const q = new URLSearchParams(location.search);
    if ((q.get('test') && !q.get('splash')) || sessionStorage.getItem('vk_splash')) { el.remove(); return; }
    try { sessionStorage.setItem('vk_splash', '1'); } catch (e) { }
    const n = (+localStorage.getItem('vk_splash_n') || 0) + 1; try { localStorage.setItem('vk_splash_n', n); } catch (e) { }
    if (ART.length) { const a = ART[n % ART.length]; const im = document.getElementById('spImg'); im.style.backgroundImage = 'url(' + a.src + ')'; im.style.backgroundPosition = a.pos; document.getElementById('spL').textContent = a.line; document.getElementById('spC').textContent = a.credit; }
    el.classList.add('show'); let gone = false; const bye = () => { if (gone) return; gone = true; el.classList.add('bye'); setTimeout(() => el.remove(), 600); };
    el.onclick = bye; const fill = o => { if (!o) return; document.getElementById('spQ').textContent = o.t; document.getElementById('spR').textContent = 'Bhagavad Gita ' + o.c + '.' + o.v; };
    fill(LSg('vikram_votd')); votd(fill); setTimeout(bye, 6000);
  }
  X.boot.push(kit => { K = kit; splash(); votd(o => { if (o && (K.tab() === 'today' || K.tab() === 'gita')) K.render(); }); });
})();
