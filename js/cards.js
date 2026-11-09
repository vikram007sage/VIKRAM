/* VIKRAM flashcards (spaced repetition). id must never change once shipped (it keys your review history). */
var VK_CARDS = (function () {
  const D = (deck, rows) => rows.map(([id, f, b]) => ({ id: deck + '-' + id, deck, f, b }));
  return [].concat(
    D('math', [
      ['f8', '1/8 as %', '12.5%'], ['f6', '1/6 as %', '16.67%'], ['f7', '1/7 as %', '14.29%'], ['f9', '1/9 as %', '11.11%'], ['f11', '1/11 as %', '9.09%'], ['f12', '1/12 as %', '8.33%'], ['f3', '3/8 as %', '37.5%'], ['f58', '5/8 as %', '62.5%'],
      ['sq13', '13²', '169'], ['sq17', '17²', '289'], ['sq19', '19²', '361'], ['sq23', '23²', '529'], ['sq25', '25²', '625'], ['sq29', '29²', '841'],
      ['x25', 'Fast way to do 48 × 25', '× 100 ÷ 4 → 4,800 ÷ 4 = 1,200'], ['diffsq', '17 × 19 fast', '(18 − 1)(18 + 1) = 18² − 1 = 323'],
      ['succ', 'Successive % change a then b (shortcut)', 'a + b + ab/100 (use negatives for falls). +20 then −20 → −4%'],
      ['r72', 'Rule of 72', 'Years to double ≈ 72 ÷ growth rate (%). 12% → 6 years'],
      ['crore', '1 crore in millions', '10 million. 100 crore = 1 billion; 1 lakh = 100,000']
    ]),
    D('apt', [
      ['si', 'Simple interest formula', 'SI = P × r × t / 100'], ['ci', 'Compound amount formula', 'A = P(1 + r/100)ⁿ; CI = A − P'],
      ['avgsp', 'Average speed over equal distances at u and v', '2uv / (u + v) (harmonic mean), not (u+v)/2'],
      ['kmph', 'km/h → m/s', '× 5/18 (so 72 km/h = 20 m/s)'], ['train', 'Train crossing a platform: distance covered', 'Train length + platform length'],
      ['work', 'A does a job in a days, B in b days. Together?', 'ab / (a + b) days (rates add: 1/a + 1/b)'],
      ['allig', 'Alligation rule', 'cheap : dear = (dear − mean) : (mean − cheap)'],
      ['lcmhcf', 'Relation between LCM and HCF of two numbers', 'LCM × HCF = product of the numbers'],
      ['pl', 'Profit % on marked-up then discounted goods (m%, d%)', '(1 + m)(1 − d) − 1'],
      ['npr', 'nPr vs nCr', 'nPr = n!/(n−r)! (order matters); nCr = n!/(r!(n−r)!) (order doesn\'t)'],
      ['rep', 'Arrangements of n letters with repeats p, q, …', 'n! / (p! q! …)'],
      ['circ', 'Ways to seat n people around a round table', '(n − 1)!']
    ]),
    D('prob', [
      ['comp', 'P(at least one)', '1 − P(none)'], ['cond', 'Conditional probability', 'P(A|B) = P(A and B) / P(B)'],
      ['bayes', 'Bayes\' theorem', 'P(A|B) = P(B|A) P(A) / P(B)'], ['ev', 'Expected value', 'Σ (value × probability)'],
      ['dice7', 'Most likely sum of two dice', '7 (6 of 36 outcomes)'], ['geo', 'Expected tosses until the first head (fair coin)', '2 (geometric: 1/p)'],
      ['hh', 'Expected tosses until two heads in a row', '6'], ['ind', 'Independent events', 'P(A and B) = P(A) × P(B)'],
      ['lin', 'Linearity of expectation', 'E[X + Y] = E[X] + E[Y], even if X and Y are dependent'],
      ['var', 'Variance', 'E[X²] − (E[X])²']
    ]),
    D('case', [
      ['prof', 'Profitability tree', 'Profit = Revenue (price × volume) − Costs (fixed + variable). Find which branch moved.'],
      ['entry', 'Market entry: 4 questions', 'Is the market attractive? Can we win (competition, capabilities)? How to enter (build/buy/partner)? Does it pay (economics, risks)?'],
      ['4p', 'The 4 Ps', 'Product, Price, Place, Promotion'], ['porter', 'Porter\'s five forces', 'Rivalry, new entrants, substitutes, buyer power, supplier power'],
      ['mece', 'MECE', 'Mutually exclusive, collectively exhaustive: no overlaps, no gaps'],
      ['be', 'Break-even units', 'Fixed costs ÷ (price − variable cost per unit)'],
      ['guess', 'Guesstimate 6 steps', 'Clarify → approach → segment → assume & compute → sanity check → summarise + so-what'],
      ['india', 'India population anchor (2026)', '~148 crore (say ~150 crore); urban ~37%'],
      ['rca', 'Root cause analysis opener', 'Clarify the metric and timeframe → internal vs external → segment (user, platform, geo, funnel step) → hypothesise → test']
    ]),
    D('cards', [
      ['inter', 'Interchange', 'Fee paid by the merchant\'s bank to the card-issuing bank on each card transaction'],
      ['revenue', 'How a card issuer makes money', 'Interchange, interest on revolving balances, fees (annual, late, forex)'],
      ['costs', 'Card issuer\'s main costs', 'Credit losses (charge-offs), rewards, customer acquisition, cost of funds, operations'],
      ['nim', 'Net interest margin', '(Interest earned − interest paid) ÷ interest-earning assets'],
      ['co', 'Charge-off', 'A debt the lender writes off as unlikely to be collected'],
      ['revolver', 'Revolver vs transactor', 'Revolver carries a balance and pays interest; transactor pays in full each month (earns issuer mostly interchange)'],
      ['cac', 'CAC payback', 'Customer acquisition cost ÷ monthly margin per customer'],
      ['ltv', 'LTV : CAC rule of thumb', 'Aim for LTV at least ~3× CAC']
    ]),
    D('fin', [
      ['ev', 'Enterprise value', 'Equity value + debt − cash (+ minority interest, preferred)'],
      ['ebitda', 'EBITDA', 'Earnings before interest, taxes, depreciation and amortisation'],
      ['wacc', 'WACC', 'E/V × cost of equity + D/V × cost of debt × (1 − tax)'],
      ['capm', 'CAPM cost of equity', 'Rf + β × (market return − Rf)'],
      ['fcf', 'Free cash flow to firm', 'EBIT(1 − t) + D&A − capex − Δ working capital'],
      ['dep', 'Depreciation +₹10 (tax 25%): effect on the 3 statements', 'IS: net income −7.5. CF: −7.5 + 10 add-back = cash +2.5. BS: PP&E −10, cash +2.5 (assets −7.5) = retained earnings −7.5'],
      ['pe', 'P/E', 'Share price ÷ EPS (equity-value multiple)'],
      ['evebitda', 'Why EV/EBITDA over P/E for comparisons?', 'It ignores capital structure and non-cash D&A, so firms with different debt levels compare fairly'],
      ['ctc', 'CTC vs in-hand', 'CTC includes bonus, PF, stock, perks; in-hand monthly is usually well below CTC ÷ 12']
    ]),
    D('pm', [
      ['nsm', 'North-star metric', 'One metric that captures the value users get (e.g., orders delivered, nights booked)'],
      ['dau', 'Stickiness', 'DAU ÷ MAU'], ['ret', 'Retention curve', 'Share of a cohort still active after N days; look for it to flatten'],
      ['circles', 'CIRCLES (product design)', 'Comprehend, Identify users, Report needs, Cut through prioritisation, List solutions, Evaluate trade-offs, Summarise'],
      ['ab', 'A/B test must-haves', 'Hypothesis, one primary metric, guardrails, sample size / power, randomisation, fixed duration'],
      ['funnel', 'AARRR', 'Acquisition, activation, retention, referral, revenue'],
      ['rice', 'RICE prioritisation', '(Reach × Impact × Confidence) ÷ Effort']
    ]),
    D('sql', [
      ['order', 'SQL logical order of execution', 'FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT'],
      ['having', 'WHERE vs HAVING', 'WHERE filters rows before grouping; HAVING filters groups after aggregation'],
      ['left', 'LEFT JOIN', 'All rows from the left table; matching right rows or NULL'],
      ['rank', 'ROW_NUMBER vs RANK vs DENSE_RANK', 'Ties: ROW_NUMBER unique 1,2,3; RANK 1,1,3; DENSE_RANK 1,1,2'],
      ['nth', 'Second highest salary (idea)', 'DENSE_RANK() OVER (ORDER BY salary DESC) = 2, or MAX where salary < MAX'],
      ['null', 'COUNT(*) vs COUNT(col)', 'COUNT(*) counts rows; COUNT(col) skips NULLs']
    ]),
    D('ml', [
      ['bv', 'Bias vs variance', 'High bias: underfits (train error high). High variance: overfits (train low, test high)'],
      ['pr', 'Precision vs recall', 'Precision = TP/(TP+FP): of predicted positives, how many right. Recall = TP/(TP+FN): of actual positives, how many found'],
      ['f1', 'F1 score', 'Harmonic mean of precision and recall'],
      ['auc', 'ROC-AUC', 'Probability the model ranks a random positive above a random negative'],
      ['reg', 'L1 vs L2 regularisation', 'L1 (lasso) can zero out weights (feature selection); L2 (ridge) shrinks them smoothly'],
      ['leak', 'Data leakage', 'Information from outside the training data (or the future) sneaks into features, inflating scores'],
      ['rag', 'RAG in one line', 'Retrieve relevant documents, put them in the prompt, generate a grounded answer']
    ])
  );
})();
if (typeof module !== 'undefined') module.exports = VK_CARDS;
