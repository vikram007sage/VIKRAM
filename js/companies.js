/* VIKRAM company target list. A starting map, not gospel: hiring changes every season, so confirm roles with your CDC friends,
   LinkedIn and careers pages. kgp:true = seen on IIT KGP's Day 1 (2024-25 Careers360 report). Comp figures are deliberately not stored. */
var VK_COMPANIES = (function () {
  const LANES = {
    an: { n: 'Analytics / decision science', test: 'DI + aptitude test, case (break-even, lending, acquisition), SQL/Python, puzzles, guesstimates', mods: 'A1 A2 A3 A4 S1 S2 B1 D1 D2 D3 M1', when: 'Campus (Sep–Dec) + off-campus internships Jan–Mar' },
    qt: { n: 'Quant trading / research', test: 'Mental maths (80-in-8), probability, sequences, games; trader rounds with market-making', mods: 'A1 A4 Q1 A2', when: 'Campus Day 1; global programmes apply online months early' },
    co: { n: 'Consulting', test: 'CV shortlist, case + guesstimate interviews, fit', mods: 'S1 S2 S5 S3 S4', when: 'Campus; boutiques and Big 4 strategy also off-campus' },
    pm: { n: 'Product (APM / product analyst)', test: 'Deck round, RCA + guesstimate, product design, metrics, HR', mods: 'P1 P2 P3 P4 S1 D1', when: 'Campus + rolling off-campus at startups' },
    fi: { n: 'Finance (banks, IB, research)', test: 'Aptitude + finance technicals + puzzles + fit', mods: 'F1 F2 F3 F5 A1–A4', when: 'Bulge-bracket programmes apply ~a year early; boutiques rolling' },
    vc: { n: 'VC / accelerator / founder\'s office', test: 'Startup memo or market-sizing case, thesis questions, fit', mods: 'F4 S5 S1 S2', when: 'Rolling, mostly unadvertised: cold outreach works best' },
    ai: { n: 'AI / deep-tech / agritech startups', test: 'Projects, ML + SQL basics, product sense; GenAI questions growing', mods: 'M1 M2 M3 M5 D1 D2', when: 'Rolling off-campus; founders reply to specific emails' }
  };
  const L = (lane, rows) => rows.map(([n, roles, fit, kgp]) => ({ n, lane, roles, fit: fit || '', kgp: !!kgp }));
  const LIST = [].concat(
    L('an', [
      ['Capital One', 'Business / data analyst', 'DI test + credit-card cases; your case wins help', 1], ['American Express', 'Analyst, decision science', 'Aptitude + SQL; card-economics cases'],
      ['Mastercard', 'Analyst, data & services', 'Payments analytics'], ['Visa', 'Analyst roles', 'Payments analytics'],
      ['EXL', 'Decision analytics', 'Large analytics recruiter'], ['ZS Associates', 'Decision analytics associate', 'Pharma + commercial analytics; biotech background is a plus'],
      ['Mu Sigma', 'Decision scientist', 'Volume analytics hirer'], ['Fractal Analytics', 'Analyst / consultant', 'AI + analytics consulting'],
      ['Tiger Analytics', 'Analyst', 'Analytics consulting'], ['Tredence', 'Analyst', 'Analytics consulting'],
      ['Axtria', 'Analyst', 'Life-sciences analytics: biotech fit'], ['LatentView Analytics', 'Analyst', 'Analytics consulting'],
      ['AB InBev GCC', 'Analytics', 'Global capability centre, Bengaluru'], ['Walmart Global Tech', 'Analytics roles', 'Retail analytics at scale'],
      ['Barclays', 'Analyst (risk / analytics)', 'Bank analytics'], ['HSBC', 'Analyst roles', 'Bank analytics'],
      ['PhonePe', 'Business / product analyst', 'Fintech analytics'], ['CRED', 'Business analyst', 'Fintech analytics']
    ]),
    L('qt', [
      ['Optiver', 'Quant trader', '80-in-8 + probability; no DSA for trader track', 1], ['Graviton Research Capital', 'Quant trader / researcher', 'Indian HFT', 1],
      ['Quantbox Research', 'Quant trader / researcher', 'Prop trading', 1], ['Squarepoint Capital', 'Quant roles', 'Global quant fund', 1],
      ['Ebullient Securities', 'Trader', 'Prop trading', 1], ['DE Shaw', 'Quant analyst / other tracks', 'Check non-SDE tracks', 1],
      ['Tower Research Capital', 'Quant trader / researcher', 'HFT'], ['Jane Street', 'Quant trader', 'Very selective'],
      ['AlphaGrep', 'Quant trader', 'Indian HFT'], ['NK Securities', 'Quant trader', 'Indian HFT'],
      ['APT Portfolio', 'Quant researcher', 'Systematic investing'], ['WorldQuant', 'Research consultant', 'Alpha research; part-time options exist'],
      ['Futures First', 'Derivatives trader', 'Trader programme']
    ]),
    L('co', [
      ['McKinsey & Company', 'Business analyst', 'Campus; casing + CV'], ['Boston Consulting Group', 'Associate', 'Campus; casing + CV'],
      ['Bain & Company', 'Associate consultant', 'Campus; casing'], ['Kearney', 'Business analyst', 'Strategy + operations'],
      ['Accenture Strategy', 'Analyst / consultant', 'Larger intake'], ['Monitor Deloitte', 'Analyst', 'Big 4 strategy'],
      ['EY-Parthenon', 'Analyst', 'Big 4 strategy'], ['PwC Strategy&', 'Analyst', 'Big 4 strategy'],
      ['KPMG (deal advisory / strategy)', 'Analyst', 'Big 4'], ['Alvarez & Marsal', 'Analyst', 'Restructuring + performance'],
      ['Oliver Wyman', 'Analyst', 'Financial services strategy'], ['L.E.K. Consulting', 'Associate', 'Strategy; has hired from KGP'],
      ['Praxis Global Alliance', 'Analyst', 'Indian boutique: accessible off-campus'], ['Redseer Strategy Consultants', 'Analyst', 'Consumer-internet research boutique'],
      ['Avalon Consulting', 'Analyst', 'Indian boutique'], ['Bain Capability Network', 'Analyst', 'Bain research arm'],
      ['Dalberg', 'Analyst', 'Development / impact: KiFayti story fits'], ['Sattva Consulting', 'Analyst', 'Impact consulting']
    ]),
    L('pm', [
      ['Flipkart', 'APM / product analyst', 'Deck round + RCA; your Open IIT q-commerce case is relevant'], ['Swiggy', 'APM / product analyst', 'Q-commerce, food'],
      ['Zomato (Eternal)', 'APM / product analyst', 'Food + Blinkit'], ['Zepto', 'APM / product analyst', 'Quick commerce'],
      ['Meesho', 'APM', 'Social commerce'], ['CRED', 'APM', 'Fintech, design-heavy'], ['Razorpay', 'APM', 'Payments'],
      ['PhonePe', 'APM', 'Payments'], ['Groww', 'APM', 'Investing app: your finance + product mix'], ['Paytm', 'APM', 'Fintech'],
      ['Navi', 'APM', 'Fintech'], ['CheQ', 'Product', 'You interned here: warm path'], ['Juspay', 'Product', 'Payments infra'],
      ['Uber', 'APM / analyst', 'Mobility'], ['Ola', 'Product', 'Mobility'], ['Rapido', 'Product', 'Mobility'],
      ['Microsoft', 'Product manager (new grad)', 'Campus'], ['Google', 'APM', 'Very selective'], ['Atlassian', 'APM', 'Programme-based'],
      ['Sprinklr', 'Product analyst / APM', 'Has hired PMs from KGP'], ['Dream11', 'Product', 'Gaming'], ['ShareChat', 'Product', 'Social'],
      ['Urban Company', 'Product', 'Services marketplace'], ['Nykaa', 'Product', 'Beauty e-commerce'], ['Myntra', 'Product', 'Fashion e-commerce'],
      ['MakeMyTrip', 'Product', 'Travel'], ['Lenskart', 'Product', 'D2C retail'], ['PhysicsWallah', 'Product', 'Edtech'],
      ['Postman', 'Product', 'Dev tools'], ['Freshworks', 'Product', 'SaaS'], ['Zoho', 'Product', 'SaaS']
    ]),
    L('fi', [
      ['Goldman Sachs', 'Summer analyst (various)', 'Applications open ~a year ahead'], ['J.P. Morgan', 'Analyst programmes', 'Year-ahead calendar'],
      ['Morgan Stanley', 'Analyst roles', ''], ['Barclays', 'Analyst roles', ''], ['Citi', 'Analyst roles', ''], ['Deutsche Bank', 'Analyst roles', ''],
      ['UBS', 'Analyst roles', ''], ['Nomura', 'Analyst roles', ''], ['BlackRock', 'Analyst roles', 'Asset management'],
      ['Avendus Capital', 'IB analyst', 'Indian mid-market IB'], ['Kotak Investment Banking', 'IB analyst', 'Indian IB'], ['Axis Capital', 'IB analyst', 'Indian IB'],
      ['JM Financial', 'IB / research analyst', 'Indian IB'], ['Equirus Capital', 'IB analyst', 'Boutique: off-campus friendly'],
      ['ICICI Securities', 'Research / IB', ''], ['Arcesium', 'Analyst (finance ops / tech)', 'Fund operations'],
      ['Deloitte / EY deal advisory', 'Deal analyst', 'Big 4 transaction services']
    ]),
    L('vc', [
      ['Blume Ventures', 'Analyst / intern', 'Early-stage'], ['Accel India', 'Analyst', 'Early-stage'], ['Peak XV Partners', 'Analyst', 'Multi-stage'],
      ['Elevation Capital', 'Analyst', 'Early-stage'], ['Z47 (formerly Matrix Partners India)', 'Analyst', 'Early-stage'],
      ['Lightspeed India', 'Analyst', 'Multi-stage'], ['Nexus Venture Partners', 'Analyst', 'Early-stage'], ['Kalaari Capital', 'Analyst', 'Early-stage'],
      ['Chiratae Ventures', 'Analyst', 'Early-stage'], ['Stellaris Venture Partners', 'Analyst', 'Early-stage SaaS/consumer'], ['3one4 Capital', 'Analyst', 'Early-stage'],
      ['Speciale Invest', 'Analyst', 'Deep-tech: strong KiFayti fit'], ['pi Ventures', 'Analyst', 'Deep-tech + AI: strong fit'],
      ['Ankur Capital', 'Analyst', 'Agri + deep-tech: strong fit'], ['Omnivore', 'Analyst', 'Agrifood: strong fit'],
      ['Antler India', 'Analyst / venture associate', 'Day-zero investing'], ['100X.VC', 'Analyst', 'Pre-seed'], ['Kae Capital', 'Analyst programme', 'Early-stage'],
      ['Venture Catalysts', 'Analyst', 'Angel network'], ['Inflection Point Ventures', 'Analyst', 'Angel network']
    ]),
    L('ai', [
      ['Sarvam AI', 'Product / analyst', 'Indian GenAI'], ['Krutrim', 'Product / analyst', 'Indian GenAI'], ['Glean', 'Check non-SDE roles', 'Enterprise AI search', 1],
      ['Observe.AI', 'Product / analyst', 'Conversation AI'], ['Uniphore', 'Product / analyst', 'Conversation AI'], ['Haptik', 'Product', 'Conversational AI'],
      ['Yellow.ai', 'Product', 'Conversational AI'], ['Gupshup', 'Product', 'Messaging + AI'], ['Qure.ai', 'Product / analyst', 'Medical imaging AI: biotech fit'],
      ['Niramai', 'Product / research', 'Health AI: biotech fit'], ['SigTuple', 'Product / research', 'Diagnostics AI: biotech fit'], ['Wadhwani AI', 'Fellow / analyst', 'AI for social good: agri + health'],
      ['CropIn', 'Product / analyst', 'Agritech: KiFayti fit'], ['DeHaat', 'Product / analyst', 'Agritech'], ['Fasal', 'Product / analyst', 'Agri IoT: sensors fit'],
      ['Ninjacart', 'Product / analyst', 'Agri supply chain'], ['Agrostar', 'Product / analyst', 'Agritech']
    ])
  );
  return { LANES, LIST };
})();
if (typeof module !== 'undefined') module.exports = VK_COMPANIES;
