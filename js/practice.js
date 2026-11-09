/* VIKRAM practice engine: parametric generators, so every set is fresh and every answer is computed (never typed by hand).
   Works in browser (window.VK_PRACTICE) and Node (module.exports) for automated answer checks. */
var VK_PRACTICE = (function () {
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
  const lcm = (a, b) => a / gcd(a, b) * b;
  const fact = n => n <= 1 ? 1 : n * fact(n - 1);
  const C = (n, k) => k < 0 || k > n ? 0 : Math.round(fact(n) / (fact(k) * fact(n - k)));
  const frac = (p, q) => { const g = gcd(p, q); return `${p / g}/${q / g}`; };
  const fmt = x => Number.isInteger(x) ? x.toLocaleString('en-IN') : (+x.toFixed(2)).toLocaleString('en-IN');
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // Build an MCQ: correct value + candidate distractors; dedupes and pads so there are always 4 distinct options.
  function mk(t, q, correct, distract, exp, opts = {}) {
    const show = opts.show || (v => typeof v === 'number' ? fmt(v) + (opts.unit || '') : String(v));
    const seen = new Set([show(correct)]); const outs = [];
    for (const d of distract) { const s = show(d); if (!seen.has(s) && (typeof d !== 'number' || isFinite(d))) { seen.add(s); outs.push(s); } if (outs.length === 3) break; }
    let k = 1; while (outs.length < 3 && typeof correct === 'number') { const v = correct === 0 ? (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 10 : correct * (1 + 0.1 * k * (k % 2 ? 1 : -1)); const s = show(Number.isInteger(correct) ? Math.round(v) : +v.toFixed(2)); if (!seen.has(s)) { seen.add(s); outs.push(s); } k++; if (k > 20) break; }
    const all = shuffle([show(correct), ...outs]);
    return { t, q, opts: all, a: all.indexOf(show(correct)), exp, ctx: opts.ctx || null };
  }

  const G = {
    pct_of() { const x = pick([5, 12.5, 15, 16, 20, 25, 35, 40, 45, 60, 75]); const N = pick([80, 120, 160, 240, 320, 360, 480, 640, 720, 960]); const a = N * x / 100;
      return mk('Percentages', `${x}% of ${N} = ?`, a, [N * x / 10, N * (100 - x) / 100, a + N / 20], `${x}% of ${N} = ${N} × ${x}/100 = ${fmt(a)}. Tip: x% of y = y% of x.`); },
    succ() { const a = pick([10, 20, 25, 30, 40, 50]), b = pick([10, 20, 25, 30, 40]), up = Math.random() < .5; const net = ((1 + a / 100) * (1 - b / 100) - 1) * 100; const n2 = +net.toFixed(2);
      const q = up ? `A price rises ${a}% and then falls ${b}%. Net change?` : `Sales fall ${b}% after a ${a}% rise the year before. Net change over two years?`;
      return mk('Successive change', q, n2, [a - b, -(a * b / 100), a + b - a * b / 100], `(1 + ${a}/100)(1 − ${b}/100) − 1 = ${(1 + a / 100).toFixed(2)} × ${(1 - b / 100).toFixed(2)} − 1 = ${n2}%. Shortcut: a − b − ab/100.`, { unit: '%', show: v => (v > 0 ? '+' : '') + fmt(v) + '%' }); },
    reverse() { const x = pick([10, 20, 25, 40, 50]); const orig = pick([200, 400, 600, 800, 1200, 1600]); const P = orig * (1 + x / 100);
      return mk('Percentages', `After a ${x}% increase, a price is ₹${fmt(P)}. Original price?`, orig, [P * (1 - x / 100), P - x, orig * 1.1], `Original = ${fmt(P)} ÷ ${1 + x / 100} = ₹${fmt(orig)}. Never subtract ${x}% of the new price.`, { show: v => '₹' + fmt(Math.round(v)) }); },
    profit() { const m = pick([20, 25, 40, 50, 60]), d = pick([10, 20, 25]); const p = +(((1 + m / 100) * (1 - d / 100) - 1) * 100).toFixed(2);
      return mk('Profit & loss', `A shopkeeper marks goods ${m}% above cost and gives a ${d}% discount. Profit %?`, p, [m - d, m - d - 2, m * (1 - d / 100)], `Selling price = cost × ${1 + m / 100} × ${1 - d / 100} = cost × ${((1 + m / 100) * (1 - d / 100)).toFixed(3)} → ${p}% profit.`, { show: v => fmt(v) + '%' }); },
    si() { const P = pick([5000, 8000, 10000, 12000, 15000, 20000]), r = pick([5, 6, 8, 10, 12]), t = pick([2, 3, 4, 5]); const a = P * r * t / 100;
      return mk('Interest', `Simple interest on ₹${fmt(P)} at ${r}% p.a. for ${t} years?`, a, [P * r / 100, a + P * r / 100, P * (Math.pow(1 + r / 100, t) - 1)], `SI = P × r × t / 100 = ${fmt(P)} × ${r} × ${t} / 100 = ₹${fmt(a)}.`, { show: v => '₹' + fmt(Math.round(v)) }); },
    ci() { const P = pick([10000, 20000, 5000, 8000]), r = pick([10, 20]); const a = Math.round(P * (Math.pow(1 + r / 100, 2) - 1));
      return mk('Interest', `Compound interest on ₹${fmt(P)} at ${r}% p.a. for 2 years (compounded yearly)?`, a, [P * r * 2 / 100, a + P / 100, Math.round(P * Math.pow(1 + r / 100, 2))], `CI = P[(1 + r)² − 1] = ${fmt(P)} × ${((1 + r / 100) ** 2 - 1).toFixed(2)} = ₹${fmt(a)}. Two-year CI = SI + interest on the first year's interest.`, { show: v => '₹' + fmt(Math.round(v)) }); },
    ratio() { const a = R(2, 7), b = R(2, 9), c = R(1, 6); const k = R(5, 30); const T = (a + b + c) * k; const big = Math.max(a, b, c) * k;
      return mk('Ratios', `₹${fmt(T)} is split in the ratio ${a} : ${b} : ${c}. The largest share?`, big, [T / 3, Math.min(a, b, c) * k, big + k], `Each part = ${fmt(T)} ÷ ${a + b + c} = ${k}. Largest = ${Math.max(a, b, c)} × ${k} = ₹${fmt(big)}.`, { show: v => '₹' + fmt(Math.round(v)) }); },
    avg() { const n = R(5, 12), A = R(20, 60), B = A - R(1, 4); const x = n * A - (n - 1) * B;
      return mk('Averages', `The average of ${n} numbers is ${A}. Removing one number makes the average of the rest ${B}. Which number was removed?`, x, [A + (A - B), x - (A - B), A * 2], `Removed = total before − total after = ${n}×${A} − ${n - 1}×${B} = ${n * A} − ${(n - 1) * B} = ${x}.`); },
    avgspeed() { const [u, v, ans] = pick([[40, 60, 48], [30, 60, 40], [60, 90, 72], [20, 30, 24], [45, 90, 60], [36, 45, 40]]);
      return mk('Time, speed, distance', `You go to a place at ${u} km/h and return the same way at ${v} km/h. Average speed for the round trip?`, ans, [(u + v) / 2, ans + 2, ans - 3], `Equal distances → harmonic mean: 2uv/(u+v) = 2×${u}×${v}/${u + v} = ${ans} km/h. The plain average (${(u + v) / 2}) is the classic trap.`, { unit: ' km/h' }); },
    train() { const s = pick([36, 54, 72, 90, 108]), ms = s * 5 / 18, t = R(6, 20), L = ms * t;
      return mk('Time, speed, distance', `A ${fmt(L)} m long train runs at ${s} km/h. Time to cross a pole?`, t, [L / s, t + 2, Math.round(L / (s / 3.6 * 1.2))], `${s} km/h × 5/18 = ${ms} m/s. Time = ${fmt(L)} ÷ ${ms} = ${t} s.`, { unit: ' s' }); },
    work() { const [a, b, ans] = pick([[10, 15, 6], [12, 24, 8], [20, 30, 12], [6, 12, 4], [18, 36, 12], [15, 30, 10], [12, 36, 9], [8, 24, 6]]);
      return mk('Time & work', `A finishes a job in ${a} days, B in ${b} days. Working together?`, ans, [(a + b) / 2, a - 2, ans + 2], `Rates add: 1/${a} + 1/${b} = 1/${ans} → ${ans} days. (Product over sum: ${a}×${b}/${a + b}.)`, { unit: ' days' }); },
    mixture() { const p1 = pick([20, 30, 40, 60]), p2 = p1 + pick([20, 30, 40, 60]); const pm = p1 + R(1, (p2 - p1) / 10 - 1) * 10; const x = p2 - pm, y = pm - p1, g = gcd(x, y);
      return mk('Mixtures', `In what ratio must tea at ₹${p1}/kg be mixed with tea at ₹${p2}/kg to get a mix worth ₹${pm}/kg?`, `${x / g} : ${y / g}`, [`${y / g} : ${x / g}`, `${p1 / gcd(p1, p2)} : ${p2 / gcd(p1, p2)}`, `1 : 1`, `${x / g + 1} : ${y / g}`, `${x / g} : ${y / g + 1}`, `1 : 2`, `2 : 1`, `2 : 3`, `3 : 2`], `Alligation: cheap : dear = (${p2} − ${pm}) : (${pm} − ${p1}) = ${x} : ${y} = ${x / g} : ${y / g}.`); },
    hcf() { const g = pick([4, 6, 8, 9, 12, 14, 15]), a = g * pick([2, 3, 5, 7]), b = g * pick([4, 9, 11, 13]); const H = gcd(a, b), L = lcm(a, b);
      return Math.random() < .5 ? mk('Numbers', `HCF of ${a} and ${b}?`, H, [g * 2, Math.min(a, b) / 2, 2], `Factor both: the largest common factor is ${H}.`) : mk('Numbers', `LCM of ${a} and ${b}?`, L, [a * b, L / 2, L * 2], `LCM = a×b ÷ HCF = ${a}×${b} ÷ ${H} = ${L}.`); },
    remainder() { const [base, m] = pick([[2, 7], [3, 7], [7, 5], [3, 5], [2, 5], [4, 7]]); const n = R(20, 99); let r = 1; for (let i = 0; i < n; i++) r = r * base % m;
      const cyc = []; let x = 1; do { x = x * base % m; cyc.push(x); } while (x !== 1 && cyc.length < 10);
      return mk('Numbers', `Remainder when ${base}^${n} is divided by ${m}?`, r, [0, (r + 1) % m, (r + 2) % m, m - 1], `Powers of ${base} mod ${m} repeat with cycle [${cyc.join(', ')}] (length ${cyc.length}). ${n} mod ${cyc.length} = ${n % cyc.length || cyc.length} → remainder ${r}.`); },
    arrange() { const [w, ans, how] = pick([['LEVEL', 30, '5!/(2!·2!)'], ['APPLE', 60, '5!/2!'], ['BANANA', 60, '6!/(3!·2!)'], ['COFFEE', 180, '6!/(2!·2!)'], ['SUCCESS', 420, '7!/(3!·2!)'], ['KHARAGPUR', 90720, '9!/(2!·2!)'], ['VIKRAM', 720, '6!']]);
      return mk('P&C', `In how many ways can the letters of ${w} be arranged?`, ans, [fact(w.length), ans / 2, ans * 2], `${w.length} letters with repeats: ${how} = ${fmt(ans)}.`); },
    choose() { const n = R(4, 7), m = R(3, 5), k = R(3, 4); const ans = C(n + m, k) - C(n, k);
      return mk('P&C', `A ${k}-member committee is chosen from ${n} men and ${m} women. How many committees have at least one woman?`, ans, [C(n + m, k), C(m, 1) * C(n + m - 1, k - 1), C(n + m, k) - C(m, k)], `Total − all-men = C(${n + m},${k}) − C(${n},${k}) = ${C(n + m, k)} − ${C(n, k)} = ${ans}. ("At least one" → use the complement.)`); },
    dice() { const s = R(3, 11); let c = 0; for (let i = 1; i <= 6; i++) for (let j = 1; j <= 6; j++) if (i + j === s) c++;
      return mk('Probability', `Two fair dice are rolled. P(sum = ${s})?`, frac(c, 36), [frac(c + 1, 36), frac(1, 6), frac(c, 12), frac(Math.max(c - 1, 1), 36), frac(c + 2, 36), frac(1, 9), frac(5, 36), frac(1, 12)], `Favourable pairs: ${c} out of 36 → ${frac(c, 36)}. Sum 7 is the most likely (6/36).`); },
    atleast() { const n = R(2, 6); const p = Math.pow(2, n);
      return mk('Probability', `A fair coin is tossed ${n} times. P(at least one head)?`, frac(p - 1, p), [frac(1, p), frac(n, p), '1/2', frac(p - 2, p), frac(n, n + 1), frac(p - 1, 2 * p), '3/4', '7/8'], `Complement: 1 − P(no heads) = 1 − (1/2)^${n} = ${frac(p - 1, p)}.`); },
    urn() { const r = R(3, 7), b = R(2, 6); const num = C(r, 2), den = C(r + b, 2);
      return mk('Probability', `A bag has ${r} red and ${b} blue balls. Two are drawn without replacement. P(both red)?`, frac(num, den), [frac(r * r, (r + b) * (r + b)), frac(r, r + b), frac(num, den * 2)], `C(${r},2)/C(${r + b},2) = ${num}/${den} = ${frac(num, den)}. Equivalent: (${r}/${r + b}) × (${r - 1}/${r + b - 1}).`); },
    cards() { const v = pick([['both cards are aces', '1/221', '(4/52)(3/51)', ['1/169', '1/26', '2/221']], ['both cards are hearts', '1/17', '(13/52)(12/51)', ['1/16', '1/4', '3/52']], ['both cards are the same suit', '4/17', '(12/51) for the second card', ['1/4', '1/17', '3/13']], ['at least one card is a king', '33/221', '1 − (48/52)(47/51)', ['2/13', '1/13', '1/221']]]);
      return mk('Probability', `Two cards are drawn from a 52-card deck without replacement. P(${v[0]})?`, v[1], v[3], `${v[2]} = ${v[1]}.`); },
    ev() { const k = pick([10, 20, 30]), c = pick([10, 15, 20, 25]); const ev = (2 + 4 + 6) * k / 6 - c / 2;
      return mk('Expected value', `Roll a die. Even face: you win ₹(face × ${k}). Odd face: you pay ₹${c}. Expected value per roll?`, ev, [3.5 * k - c, ev + c / 2, (2 + 4 + 6) * k / 3 - c], `E = (1/6)(2+4+6)×${k} − (1/2)×${c} = ${fmt((2 + 4 + 6) * k / 6)} − ${fmt(c / 2)} = ₹${fmt(ev)}. Positive EV → take the bet (if you can survive the variance).`, { show: v => '₹' + fmt(v) }); },
    breakeven() { const F = pick([60000, 120000, 240000, 90000, 150000]), p = pick([500, 800, 1000, 1200]), v = p - pick([100, 200, 250, 300, 400]); const u = F / (p - v);
      return mk('Business maths', `Fixed costs ₹${fmt(F)}/month, price ₹${p}, variable cost ₹${v} per unit. Break-even units per month?`, Math.ceil(u), [Math.ceil(F / p), Math.ceil(F / v), Math.ceil(u * 1.5)], `Break-even = fixed ÷ contribution per unit = ${fmt(F)} ÷ (${p} − ${v}) = ${fmt(+u.toFixed(1))} → ${Math.ceil(u)} units.`); },
    payback() { const cac = pick([1200, 1500, 2000, 2400, 3000]), m = pick([100, 150, 200, 250]); const mo = cac / m;
      return mk('Business maths', `A credit-card issuer spends ₹${fmt(cac)} to acquire a customer, who brings ₹${m}/month in net margin. CAC payback period?`, +mo.toFixed(1), [mo * 2, mo / 2, mo + 6], `Payback = CAC ÷ monthly margin = ${fmt(cac)} ÷ ${m} = ${fmt(+mo.toFixed(1))} months. Capital One-style cases love this.`, { show: v => fmt(+(+v).toFixed(1)) + ' months' }); },
    interchange() { const spend = pick([20, 40, 50, 80, 120]), r = pick([1.5, 1.8, 2, 2.5]); const rev = spend * r / 100;
      return mk('Business maths', `Customers spend ₹${spend} crore a month on a card; the issuer earns ${r}% interchange. Monthly interchange revenue?`, rev, [spend * r / 10, spend * r, rev * 12], `${spend} crore × ${r}% = ₹${fmt(rev)} crore (= ₹${fmt(rev * 100)} lakh).`, { show: v => '₹' + fmt(v) + ' cr' }); }
  };
  const QA_KEYS = ['pct_of', 'succ', 'reverse', 'profit', 'si', 'ci', 'ratio', 'avg', 'avgspeed', 'train', 'work', 'mixture', 'hcf', 'remainder', 'breakeven', 'payback', 'interchange'];
  const PROB_KEYS = ['arrange', 'choose', 'dice', 'atleast', 'urn', 'cards', 'ev'];

  // ---- Data interpretation: a fresh table, five computed questions ----
  function diSet() {
    const cos = shuffle(['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon']).slice(0, 5), yrs = ['FY23', 'FY24', 'FY25'];
    const data = cos.map(() => { const base = R(12, 60) * 10; return [base, Math.round(base * (1 + R(-15, 40) / 100) / 10) * 10, 0]; });
    data.forEach(r => r[2] = Math.round(r[1] * (1 + R(-10, 45) / 100) / 10) * 10);
    const tot = i => data.reduce((a, r) => a + r[i], 0);
    const table = `<table class="di"><tr><th>Revenue (₹ cr)</th>${yrs.map(y => `<th>${y}</th>`).join('')}</tr>${cos.map((c, i) => `<tr><td>${c}</td>${data[i].map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}<tr><td><b>Total</b></td>${[0, 1, 2].map(i => `<td><b>${tot(i)}</b></td>`).join('')}</tr></table>`;
    const i1 = R(0, 4), g = (data[i1][2] - data[i1][0]) / data[i1][0] * 100;
    const growths = data.map(r => (r[2] - r[0]) / r[0]); const best = growths.indexOf(Math.max(...growths));
    const i2 = R(0, 4), share = data[i2][1] / tot(1) * 100;
    const ratio = tot(2) / tot(0); const avg24 = tot(1) / 5;
    let [a, b] = [R(0, 4), R(0, 4)]; if (a === b) b = (a + 1) % 5; const diff = data[a][2] - data[b][2];
    const p1 = v => (+v).toFixed(1) + '%';
    const qs = [
      mk('Data interpretation', `By what % did ${cos[i1]}'s revenue change from FY23 to FY25?`, +g.toFixed(1), [+((data[i1][2] - data[i1][1]) / data[i1][1] * 100).toFixed(1), +((data[i1][2] - data[i1][0]) / data[i1][2] * 100).toFixed(1), +(g + 5).toFixed(1)], `(${data[i1][2]} − ${data[i1][0]}) ÷ ${data[i1][0]} × 100 = ${g.toFixed(1)}%. Always divide by the starting year.`, { show: p1, ctx: table }),
      mk('Data interpretation', `Which company grew fastest (in %) from FY23 to FY25?`, cos[best], cos.filter((_, i) => i !== best), `Growth: ${cos.map((c, i) => `${c} ${(growths[i] * 100).toFixed(0)}%`).join(', ')}. Highest: ${cos[best]}. Absolute growth and % growth often point to different companies.`, { ctx: table }),
      mk('Data interpretation', `${cos[i2]}'s share of total FY24 revenue is closest to:`, +share.toFixed(1), [+(data[i2][2] / tot(2) * 100).toFixed(1), +(share * 1.15).toFixed(1), +(share * 0.85).toFixed(1)], `${data[i2][1]} ÷ ${tot(1)} × 100 = ${share.toFixed(1)}%.`, { show: p1, ctx: table }),
      mk('Data interpretation', `Ratio of total FY25 revenue to total FY23 revenue?`, +ratio.toFixed(2), [+(tot(1) / tot(0)).toFixed(2), +(tot(0) / tot(2)).toFixed(2), +(ratio + 0.1).toFixed(2)], `${tot(2)} ÷ ${tot(0)} = ${ratio.toFixed(2)}.`, { show: v => (+v).toFixed(2), ctx: table }),
      Math.random() < .5 ? mk('Data interpretation', `Average FY24 revenue per company (₹ cr)?`, avg24, [tot(2) / 5, tot(1) / 4, avg24 + 10], `${tot(1)} ÷ 5 = ${avg24}.`, { ctx: table })
        : mk('Data interpretation', `FY25 revenue of ${cos[a]} minus ${cos[b]} (₹ cr)?`, diff, [data[a][1] - data[b][1], -diff, diff + 20], `${data[a][2]} − ${data[b][2]} = ${diff}.`, { ctx: table })
    ];
    return qs;
  }

  function gen(keys, n) { const out = [], used = new Map(); for (let i = 0; i < n; i++) { let k = keys[i % keys.length]; if (i >= keys.length) k = pick(keys); out.push(G[k]()); } return shuffle(out); }
  const MODES = {
    qa: { title: 'Quant aptitude', n: 10, secs: 15 * 60, make: () => gen(QA_KEYS, 10), hint: 'CAT / OA style. ~90 s per question.' },
    prob: { title: 'Probability + P&C', n: 10, secs: 15 * 60, make: () => gen(PROB_KEYS, 10), hint: 'Analyst and quant interviews.' },
    di: { title: 'Data interpretation', n: 10, secs: 12 * 60, make: () => diSet().concat(diSet()), hint: 'Capital One-style: two tables, five questions each.' },
    mock: { title: 'Mini OA mock', n: 20, secs: 25 * 60, make: () => shuffle(gen(QA_KEYS, 10).concat(gen(PROB_KEYS, 5))).concat(diSet()), hint: '20 questions, 25 minutes. Treat it like the real test.' },
    quick: { title: 'Quick 5', n: 5, secs: 6 * 60, make: () => gen(QA_KEYS.concat(PROB_KEYS), 5), hint: 'For gaps in the day.' }
  };
  function one() { return G[pick(QA_KEYS.concat(PROB_KEYS))](); }
  return { MODES, G, QA_KEYS, PROB_KEYS, diSet, one };
})();
if (typeof module !== 'undefined') module.exports = VK_PRACTICE;
