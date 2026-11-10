/* VIKRAM "Go further": free outside resources, so VIKRAM is a router to the best of the internet, not a closed world.
   Links checked on 10 Nov 2026. [title, url, why] */
var VK_RESOURCES = [
  { k: 'apt', t: 'Aptitude and puzzles', r: [
    ['IndiaBix', 'https://www.indiabix.com/', 'Thousands of topic-wise aptitude and reasoning questions with solutions. Use after VIKRAM\'s timed sets for volume.'],
    ['Khan Academy: Statistics and probability', 'https://www.khanacademy.org/math/statistics-probability', 'Free videos and exercises if a probability or statistics idea from A4 or D3 feels shaky.'],
    ['Jane Street puzzles', 'https://www.janestreet.com/puzzles/', 'A monthly puzzle from a top quant firm, with archives. Hard: one a month is plenty.']] },
  { k: 'case', t: 'Cases and consulting', r: [
    ['Bain: interviewing', 'https://www.bain.com/careers/hiring-process/interviewing/', 'How Bain runs case and fit interviews, with practice cases straight from the firm.'],
    ['Capital One careers', 'https://www.capitalonecareers.com/', 'Search for the analyst roles and read how their case-based interviews work.'],
    ['Y Combinator library', 'https://www.ycombinator.com/library', 'Free essays and talks on start-ups, metrics and growth: useful for product and VC cases.']] },
  { k: 'pm', t: 'Product', r: [
    ['Lenny\'s Newsletter', 'https://www.lennysnewsletter.com/', 'The most-read product newsletter; many posts are free. Read one a week before product interviews.'],
    ['SVPG articles (Marty Cagan)', 'https://www.svpg.com/articles/', 'Classic essays on product discovery and empowered teams.'],
    ['Paul Graham essays', 'https://paulgraham.com/articles.html', 'Short, clear essays on start-ups and thinking. "Do things that don\'t scale" pairs with your KiFayti story.']] },
  { k: 'fin', t: 'Finance', r: [
    ['Aswath Damodaran\'s pages', 'https://pages.stern.nyu.edu/~adamodar/', 'The valuation professor: free lectures, spreadsheets and datasets. The gold standard for F2.'],
    ['Investopedia', 'https://www.investopedia.com/', 'Quick definitions when a finance term comes up in a case or article.'],
    ['Reserve Bank of India', 'https://www.rbi.org.in/', 'Monetary policy statements and reports, the primary source for banking and macro questions.'],
    ['CFA Institute', 'https://www.cfainstitute.org/', 'If you lean finance after placements, this is where the CFA programme lives.']] },
  { k: 'data', t: 'SQL, Python and data', r: [
    ['SQLZoo', 'https://sqlzoo.net/', 'Free interactive SQL in the browser, from SELECT to joins. Pairs with module D1.'],
    ['Kaggle Learn', 'https://www.kaggle.com/learn', 'Free micro-courses on Python, pandas, SQL and machine learning, each a few hours.'],
    ['Our World in Data', 'https://ourworldindata.org/', 'Clean charts and datasets on almost every global topic: great for GD facts and practice analyses.']] },
  { k: 'ai', t: 'AI and ML', r: [
    ['Machine Learning Specialization (Andrew Ng)', 'https://www.coursera.org/specializations/machine-learning-introduction', 'The standard beginner course; you can audit it for free.'],
    ['fast.ai', 'https://course.fast.ai/', 'Free, practical deep learning course: build first, theory later.'],
    ['Neural Networks: Zero to Hero (Andrej Karpathy)', 'https://karpathy.ai/zero-to-hero.html', 'Build a GPT from scratch in a video series; the best way to understand LLM internals for M2.'],
    ['3Blue1Brown', 'https://www.youtube.com/@3blue1brown', 'Visual explanations of neural networks, linear algebra and probability.'],
    ['NPTEL', 'https://nptel.ac.in/', 'Free IIT courses with certificates, many in data science and finance.']] },
  { k: 'words', t: 'English and reading', r: [
    ['Merriam-Webster: Word of the Day', 'https://www.merriam-webster.com/word-of-the-day', 'One new word a day with examples and history.'],
    ['Vocabulary.com', 'https://www.vocabulary.com/', 'Adaptive vocabulary practice; good for a second daily set.'],
    ['The Hindu: editorials', 'https://www.thehindu.com/opinion/editorial/', 'Read one editorial a day for GD arguments and formal vocabulary.'],
    ['Aeon', 'https://aeon.co/', 'Free long essays on history, philosophy and science, written for curious non-experts.']] },
  { k: 'fr', t: 'French', r: [
    ['TV5Monde: Apprendre le français', 'https://apprendre.tv5monde.com/', 'Free lessons built on real TV news clips, sorted by level (start at A1).'],
    ['Duolingo', 'https://www.duolingo.com/', 'Five minutes a day as a warm-up; use VIKRAM\'s units for structure.']] },
  { k: 'chess', t: 'Chess', r: [
    ['Lichess: Learn', 'https://lichess.org/learn', 'Interactive basics: how pieces move, check, castling. Do this before VIKRAM lesson 2.'],
    ['Lichess: Practice', 'https://lichess.org/practice', 'Drills for checkmate patterns, tactics and basic endgames.'],
    ['Lichess: Puzzles', 'https://lichess.org/training', 'Unlimited rated puzzles once VIKRAM\'s daily set is done.']] },
  { k: 'hist', t: 'History and geopolitics', r: [
    ['NCERT textbooks', 'https://ncert.nic.in/textbook.php', 'Free official school textbooks; the history and polity ones are the base of UPSC preparation.'],
    ['Project Gutenberg', 'https://www.gutenberg.org/', 'Over 70,000 free public-domain books, including full versions of every text in VIKRAM\'s library.'],
    ['Wikisource', 'https://en.wikisource.org/wiki/Main_Page', 'Free transcribed originals: speeches, treaties, constitutions, old translations.'],
    ['Ministry of External Affairs', 'https://www.mea.gov.in/', 'Primary source for India\'s treaties, joint statements and foreign-policy speeches.'],
    ['CFR Backgrounders', 'https://www.cfr.org/backgrounders', 'Short explainers on conflicts, alliances and global institutions.']] },
  { k: 'habits', t: 'Habits and focus', r: [
    ['James Clear: articles', 'https://jamesclear.com/articles', 'Free articles behind Atomic Habits, the method VIKRAM\'s habit system uses.']] }
];
if (typeof module !== 'undefined') module.exports = VK_RESOURCES;
