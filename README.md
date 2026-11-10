# VIKRAM

Aryan's personal assistant for placements and life: an offline-first PWA for phone + laptop.

- **Today:** time-blocked day (5:00 → 21:00), checklist, score, streaks, comeback mode
- **Prep:** dated roadmap to Day 1 (1 Dec 2027), notes library, practice engine, flashcards, outreach CRM
- **Feed:** history Stories instead of reels (8 series: Alexander, Mughals, India's freedom struggle, Greek myths, Europe, Germany 1918–39, WWII, Cold War), plus one-minute cards (aptitude, quotes, French, chess puzzles)
- **Learn:** history from public-domain originals (with Wikipedia links), English vocabulary, French from zero, chess from zero
- **Accountability:** floating one-tap focus timer with escalating rude notifications if you leave, strict mode (habits tick from evidence), morning pledge, weekly review, partner report, stakes, optional partner emails
- **Go further:** checked free outside resources for every area
- **Life:** why + plan, habit heatmap, writing pad, books
- **Sync:** private GitHub repo · **Notifications:** Web Push via GitHub Actions + calendar alarms

Open `index.html` on the laptop to use it offline right away. See `SETUP.md` to put it on your phone with sync and notifications, and `docs/PRD.md` for the product case study.


Rebuilding generated content: `python3 tools/build_note.py` (notes), `python3 tools/build_library.py <raw_dir>` (history library; raw texts from Project Gutenberg and Wikisource), `python3 tools/build_chess.py <lichess_puzzles.csv>` (puzzles from the CC0 Lichess database).
Stories: card text in `stories/<id>.js`; images via `tools/stories/commons_search.py` + `fetch_images.py` (Wikimedia Commons, licences recorded in `js/story_img.js`); Wikipedia links checked with `tools/stories/check_wiki_links.py`. Map outlines: Natural Earth (public domain) in `js/land.js`.
