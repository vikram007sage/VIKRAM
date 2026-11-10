"""Pick beginner puzzles for VIKRAM's chess course from the Lichess puzzle database (CC0).
Usage: python3 tools/build_chess.py <puzzles.csv>  -> writes js/chess_puzzles.js
Every puzzle is replayed with python-chess; for final mating moves, all alternative mates are accepted."""
import csv, sys, json, random, chess
random.seed(7)
LESSONS = [  # key, theme filter, max rating, count
    ('mate1', lambda t: 'mateIn1' in t, 800, 10),
    ('hanging', lambda t: 'hangingPiece' in t and 'oneMove' in t, 900, 8),
    ('backrank', lambda t: 'backRankMate' in t and ('mateIn1' in t or 'mateIn2' in t), 1000, 8),
    ('fork', lambda t: 'fork' in t and ('oneMove' in t or 'short' in t), 1000, 10),
    ('pin', lambda t: 'pin' in t and ('oneMove' in t or 'short' in t), 1100, 8),
    ('skewer', lambda t: 'skewer' in t and ('oneMove' in t or 'short' in t), 1100, 8),
    ('discovered', lambda t: 'discoveredAttack' in t and ('oneMove' in t or 'short' in t), 1100, 8),
    ('opening', lambda t: 'opening' in t and ('oneMove' in t or 'short' in t), 1000, 8),
    ('mate2', lambda t: 'mateIn2' in t, 1200, 10),
    ('endgame', lambda t: 'endgame' in t and ('mateIn1' in t or 'mateIn2' in t or 'oneMove' in t), 1000, 8),
    ('mixed', lambda t: ('oneMove' in t or 'short' in t), 1300, 160),
]
rows = []
with open(sys.argv[1]) as f:
    for r in csv.DictReader(f):
        try:
            if int(r['Popularity']) < 88 or int(r['NbPlays']) < 400 or int(r['RatingDeviation']) > 95: continue
        except ValueError: continue
        th = r['Themes'].split()
        if 'underPromotion' in th: continue
        rows.append((r, set(th)))
print('candidates', len(rows))
used, out = set(), {}
def check(r):
    b = chess.Board(r['FEN']); ms = r['Moves'].split()
    for i, u in enumerate(ms):
        mv = chess.Move.from_uci(u)
        if mv not in b.legal_moves: return None
        if i == len(ms) - 1:
            before = b.copy(); b.push(mv)
            alt = []
            if b.is_checkmate():
                for m2 in before.legal_moves:
                    c = before.copy(); c.push(m2)
                    if c.is_checkmate() and m2.uci() != u: alt.append(m2.uci())
            return alt
        b.push(mv)
for key, flt, maxr, n in LESSONS:
    pool = [(r, t) for r, t in rows if flt(t) and int(r['Rating']) <= maxr and r['PuzzleId'] not in used]
    pool.sort(key=lambda x: (-int(x[0]['Popularity']), -int(x[0]['NbPlays'])))
    pool = pool[:n * 6]; random.shuffle(pool)
    sel = []
    for r, t in pool:
        alt = check(r)
        if alt is None: continue
        sel.append({'id': r['PuzzleId'], 'fen': r['FEN'], 'm': r['Moves'], 'r': int(r['Rating']), 'alt': alt,
                    'th': [x for x in t if x in ('mateIn1', 'mateIn2', 'fork', 'pin', 'skewer', 'hangingPiece', 'discoveredAttack', 'backRankMate', 'endgame', 'opening', 'middlegame', 'sacrifice', 'promotion', 'deflection', 'attraction', 'doubleCheck', 'smotheredMate')]})
        used.add(r['PuzzleId'])
        if len(sel) >= n: break
    sel.sort(key=lambda p: p['r'])
    out[key] = sel
    print(key, len(sel), 'ratings', sel[0]['r'] if sel else '-', '→', sel[-1]['r'] if sel else '-')
with open('js/chess_puzzles.js', 'w') as f:
    f.write('/* Beginner puzzles from the Lichess puzzle database (CC0, database.lichess.org). Replayed and checked with python-chess by tools/build_chess.py. */\n')
    f.write('const VK_PUZZLES = ' + json.dumps(out, separators=(',', ':')) + ';\n')
    f.write("if (typeof module !== 'undefined') module.exports = VK_PUZZLES;\n")
