/* VIKRAM content layer. Plain data, works in browser (window.VK_CONTENT) and Node (module.exports). */
var VK_CONTENT = (function () {
  const DAY1 = '2027-12-01';

  // ---------- Schedule templates (24h "HH:MM"). Each block can carry habit ids to tick. ----------
  const ritual = [
    { s: '05:00', e: '05:15', t: 'Wake up · water · brush', k: 'ritual', items: ['wake5', 'brushAM'], nudge: 'Good morning. Feet on the floor, glass of water. Vikram is up with you.' },
    { s: '05:15', e: '05:45', t: 'Yoga', k: 'ritual', items: ['yoga'], nudge: 'Yoga mat. Even 5 sun salutations count.' },
    { s: '05:45', e: '06:05', t: 'Meditation', k: 'ritual', items: ['meditate'] },
    { s: '06:05', e: '06:35', t: 'Bath', k: 'ritual', items: ['bath'] },
    { s: '06:35', e: '07:00', t: 'Puja', k: 'ritual', items: ['puja'] }
  ];
  const evening = [
    { s: '17:30', e: '18:00', t: 'Walk / move', k: 'body', items: ['walk'], nudge: 'Lab done. 15-minute walk before anything else.' },
    { s: '18:00', e: '18:45', t: 'Aptitude: solve and win', k: 'prep', items: ['aptitude'], nudge: 'Your favourite part: solve and win. One math sprint + one timed set.' },
    { s: '18:45', e: '19:30', t: 'Hobby slot', k: 'hobby', items: ['hobby'], nudge: 'Hobby slot. Writing, French or chess, whichever is active.' },
    { s: '19:30', e: '20:00', t: 'Dinner', k: 'break', items: [] },
    { s: '20:00', e: '20:30', t: 'Reading + history', k: 'mind', items: ['reading', 'history'], nudge: 'Reading time. 10 pages, phone on the other side of the room.' },
    { s: '20:30', e: '20:45', t: 'Journal + plan tomorrow', k: 'mind', items: ['journal'], nudge: '3 lines: one win, one lesson, tomorrow\'s first task.' },
    { s: '20:45', e: '21:00', t: 'Brush · phone away · wind down', k: 'ritual', items: ['brushPM'], nudge: 'Brush, phone away, lights low. Sleep by 9.' },
    { s: '21:00', e: '05:00', t: 'Sleep (8 hours)', k: 'sleep', items: ['sleep9'], nudge: 'Sleep now. 8 hours is part of the plan.' }
  ];
  const SCHEDULES = {
    study: {
      name: 'Study day (holidays · lab afternoons)',
      blocks: ritual.concat([
        { s: '07:00', e: '09:30', t: 'Placement study · deep block 1 (module)', k: 'prep', items: ['deep1'], nudge: 'Deep block 1. Open today\'s module in Vikram. Phone face down.' },
        { s: '09:30', e: '10:00', t: 'Breakfast + short walk', k: 'break', items: [] },
        { s: '10:00', e: '12:30', t: 'Placement study · block 2 (practice / build)', k: 'prep', items: ['deep2'], nudge: 'Block 2: timed practice or build work.' },
        { s: '12:30', e: '13:30', t: 'Lunch + 10-min walk (no bed)', k: 'break', items: [], nudge: 'Lunch. Then a 10-minute walk, not the bed.' },
        { s: '13:30', e: '17:30', t: 'Lab', k: 'lab', items: ['noNap'], nudge: 'Lab time. Water, stand up, go. No afternoon sleep today.', extra: [{ at: '14:15', msg: 'Nap check: stand up, splash water on your face, 2 minutes outside.' }, { at: '15:30', msg: 'Halfway through lab. Still awake = still winning.' }] }
      ]).concat(evening)
    },
    class: {
      name: 'Class day (semester)',
      blocks: ritual.concat([
        { s: '07:00', e: '08:00', t: 'Placement study · morning sprint', k: 'prep', items: ['deep1'], nudge: 'One focused hour before class: today\'s drill + flashcards.' },
        { s: '08:00', e: '13:00', t: 'Classes (edit to your timetable)', k: 'class', items: [] },
        { s: '13:00', e: '14:00', t: 'Lunch + 10-min walk (no bed)', k: 'break', items: [], nudge: 'Lunch, then walk. The bed is not part of the plan.' },
        { s: '14:00', e: '17:30', t: 'Lab', k: 'lab', items: ['noNap'], nudge: 'Lab time. No afternoon sleep.', extra: [{ at: '14:45', msg: 'Nap check: stand up and move for 2 minutes.' }] }
      ]).concat(evening)
    },
    sunday: {
      name: 'Sunday (review + reset)',
      blocks: ritual.concat([
        { s: '07:00', e: '09:30', t: 'Full timed mock / weekly test', k: 'prep', items: ['deep1'], nudge: 'Sunday mock. Treat it like the real OA.' },
        { s: '09:30', e: '10:00', t: 'Breakfast', k: 'break', items: [] },
        { s: '10:00', e: '11:30', t: 'Weekly review + plan + backup', k: 'mind', items: ['review'], nudge: 'Weekly review: what worked, what derailed you, plan next week.' },
        { s: '11:30', e: '13:30', t: 'Free / outreach / build', k: 'prep', items: [] },
        { s: '13:30', e: '17:30', t: 'Free afternoon (outdoors, people, hobby)', k: 'free', items: ['noNap'] }
      ]).concat(evening)
    }
  };
  // Which template applies to a date (user can override per weekday in Settings).
  function defaultDayType(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const wd = d.getDay();
    if (wd === 0) return 'sunday';
    const semesterJanApr = dateStr >= '2027-01-04' && dateStr <= '2027-04-30';
    const semesterAugNov = dateStr >= '2027-07-20' && dateStr <= '2027-11-30';
    if ((semesterJanApr || semesterAugNov) && wd >= 1 && wd <= 5) return 'class';
    return 'study';
  }

  // ---------- Habits (phase-in by start date; min = the 2-minute version) ----------
  const HABITS = [
    { id: 'wake5', t: 'Up by 5:00', min: 'Up by 5:30', start: '2026-12-01', cat: 'ritual' },
    { id: 'brushAM', t: 'Brush (morning)', min: 'Brush', start: '2026-12-01', cat: 'body' },
    { id: 'yoga', t: 'Yoga 20–30 min', min: '5 sun salutations', start: '2026-12-01', cat: 'body' },
    { id: 'meditate', t: 'Meditation 15 min', min: '3 minutes of breathing', start: '2026-12-01', cat: 'mind' },
    { id: 'bath', t: 'Bath', min: 'Bath', start: '2026-12-01', cat: 'ritual' },
    { id: 'puja', t: 'Puja', min: 'Short prayer', start: '2026-12-01', cat: 'ritual' },
    { id: 'deep1', t: 'Study block 1 done', min: '25 minutes on today\'s module', start: '2026-12-01', cat: 'prep' },
    { id: 'deep2', t: 'Study block 2 done', min: 'One timed set', start: '2026-12-01', cat: 'prep' },
    { id: 'noNap', t: 'No afternoon sleep', min: 'Max 15-min power nap, alarm set', start: '2026-12-01', cat: 'body' },
    { id: 'walk', t: 'Walk 15+ min', min: '5-minute walk', start: '2026-12-01', cat: 'body' },
    { id: 'aptitude', t: 'Evening aptitude win', min: 'One 2-min math sprint', start: '2026-12-01', cat: 'prep' },
    { id: 'reading', t: 'Read 10 pages', min: 'Read 2 pages', start: '2026-12-01', cat: 'mind' },
    { id: 'brushPM', t: 'Brush (night)', min: 'Brush', start: '2026-12-01', cat: 'body' },
    { id: 'sleep9', t: 'In bed by 21:00', min: 'In bed by 21:30', start: '2026-12-01', cat: 'body' },
    { id: 'journal', t: 'Journal: win · lesson · first task', min: 'One line', start: '2026-12-08', cat: 'mind' },
    { id: 'hobby', t: 'Hobby slot', min: '10 minutes', start: '2026-12-15', cat: 'hobby' },
    { id: 'history', t: 'History original 15 min', min: 'One Feed passage', start: '2027-01-01', cat: 'mind' },
    { id: 'review', t: 'Weekly review + backup', min: 'Look at the week\'s score', start: '2026-12-06', cat: 'mind' }
  ];
  // Hobby slot rotation by date (what "hobby" means this month)
  const HOBBY_PLAN = [
    { from: '2026-12-15', t: 'Writing: 150 words in Vikram\'s pad' },
    { from: '2027-01-01', t: 'French 15 min (Mon/Wed/Fri) · Writing 150 words (Tue/Thu/Sat)' },
    { from: '2027-01-15', t: 'French (Mon/Wed/Fri) · Chess tactics + writing (Tue/Thu/Sat)' },
    { from: '2027-03-01', t: 'Trial month: calligraphy twice a week · French · chess' },
    { from: '2027-04-01', t: 'Trial month: origami twice a week · French · chess' },
    { from: '2027-05-01', t: 'Keep the hobby that stuck · French · writing' }
  ];

  // ---------- Placement roadmap (from 00_START_HERE, December onwards) ----------
  const MODULES = [
    ['A1', 'Mental maths + speed', 'Aptitude / OA', '2026-12-02', 'notes/A1_Mental_Maths_Speed.html'], ['A2', 'Quant aptitude (CAT-style)', 'Aptitude / OA', '2026-12-03', 'notes/A2_Quant_Aptitude.html'],
    ['A3', 'Data interpretation + logical reasoning', 'Aptitude / OA', '2026-12-08', 'notes/A3_DI_Logical_Reasoning.html'], ['A4', 'Probability, P&C, expected value + puzzles', 'Aptitude / OA', '2026-12-11', 'notes/A4_Probability_Puzzles.html'],
    ['A5', 'Verbal, psychometric + GD', 'Aptitude / OA', '2027-01-17'],
    ['S1', 'Guesstimates + structured thinking', 'Case spine', '2026-11-09', 'notes/S1_Guesstimates_Structured_Thinking.html'],
    ['S2', 'Case frameworks (card + lending cases)', 'Case spine', '2026-12-05', 'notes/S2_Case_Frameworks.html'], ['S3', 'Story bank + HR', 'Case spine', '2026-12-06', 'notes/S3_Story_Bank_HR.html'],
    ['S4', 'CV from scratch (internship + CDC)', 'Case spine', '2026-12-13', 'notes/S4_CV_From_Scratch.html'], ['B1', 'Banking + credit-card business', 'Case spine', '2026-12-14', 'notes/B1_Banking_Card_Business.html'],
    ['S5', 'Business + unit economics', 'Case spine', '2026-12-20', 'notes/S5_Business_Unit_Economics.html'], ['S6', 'Outreach + email playbook', 'Case spine', '2026-12-15', 'notes/S6_Outreach_Email_Playbook.html'],
    ['D1', 'SQL: zero to interview', 'Data', '2026-12-10', 'notes/D1_SQL_Zero_to_Interview.html'], ['D2', 'Python + pandas for analysts', 'Data', '2026-12-17', 'notes/D2_Python_Pandas.html'],
    ['D3', 'Statistics + A/B testing', 'Data', '2026-12-19', 'notes/D3_Statistics_AB_Testing.html'], ['D4', 'DSA-lite, the fun way', 'Data', '2027-03-15'],
    ['M1', 'Classical ML rapid-fire', 'AI/ML', '2026-12-22', 'notes/M1_Classical_ML.html'], ['M2', 'LLM internals', 'AI/ML', '2027-02-07'],
    ['M3', 'RAG, agents, evals', 'AI/ML', '2027-02-21'], ['M5', 'ML system design + project stories', 'AI/ML', '2027-03-28'],
    ['F1', 'Accounting + 3 statements', 'Finance', '2026-12-23', 'notes/F1_Accounting_3_Statements.html'], ['F2', 'Valuation', 'Finance', '2026-12-28', 'notes/F2_Valuation.html'],
    ['F4', 'VC + PE, investment memo', 'Finance', '2027-01-24'], ['F3', 'M&A + LBO', 'Finance', '2027-03-14'],
    ['Q1', 'Quant trading interviews', 'Finance', '2027-04-18'], ['F5', 'Markets + finance Q-bank', 'Finance', '2027-08-15'],
    ['P1', 'Product sense + design', 'Product', '2026-12-26', 'notes/P1_Product_Sense_Design.html'], ['P2', 'Metrics, RCA, A/B', 'Product', '2026-12-30'],
    ['P3', 'Tech + AI product', 'Product', '2027-01-31'], ['P4', 'Deck, PRD, teardown', 'Product', '2027-02-14'],
    ['X2', 'Company dossiers', 'Final', '2027-08-31'], ['X1', 'Final revision pack', 'Final', '2027-09-30']
  ].map(([c, t, track, due, local]) => ({ c, t, track, due, local: local || null }));

  const PHASES = [
    { id: 'p1', n: 'December sprint', s: '2026-12-01', e: '2026-12-31', g: 'Tier 1 core: aptitude, cases, SQL, cards business. CV from scratch. First real project.' },
    { id: 'p2', n: 'Semester + internship hunt', s: '2027-01-01', e: '2027-04-30', g: 'Outreach Jan–Mar, February = mock month, Tier 2 + 3 modules, DSA-lite.' },
    { id: 'p3', n: 'Summer internship', s: '2027-05-01', e: '2027-07-31', g: 'Earn the PPO. Collect CV bullets. 30 min/day maintenance.' },
    { id: 'p4', n: 'CDC registration + CV', s: '2027-08-01', e: '2027-08-31', g: 'Final CDC CV, company dossiers, daily timed OA sets.' },
    { id: 'p5', n: 'Test season', s: '2027-09-01', e: '2027-11-30', g: 'Dozens of OAs (mostly Oct–Nov), PPTs, 3 mocks a week.' },
    { id: 'p6', n: 'Day 1', s: '2027-12-01', e: '2027-12-31', g: 'Interviews. Calm, rested, prioritised.' }
  ];
  // [id, due, kind M/P/B, text, module]
  const TASKS = [
    ['t02', '2026-12-02', 'M', 'Mental maths + first 3 math sprints logged', 'A1'], ['t04', '2026-12-03', 'M', 'Quant aptitude + 2 timed QA sets', 'A2'],
    ['t05', '2026-12-05', 'M', 'Case frameworks + 2 cases aloud', 'S2'], ['t06', '2026-12-06', 'M', 'Story bank written', 'S3'],
    ['t07', '2026-12-07', 'B', 'Inventory: list what you have truly done (no copied work) for the new CV'],
    ['t08', '2026-12-08', 'M', 'DI + LR + 3 timed DI sets', 'A3'], ['t09', '2026-12-10', 'M', 'SQL + first 10 problems', 'D1'],
    ['t10', '2026-12-11', 'M', 'Probability + puzzles, 20 problems', 'A4'], ['t11', '2026-12-13', 'B', 'CV v1 from scratch (honest, numbers only from real work)', 'S4'],
    ['t12', '2026-12-14', 'M', 'Credit-card business + 1 Capital One-style case', 'B1'], ['t12b', '2026-12-15', 'M', 'Outreach playbook + company list ready', 'S6'],
    ['t13', '2026-12-17', 'M', 'Python + pandas', 'D2'], ['t14', '2026-12-19', 'M', 'Statistics + A/B', 'D3'],
    ['t15', '2026-12-20', 'M', 'Unit economics', 'S5'], ['t16', '2026-12-22', 'M', 'ML rapid-fire', 'M1'],
    ['t17', '2026-12-23', 'M', 'Accounting', 'F1'], ['t18', '2026-12-26', 'M', 'Product sense', 'P1'],
    ['t19', '2026-12-28', 'M', 'Valuation', 'F2'], ['t20', '2026-12-30', 'M', 'Metrics + RCA', 'P2'],
    ['t21', '2026-12-31', 'B', 'Project 1: credit-default analytics on GitHub (built by you, from scratch)'],
    ['t21b', '2026-12-31', 'B', 'VIKRAM case study written (your product-profile project)'],
    ['t22', '2027-01-10', 'P', 'Start DSA-lite: 2 easy problems a week', 'D4'], ['t23', '2027-01-15', 'B', 'First 50 internship emails sent'],
    ['t24', '2027-01-17', 'M', 'Verbal, psychometric, GD', 'A5'], ['t25', '2027-01-24', 'M', 'VC/PE + one investment memo', 'F4'],
    ['t26', '2027-01-31', 'M', 'Tech understanding + AI product', 'P3'], ['t27', '2027-02-07', 'M', 'LLM internals', 'M2'],
    ['t28', '2027-02-14', 'M', 'Deck, PRD, teardown + one product deck', 'P4'], ['t29', '2027-02-21', 'M', 'RAG, agents, evals', 'M3'],
    ['t30', '2027-02-28', 'P', 'Mock month: 8 mocks across lanes'], ['t31', '2027-03-14', 'M', 'M&A + LBO', 'F3'],
    ['t32', '2027-03-15', 'P', 'DSA-lite: 20 easy problems', 'D4'], ['t33', '2027-03-28', 'M', 'ML system design + project stories', 'M5'],
    ['t34', '2027-03-31', 'B', 'Project 2: RAG app with an eval set'], ['t35', '2027-04-18', 'M', 'Quant trading interviews', 'Q1'],
    ['t36', '2027-04-30', 'P', 'Internship offer signed'], ['t37', '2027-06-15', 'B', 'Mid-internship: 6 CV bullets with numbers'],
    ['t38', '2027-07-31', 'B', 'Internship done; PPO conversation had'], ['t39', '2027-08-15', 'M', 'Markets + finance Q-bank', 'F5'],
    ['t40', '2027-08-20', 'B', 'CDC CV final, reviewed by 2 seniors'], ['t41', '2027-08-31', 'M', 'Company dossiers + slot shortlist', 'X2'],
    ['t42', '2027-09-30', 'M', 'Final revision pack; 1 timed OA daily', 'X1'], ['t43', '2027-10-31', 'P', '15 full OA mocks; math sprint 65+'],
    ['t44', '2027-11-30', 'P', '30 mock interviews total'], ['t45', '2027-12-01', 'P', 'Day 1']
  ].map(([id, due, k, t, m]) => ({ id, due, k, t, m: m || null }));

  // ---------- Books ----------
  const BOOKS = [
    { id: 'zero-to-one', t: 'Zero to One', a: 'Peter Thiel', own: true, why: 'Startups, monopolies, contrarian thinking: fuel for product + VC interviews' },
    { id: 'psych-money', t: 'The Psychology of Money', a: 'Morgan Housel', own: true, why: 'How people actually behave with money; great for finance fit questions' },
    { id: 'human-nature', t: 'The Laws of Human Nature', a: 'Robert Greene', own: true, why: 'Reading people, self-awareness; long, read in 10-page bites' },
    { id: 'seduction', t: 'The Art of Seduction', a: 'Robert Greene', own: true, why: 'Persuasion and influence through history; read critically' },
    { id: 'atomic-habits', t: 'Atomic Habits', a: 'James Clear', own: false, why: 'Buy first: the method behind Vikram\'s habit system' },
    { id: 'meditations', t: 'Meditations', a: 'Marcus Aurelius', own: false, why: 'Free (public domain); a short passage every morning' },
    { id: 'gita', t: 'Bhagavad Gita (with commentary)', a: '—', own: false, why: 'Pairs with puja; duty, action, detachment' },
    { id: 'influence', t: 'Influence', a: 'Robert Cialdini', own: false, why: 'The science of persuasion: product, sales, negotiation' },
    { id: 'thinking-fast', t: 'Thinking, Fast and Slow', a: 'Daniel Kahneman', own: false, why: 'Biases and decisions: the core of behavioural psychology' },
    { id: 'mans-search', t: 'Man\'s Search for Meaning', a: 'Viktor Frankl', own: false, why: 'Short, life-changing; meaning when things go wrong' },
    { id: 'deep-work', t: 'Deep Work', a: 'Cal Newport', own: false, why: 'How to do the 7–12:30 study block properly' },
    { id: 'discovery-india', t: 'The Discovery of India', a: 'Jawaharlal Nehru', own: false, why: 'History + UPSC lens' },
    { id: 'india-way', t: 'The India Way', a: 'S. Jaishankar', own: false, why: 'India\'s foreign policy from the inside: geopolitics' }
  ];

  // ---------- Feed cards (the Instagram replacement). Written for Vikram; quotes are paraphrased. ----------
  const FEED = [
    // aptitude (tap to reveal)
    { k: 'apt', q: 'A price rises 20%, then falls 20%. Net change?', a: '−4% (1.2 × 0.8 = 0.96)' },
    { k: 'apt', q: '15% of 240?', a: '36 (10% = 24, 5% = 12)' },
    { k: 'apt', q: 'What is 1/8 as a percentage?', a: '12.5%' },
    { k: 'apt', q: '48 × 25?', a: '1,200 (×100 ÷ 4)' },
    { k: 'apt', q: 'A train covers 180 km in 2.5 h. Speed?', a: '72 km/h' },
    { k: 'apt', q: 'Two dice: probability the sum is 7?', a: '6/36 = 1/6' },
    { k: 'apt', q: 'Expected value of one fair die roll?', a: '3.5' },
    { k: 'apt', q: 'Revenue up 25%, then down 20%. Net?', a: '0% (1.25 × 0.8 = 1)' },
    { k: 'apt', q: 'A does a job in 10 days, B in 15. Together?', a: '6 days (1/10 + 1/15 = 1/6)' },
    { k: 'apt', q: 'Ratio 3:5, total 64. Larger part?', a: '40' },
    { k: 'apt', q: '17 × 19?', a: '323 (18² − 1)' },
    { k: 'apt', q: 'Coin tossed 3 times: P(at least one head)?', a: '7/8' },
    { k: 'apt', q: 'Simple interest on ₹5,000 at 8% for 3 years?', a: '₹1,200' },
    { k: 'apt', q: 'Break-even: fixed cost ₹60,000, price ₹500, variable cost ₹300. Units?', a: '300 units (60,000 ÷ 200)' },
    { k: 'apt', q: 'Card company: 2% interchange on ₹40 crore spend. Revenue?', a: '₹80 lakh' },
    { k: 'apt', q: 'CAGR doubling in 6 years ≈ ?', a: '~12% (rule of 72)' },
    { k: 'apt', q: 'How many ways to arrange the letters of LEVEL?', a: '30 (5! / (2!·2!))' },
    { k: 'apt', q: '0.35 × 0.4?', a: '0.14' },
    { k: 'apt', q: 'Average of 12, 15, 18, 21, 24?', a: '18' },
    { k: 'apt', q: 'Draw 2 cards: P(both aces)?', a: '(4/52)(3/51) = 1/221' },
    // history
    { k: 'history', q: 'Megasthenes', a: 'Greek envoy of Seleucus I at Chandragupta Maurya\'s court in Pataliputra. His book Indica survives only in fragments quoted by later writers like Arrian.' },
    { k: 'history', q: 'The Arthashastra\'s rediscovery', a: 'The text was largely lost until a manuscript surfaced in 1905; R. Shamasastry published it and translated it into English (1915). It reads like a manual on statecraft, economy and spies.' },
    { k: 'history', q: 'Al-Biruni', a: 'Came to India in the wake of Mahmud of Ghazni\'s campaigns and wrote Kitab al-Hind (c. 1030), a remarkably curious study of Indian science, religion and society.' },
    { k: 'history', q: 'Babur\'s memoir', a: 'The Baburnama was written in Chagatai Turkic. It is unusually frank: Babur records his doubts, his love of gardens and fruit, and his opinions of Hindustan.' },
    { k: 'history', q: 'Herodotus', a: 'Greek writer of the 5th century BCE, called the "father of history". His Histories set out to explain why Greeks and Persians went to war.' },
    { k: 'history', q: 'Thucydides', a: 'Wrote the history of the Peloponnesian War (431–404 BCE) between Athens and Sparta. Realist thinkers still quote his idea that fear, honour and interest drive states.' },
    { k: 'history', q: 'Xuanzang at Nalanda', a: 'The Chinese monk travelled to India in the 7th century, studied at Nalanda, and carried hundreds of texts back to China. His travel record is a key source on Harsha\'s India.' },
    { k: 'history', q: 'Rajendra Chola\'s navy', a: 'Around 1025 CE the Chola navy raided the Srivijaya kingdom across the Bay of Bengal: one of the boldest overseas expeditions by an Indian power.' },
    { k: 'history', q: 'Akbar\'s Ibadat Khana', a: 'A House of Worship at Fatehpur Sikri (from 1575) where Akbar hosted debates between scholars of many faiths.' },
    { k: 'history', q: '1857', a: 'The revolt began at Meerut on 10 May 1857 and spread across north India. Afterwards the British Crown took direct control from the East India Company (1858).' },
    { k: 'history', q: 'Dholavira', a: 'A Harappan city in Kutch with sophisticated water reservoirs and planned sections; a UNESCO World Heritage Site since 2021.' },
    { k: 'history', q: 'Ibn Battuta in Delhi', a: 'The Moroccan traveller served as a qazi (judge) under Muhammad bin Tughluq in the 14th century, and described the sultan as both generous and terrifying.' },
    // geopolitics
    { k: 'geo', q: 'Chokepoints', a: 'Narrow sea passages (Malacca, Hormuz, Bab-el-Mandeb, Suez) through which a large share of world trade and oil moves. Whoever can close them holds leverage.' },
    { k: 'geo', q: 'The Quad', a: 'India, the US, Japan and Australia: a grouping focused on the Indo-Pacific (maritime security, supply chains, technology).' },
    { k: 'geo', q: 'LAC', a: 'The Line of Actual Control is the de facto boundary between India and China. It is undemarcated, which is why patrol clashes happen.' },
    { k: 'geo', q: 'Chabahar', a: 'An Iranian port India helped develop to reach Afghanistan and Central Asia without going through Pakistan.' },
    { k: 'geo', q: 'Indus Waters Treaty', a: 'Signed in 1960 with World Bank mediation, dividing the Indus river system between India and Pakistan. India put it in abeyance in April 2025.' },
    { k: 'geo', q: 'Strategic autonomy', a: 'India\'s habit of keeping options open with all major powers instead of joining one camp: buying Russian oil while deepening ties with the US, for example.' },
    { k: 'geo', q: 'BRICS', a: 'Started as Brazil, Russia, India, China (+ South Africa in 2010); it expanded in 2024. A forum for big emerging economies, not an alliance.' },
    // french
    { k: 'french', q: 'Bonjour / Bonsoir', a: 'Hello (day) / Good evening. bohn-ZHOOR / bohn-SWAHR' },
    { k: 'french', q: 'Je m\'appelle Aryan', a: 'My name is Aryan. zhuh mah-PELL' },
    { k: 'french', q: 'Merci beaucoup', a: 'Thank you very much. mehr-SEE boh-KOO' },
    { k: 'french', q: 'Je suis étudiant', a: 'I am a student. zhuh swee ay-tew-DYAHN' },
    { k: 'french', q: 'Où est la gare ?', a: 'Where is the station? oo eh lah GAHR' },
    { k: 'french', q: 'Un, deux, trois, quatre, cinq', a: '1–5. uhn, duh, trwah, KAT-ruh, sank' },
    { k: 'french', q: 'Je voudrais un café', a: 'I would like a coffee. zhuh voo-DREH' },
    { k: 'french', q: 'Le / La / Les', a: 'The (masculine / feminine / plural). Every French noun has a gender: learn it with the article.' },
    // finance / business
    { k: 'biz', q: 'How a credit card company earns', a: 'Interchange fees on every swipe, interest on revolving balances, annual fees, late fees. It loses money to defaults (charge-offs), rewards and customer acquisition.' },
    { k: 'biz', q: 'CAC vs LTV', a: 'Customer acquisition cost vs lifetime value. A healthy business usually wants LTV at 3× CAC or more, and to earn back CAC within about a year.' },
    { k: 'biz', q: 'CTC vs in-hand', a: 'CTC adds bonuses, PF, joining bonus, stock, perks. Monthly in-hand pay is often much less than CTC ÷ 12. Always ask for the breakdown.' },
    { k: 'biz', q: 'EBITDA', a: 'Earnings before interest, tax, depreciation and amortisation: a rough proxy for operating cash profit, used in EV/EBITDA valuation.' },
    { k: 'biz', q: 'Net interest margin', a: 'What a lender earns on loans minus what it pays for funds, as a share of assets. The core profit engine of a bank.' },
    { k: 'biz', q: 'Contribution margin', a: 'Price minus variable cost per unit. It pays for fixed costs; break-even units = fixed costs ÷ contribution per unit.' },
    // psychology + winning (ideas paraphrased)
    { k: 'mind', q: 'Marcus Aurelius (paraphrased)', a: 'At dawn, when you don\'t want to get up, remind yourself: I am rising to do the work of a human being. Why resent doing what you were made for?' },
    { k: 'mind', q: 'Bhagavad Gita 2.47 (paraphrased)', a: 'Your right is to the work alone, never to its fruits. Don\'t let results be your motive, and don\'t fall into inaction.' },
    { k: 'mind', q: 'Habits (Atomic Habits, idea)', a: 'You don\'t rise to your goals; you fall to your systems. Make the good habit obvious, easy and satisfying, and the bad one invisible and hard.' },
    { k: 'mind', q: 'Compounding (Psychology of Money, idea)', a: 'Big results come from ordinary effort sustained for an unusually long time. Consistency beats intensity.' },
    { k: 'mind', q: 'Contrarian question (Zero to One, idea)', a: 'Thiel\'s interview question: what important truth do very few people agree with you on? Prepare your answer; it\'s a great PM/VC question.' },
    { k: 'mind', q: 'Self-awareness (Laws of Human Nature, idea)', a: 'Greene\'s core move: notice your own emotional reactions first, before judging others. People reveal themselves in patterns, not single moments.' },
    { k: 'mind', q: 'Never miss twice', a: 'Missing once is an accident. Missing twice is the start of a new habit. Vikram\'s comeback mode exists for exactly this.' },
    { k: 'mind', q: 'The 2-minute rule', a: 'On a bad day, do the 2-minute version: 5 sun salutations, 2 pages, 1 math sprint. Showing up is the habit.' },
    { k: 'mind', q: 'Urge surfing', a: 'An urge to scroll peaks and fades in a few minutes. Name it ("urge"), breathe 3 times, do one card. You just beat it.' },
    { k: 'mind', q: 'Deep work', a: 'One 90-minute block with the phone in another room beats four hours of half-attention. Protect the 7:00–9:30 block.' },
    // added v1.4: geopolitics, business, mind
    { k: 'geo', q: 'The Malacca dilemma', a: 'A large share of China\'s imported oil passes through the narrow Strait of Malacca. Chinese leaders have worried that a rival navy could close it, which is one reason for pipelines through Myanmar and Pakistan and ports across the Indian Ocean.' },
    { k: 'geo', q: 'The Thucydides Trap', a: 'Graham Allison\'s name for the risk of war when a rising power threatens to displace a ruling one, after Thucydides\' line that the growth of Athens and the fear it caused in Sparta made war inevitable. Usually applied to the US and China.' },
    { k: 'geo', q: 'The Quad', a: 'India, the United States, Japan and Australia. A loose strategic dialogue first tried in 2007 and revived in 2017, focused on the Indo-Pacific: maritime security, supply chains, vaccines, critical technology.' },
    { k: 'geo', q: 'Strait of Hormuz', a: 'The narrow channel between Iran and Oman. Roughly a fifth of the world\'s oil passes through it, so any threat to close it moves oil prices worldwide, including India\'s import bill.' },
    { k: 'geo', q: 'Non-alignment', a: 'Nehru\'s Cold War policy of joining neither the US nor the Soviet bloc. It grew out of the 1955 Bandung conference and became the Non-Aligned Movement at Belgrade in 1961. Today\'s version is called strategic autonomy.' },
    { k: 'geo', q: 'Panchsheel (1954)', a: 'Five principles of peaceful coexistence in the India–China agreement on Tibet: mutual respect for sovereignty, non-aggression, non-interference, equality and mutual benefit, peaceful coexistence. The 1962 war broke the spirit of it.' },
    { k: 'geo', q: 'The Simla Agreement (1972)', a: 'Signed by Indira Gandhi and Zulfikar Ali Bhutto after the 1971 war. Both sides agreed to settle disputes bilaterally, and the ceasefire line in Kashmir became the Line of Control.' },
    { k: 'geo', q: 'The Indus Waters Treaty (1960)', a: 'Brokered by the World Bank: the eastern rivers (Ravi, Beas, Sutlej) went to India, the western rivers (Indus, Jhelum, Chenab) mainly to Pakistan. It survived three wars; in 2025 India announced it was holding the treaty in abeyance.' },
    { k: 'geo', q: 'Chabahar port', a: 'A port in south-east Iran that India has helped develop, to reach Afghanistan and Central Asia without crossing Pakistan. It sits about 170 km from Pakistan\'s China-backed port at Gwadar.' },
    { k: 'geo', q: 'The Peace of Westphalia (1648)', a: 'The treaties ending the Thirty Years\' War in Europe. They are taken as the origin of the modern system of sovereign states that do not interfere in each other\'s internal affairs.' },
    { k: 'geo', q: 'Containment', a: 'The US strategy against the Soviet Union, set out by diplomat George Kennan in his 1946 "Long Telegram": resist Soviet expansion everywhere and wait for the system to weaken from within.' },
    { k: 'geo', q: 'Soft power', a: 'Joseph Nye\'s term for getting what you want through attraction rather than force or money: culture, values, institutions. India\'s examples: yoga, Bollywood, the diaspora, democracy, digital public infrastructure.' },
    { k: 'geo', q: 'Look East to Act East', a: 'India\'s Look East policy began in the early 1990s under Narasimha Rao to build ties with South-east Asia; it was upgraded to Act East in 2014 with more focus on security and connectivity.' },
    { k: 'geo', q: 'Exclusive Economic Zone', a: 'Under the UN Convention on the Law of the Sea, a coastal state controls fishing, oil, gas and minerals up to 200 nautical miles from its coast. Islands can create large EEZs, which is why tiny islands get fought over.' },
    { k: 'geo', q: 'G20 New Delhi, 2023', a: 'Under India\'s presidency, the African Union was admitted as a permanent member of the G20, India\'s headline achievement of the summit.' },
    { k: 'biz', q: 'Network effects', a: 'A product gets more valuable as more people use it: phone networks, UPI, WhatsApp, marketplaces. Strong network effects create winner-take-most markets, the core of Zero to One\'s monopoly argument.' },
    { k: 'biz', q: 'LTV : CAC', a: 'Lifetime value of a customer divided by the cost to acquire one. A common rule of thumb is that 3:1 or better is healthy and below 1:1 means you lose money on every customer you win.' },
    { k: 'biz', q: 'Moat', a: 'Warren Buffett\'s word for a durable competitive advantage that protects profits: brand, network effects, switching costs, cost advantage, or regulation.' },
    { k: 'biz', q: 'Goodhart\'s law', a: '"When a measure becomes a target, it ceases to be a good measure." If a team is paid on tickets closed, tickets get split. Remember it when you pick product metrics.' },
    { k: 'biz', q: 'Operating leverage', a: 'When most costs are fixed, each extra sale is mostly profit, so profits rise faster than revenue, and fall faster too. Software and airlines are high; consulting is low.' },
    { k: 'biz', q: 'Sunk cost fallacy', a: 'Continuing something because of what you have already spent, not because of what you will gain from here. The right question is only: from today, is this worth it?' },
    { k: 'biz', q: 'Opportunity cost', a: 'The value of the best alternative you give up. An internship that pays ₹50,000 but teaches nothing may cost more than one that pays ₹20,000 and gets you a PPO.' },
    { k: 'biz', q: 'Two-sided marketplace', a: 'A platform that must win two groups at once: riders and drivers, buyers and sellers. The hard part is the start (the chicken-and-egg problem); one side is usually subsidised.' },
    { k: 'biz', q: 'Price discrimination', a: 'Charging different customers different prices for the same thing: student discounts, airline fares, Tatkal tickets, freemium tiers. It captures more of each customer\'s willingness to pay.' },
    { k: 'biz', q: 'Insurance float', a: 'Insurers collect premiums now and pay claims later; the money held in between (the float) can be invested. Buffett built Berkshire Hathaway largely on float.' },
    { k: 'biz', q: 'The Lindy effect', a: 'For non-perishable things like books, ideas and technologies, the longer something has survived, the longer it is likely to last. A reason to read the originals in VIKRAM\'s history library.' },
    { k: 'mind', q: 'Parkinson\'s law', a: '"Work expands to fill the time available for its completion." Give a task a shorter, fixed block: VIKRAM\'s time blocks are built on this.' },
    { k: 'mind', q: 'Implementation intentions', a: 'Psychologist Peter Gollwitzer found that "If X happens, I will do Y" plans make people far more likely to follow through. Example: if I pick up my phone after lunch, I open VIKRAM\'s Feed, not Instagram.' },
    { k: 'mind', q: 'The Zeigarnik effect', a: 'Unfinished tasks stay on your mind more than finished ones. Writing tomorrow\'s first task in your journal closes the loop so you can sleep.' },
    { k: 'mind', q: 'Eisenhower matrix', a: 'Sort tasks by urgent vs important. Important but not urgent (placement prep, health, reading) is where long-term results come from, and it is what gets pushed aside first.' },
    { k: 'mind', q: 'Hofstadter\'s law', a: '"It always takes longer than you expect, even when you take into account Hofstadter\'s law." Build buffer days into any plan, which is why VIKRAM has streak freezes.' },
  ];


  // Harsh notifications when Aryan leaves a focus session. Level rises every time one is ignored. Mean about the behaviour, never about the person's worth.
  const NAG = [
    ['The timer is running. You are not. Back to VIKRAM.', 'That wasn\'t a break, that was an escape. Get back.', 'Your session isn\'t paused. Your excuse is. Return.', 'Whatever you opened, it can wait 40 minutes. Your placement can\'t.', 'Phone down, books up. Now.', 'You started a focus session 10 minutes ago. Remember that guy? Be him.', 'Instagram will still be useless when the timer ends.', 'Back. The question you were stuck on doesn\'t solve itself.'],
    ['Again? You promised yourself a session and couldn\'t last it. Get back.', 'Capital One doesn\'t hire scroll history.', 'Every reel you watch, someone else finishes another DI set.', 'You\'re not tired. You\'re bored. Bored people don\'t get Day 1 offers.', 'Close it. You know exactly what you\'re doing.', 'Is this what the 5 AM version of you signed up for?', 'You built an app to stop this. Use it.', 'Two minutes of this is how two hours disappear. Back.'],
    ['Third warning. You are choosing average. Open VIKRAM.', 'Still gone. Your competition isn\'t.', 'You can\'t buy this hour back. Stop wasting it.', 'This is the exact habit you said was ruining you. Here it is again.', 'Nobody is coming to make you work. That was the whole point of me. Get back.', 'The reels are designed to beat you. Right now they\'re winning.', 'Pathetic session so far. Fix it before the timer does.', 'You set this alarm because you knew you\'d do this. Prove yourself wrong.'],
    ['Unbelievable. Your timer is running empty while you scroll. Get. Back. Now.', 'Your partner sees your focus hours every Sunday. Want them to see this?', 'Your streak, your pledge and your placement are all waiting. You\'re watching strangers.', 'At this rate December 2027 arrives and you\'re still "starting tomorrow".', 'Stop. Breathe. Put the phone down and open VIKRAM. This is the last polite version.', 'You wanted me to be harsh. Here it is: this is how people end up regretting a whole year.', 'Every minute away is deleted from your verified time. You\'re paying for this scroll.', 'Enough. Back to work.']
  ];
  const LEVELS = [[0, 'Aspirant'], [1500, 'Analyst'], [5000, 'Associate'], [12000, 'Strategist'], [25000, 'Traveller'], [45000, 'Statesman']];

  // ---------- SEASONS: the same assistant for every phase of life ----------
  // A season has its own day types, blocks and habits. The plan (which season starts when) lives in settings.seasonPlan,
  // so past days keep the schedule they had. Block times of any day type can still be edited in More.
  const S0 = '2026-01-01';
  HABITS.push(
    { id: 'gym', t: 'Gym / strength 45 min', min: '15 min bodyweight', start: S0, cat: 'body' },
    { id: 'protein', t: 'Ate enough protein, drank 3 L water', min: 'One proper meal', start: S0, cat: 'body' },
    { id: 'workdeep', t: 'One deep hour on the most important work task', min: '25 focused minutes', start: S0, cat: 'work' },
    { id: 'skill', t: 'Learn 30 min (skill, course or side project)', min: '10 minutes', start: S0, cat: 'mind' },
    { id: 'spend', t: 'Logged today\'s spending', min: 'Logged it', start: S0, cat: 'money' },
    { id: 'write', t: 'Wrote 200 words', min: 'Wrote 3 lines', start: S0, cat: 'mind' },
    { id: 'explore', t: 'Saw or did one new thing', min: 'A 20-minute walk somewhere new', start: S0, cat: 'life' },
    { id: 'people', t: 'Talked to one new person', min: 'Called home', start: S0, cat: 'life' },
    { id: 'decide', t: 'UPSC vs MBA: 15 min of real research', min: 'Read one page about either', start: S0, cat: 'mind' },
    { id: 'revise', t: 'Revised yesterday for 20 min', min: '5-minute recall', start: S0, cat: 'prep' },
    { id: 'mock', t: 'Timed test or answer writing', min: '10 questions', start: S0, cat: 'prep' }
  );
  const night = (from, sleep) => [
    { s: from, e: sleep, t: 'Journal · brush · phone away', k: 'ritual', items: ['journal', 'brushPM'], nudge: '3 lines: one win, one lesson, tomorrow\'s first task. Then brush and put the phone away.' }
  ];
  const morning = [{ s: '05:30', e: '05:45', t: 'Wake · brush · water', k: 'ritual', items: ['brushAM'], nudge: 'Up. Brush, water, no phone.' }, { s: '05:45', e: '06:05', t: 'Meditation + puja', k: 'ritual', items: ['meditate', 'puja'] }];
  Object.assign(SCHEDULES, {
    work: { name: 'Work day', blocks: morning.concat([
      { s: '06:15', e: '07:30', t: 'Gym', k: 'body', items: ['gym'], nudge: 'Gym. The job pays for the life; the body carries it.' },
      { s: '07:30', e: '09:00', t: 'Bath · breakfast · commute', k: 'break', items: ['bath'] },
      { s: '09:00', e: '13:00', t: 'Work · hardest task first', k: 'prep', items: ['workdeep'], nudge: 'Start with the hardest task. One deep hour before email.' },
      { s: '13:00', e: '14:00', t: 'Lunch + 10-minute walk', k: 'break', items: ['walk'] },
      { s: '14:00', e: '18:30', t: 'Work', k: 'prep', items: [] },
      { s: '19:00', e: '19:45', t: 'Learn: skill or side project', k: 'mind', items: ['skill'], nudge: '30 minutes on the skill you picked. This is what compounds.' },
      { s: '19:45', e: '20:30', t: 'Dinner', k: 'break', items: ['protein'] },
      { s: '20:30', e: '21:15', t: 'Reading or hobby', k: 'hobby', items: ['reading', 'hobby'], nudge: 'Read 10 pages or do the hobby. Not the phone.' },
      { s: '21:15', e: '21:30', t: 'Log spending', k: 'mind', items: ['spend'] }]).concat(night('21:30', '22:00')) },
    weekend: { name: 'Weekend', blocks: morning.concat([
      { s: '07:00', e: '08:30', t: 'Long workout or sport', k: 'body', items: ['gym'], nudge: 'Weekend session. Go longer than usual.' },
      { s: '10:00', e: '12:00', t: 'Side project / writing', k: 'mind', items: ['skill', 'write'], nudge: 'Two hours on something that is yours.' },
      { s: '16:00', e: '18:00', t: 'People, outdoors, history', k: 'hobby', items: ['explore', 'history'] },
      { s: '20:00', e: '20:45', t: 'Weekly review + money check', k: 'mind', items: ['review', 'spend', 'reading'], nudge: 'Sunday: weekly review. What did the week buy you?' }]).concat(night('21:30', '22:00')) },
    road: { name: 'Travel day', blocks: [
      { s: '06:00', e: '06:30', t: 'Wake · move · meditate', k: 'ritual', items: ['brushAM', 'yoga', 'meditate'], nudge: 'New place, same first half hour.' },
      { s: '07:00', e: '13:00', t: 'Explore', k: 'hobby', items: ['explore', 'walk'], nudge: 'Go and see one thing you will remember.' },
      { s: '13:00', e: '15:00', t: 'Lunch + rest', k: 'break', items: [] },
      { s: '15:00', e: '18:00', t: 'People and places', k: 'hobby', items: ['people'] },
      { s: '18:30', e: '19:30', t: 'Write about today', k: 'mind', items: ['write'], nudge: 'Write 200 words about today while it is fresh.' },
      { s: '20:30', e: '21:00', t: 'Read + the big decision', k: 'mind', items: ['reading', 'decide'], nudge: '15 minutes on UPSC vs MBA. A year of travel is also a year to decide.' },
      { s: '21:00', e: '21:15', t: 'Log spending', k: 'mind', items: ['spend'] }].concat(night('21:15', '22:00')) },
    examday: { name: 'Exam prep day', blocks: ritual.concat([
      { s: '07:00', e: '10:00', t: 'Study block 1 · new material', k: 'prep', items: ['deep1'], nudge: 'Block 1. New material while the mind is fresh.' },
      { s: '10:00', e: '10:30', t: 'Breakfast + walk', k: 'break', items: [] },
      { s: '10:30', e: '13:00', t: 'Study block 2 · practice', k: 'prep', items: ['deep2'], nudge: 'Block 2: questions, not reading.' },
      { s: '13:00', e: '14:00', t: 'Lunch + walk (no bed)', k: 'break', items: ['noNap'] },
      { s: '14:00', e: '16:30', t: 'Timed test / answer writing', k: 'prep', items: ['mock'], nudge: 'Timed work. The exam is timed; so is this.' },
      { s: '16:30', e: '17:30', t: 'Gym or walk', k: 'body', items: ['gym'] },
      { s: '18:00', e: '19:00', t: 'Current affairs + revise', k: 'prep', items: ['revise'], nudge: 'Revise yesterday before learning anything new.' },
      { s: '20:00', e: '20:30', t: 'Reading', k: 'mind', items: ['reading'] }]).concat(night('20:30', '21:00')) }
  });
  const SEASONS = [
    { id: 'placement', n: 'Placement prep', g: 'Crack the job: aptitude, cases, projects, outreach.', types: ['study', 'class', 'sunday'].filter(k => SCHEDULES[k]).concat(Object.keys(SCHEDULES).filter(k => !['study', 'class', 'sunday', 'work', 'weekend', 'road', 'examday'].includes(k))), type: defaultDayType },
    { id: 'job', n: 'Job + gym year', g: 'Do the job well, build a strong body, save money, keep learning.', types: ['work', 'weekend'], type: ds => { const wd = new Date(ds + 'T00:00:00').getDay(); return wd === 0 || wd === 6 ? 'weekend' : 'work'; } },
    { id: 'travel', n: 'Travel year', g: 'See the world, write about it, and decide: UPSC or MBA.', types: ['road', 'weekend'], type: () => 'road' },
    { id: 'exam', n: 'UPSC / MBA prep', g: 'One exam, full focus, same discipline.', types: ['examday', 'weekend'], type: ds => new Date(ds + 'T00:00:00').getDay() === 0 ? 'weekend' : 'examday' }
  ];
  SEASONS[0].types = [...new Set(SEASONS[0].types)];
  let PLAN = [{ id: 'placement', from: '2000-01-01' }];
  const api = { DAY1, SCHEDULES, HABITS, HOBBY_PLAN, MODULES, PHASES, TASKS, BOOKS, FEED, LEVELS, NAG, SEASONS,
    setPlan(p) { const l = ((p && p.list) || []).filter(x => x && SEASONS.some(s => s.id === x.id) && /^\d{4}-\d\d-\d\d$/.test(x.from)); PLAN = [{ id: 'placement', from: '2000-01-01' }].concat(l).sort((a, b) => a.from < b.from ? -1 : a.from > b.from ? 1 : 0); },
    plan: () => PLAN.slice(1),
    seasonAt(ds) { let cur = PLAN[0]; PLAN.forEach(x => { if (x.from <= ds) cur = x; }); return SEASONS.find(s => s.id === cur.id); },
    defaultDayType(ds) { return api.seasonAt(ds).type(ds); } };
  return api;
})();
if (typeof module !== 'undefined') module.exports = VK_CONTENT;
