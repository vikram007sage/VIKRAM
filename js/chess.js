/* VIKRAM chess from zero: 12 short lessons. Puzzles come from js/chess_puzzles.js (Lichess, CC0). */
var VK_CHESS = {
  START: '2027-01-15',
  LESSONS: [
    { id: 'board', t: 'The board and the pieces', p: 'coords',
      body: [
        'The board is 8 × 8. Place it so the bottom-right square is light ("light on the right"). Files are letters a–h from left to right; ranks are numbers 1–8 from White\'s side. Every square has a name: e4, d5, h7.',
        '## How the pieces move',
        'King: one square in any direction. Queen: any distance in a straight line or diagonal. Rook: any distance straight. Bishop: any distance diagonally, so it stays on one colour forever. Knight: an L (two squares one way, one square sideways) and it jumps over pieces. Pawn: one square forward (two on its first move), captures one square diagonally forward, and becomes a queen (or any piece) on the last rank.',
        '## What pieces are worth',
        'Pawn 1 · knight 3 · bishop 3 · rook 5 · queen 9. The king is priceless: the game ends when it is checkmated. Use these numbers before every trade.',
        '## Three special moves',
        'Castling: king two squares towards a rook, rook jumps over to the other side of the king. Allowed only if neither has moved, nothing is in between, and the king is not in check and does not pass through check. En passant: a pawn that moves two squares can be captured as if it had moved one, by an enemy pawn beside it, only on the very next move. Promotion: see pawn above.',
        '## Notation',
        'Moves are written with the piece letter and the target square: Nf3 (knight to f3), Bb5, Qxd5 (x means captures), e4 (pawns have no letter), O-O (castle short), + check, # checkmate.',
        'Practise the moves interactively in the free Lichess "Learn" course (lichess.org/learn), then do the square-naming drill below until you can name any square in under 2 seconds.'
      ] },
    { id: 'mate1', t: 'Check, checkmate and stalemate', p: 'mate1',
      body: [
        'Check: the king is attacked. You must get out of check at once, in one of three ways: move the king, block the attack, or capture the attacker.',
        'Checkmate: the king is in check and none of the three escapes works. Game over.',
        'Stalemate: the side to move is NOT in check but has no legal move. It is a draw, the classic beginner blunder when you are winning. When you are far ahead, always check your opponent still has a move.',
        '## How to find mates',
        'Look at the enemy king\'s escape squares first. Which ones are covered? Which piece can give check while covering the rest? Try every check, even the ones that look silly.'
      ] },
    { id: 'hanging', t: 'Free pieces: the blunder check', p: 'hanging',
      body: [
        'Most beginner games are decided by pieces left undefended ("hanging"). Before every move, ask three questions:',
        '1. What does my opponent\'s last move attack or threaten? 2. Is any of my pieces undefended or attacked more times than it is defended? 3. Can I take something for free?',
        'This takes ten seconds and will gain you more rating points than any opening. In these puzzles, something is simply left hanging: find it.'
      ] },
    { id: 'backrank', t: 'Back-rank mate', p: 'backrank',
      body: [
        'A king that has castled often sits behind its own three pawns. If an enemy rook or queen reaches the back rank, the king is trapped by its own pawns: checkmate.',
        'Attack: look for a rook or queen check on the back rank; first remove or distract the defender of that rank.',
        'Defence: give your king an escape square ("luft") with a quiet pawn move like h3 or g3 when you have a spare moment, and keep a rook on your back rank.'
      ] },
    { id: 'fork', t: 'Forks', p: 'fork',
      body: [
        'A fork is one piece attacking two targets at once. The opponent can only save one.',
        'Knights are the best forkers because their attack is hard to see. A knight checking the king and attacking the queen ("royal fork") usually wins the game. Pawns fork too: a pawn attacking a knight and a bishop wins a piece.',
        'Pattern to look for: two enemy pieces a knight\'s jump apart from one square, or a queen check that also attacks a loose piece.'
      ] },
    { id: 'pin', t: 'Pins', p: 'pin',
      body: [
        'A pin is when a piece cannot move without exposing a more valuable piece behind it. If the piece behind is the king, the pin is absolute: moving is illegal. If it is the queen or a rook, moving is just very costly.',
        'Bishops, rooks and queens create pins. Once a piece is pinned, attack it again, often with a pawn: it cannot run.'
      ] },
    { id: 'skewer', t: 'Skewers', p: 'skewer',
      body: [
        'A skewer is a pin in reverse: you attack a valuable piece, it moves away, and you capture the piece behind it.',
        'Typical: a bishop or rook checks the king, the king steps aside, and the queen or rook behind it falls. Look for enemy pieces lined up on the same file, rank or diagonal.'
      ] },
    { id: 'discovered', t: 'Discovered attacks', p: 'discovered',
      body: [
        'Move one piece out of the way and a piece behind it suddenly attacks. The moving piece can make its own threat at the same time, so you make two threats with one move.',
        'A discovered check is the strongest version: the opponent must answer the check, and your moving piece takes whatever it attacked. Look for your own pieces lined up behind each other aiming at the enemy king or queen.'
      ] },
    { id: 'opening', t: 'Opening principles', p: 'opening',
      body: [
        'You do not need to memorise openings to start. Follow five rules: 1. Put a pawn in the centre (e4 or d4). 2. Develop knights and bishops before moving the queen. 3. Castle early, usually within the first 10 moves. 4. Do not move the same piece twice without a reason. 5. Connect your rooks.',
        '## The trap every beginner meets',
        'Scholar\'s mate: White plays e4, Bc4 and Qh5 (or Qf3) and mates on f7. Defend f7 with ...Qe7, ...g6 or ...Nf6 at the right moment, and the early queen becomes a target you can chase with tempo.',
        '## A simple repertoire',
        'As White: 1.e4 e5 2.Nf3 Nc6 3.Bc4 (the Italian). As Black against 1.e4: 1...e5. Against 1.d4: 1...d5. Play these for months; understand the ideas, not the move lists.'
      ] },
    { id: 'mate2', t: 'Mate in two: checks, captures, threats', p: 'mate2',
      body: [
        'For every position, scan in this order: all checks, then all captures, then all threats (C-C-T). Strong players do this automatically.',
        'Mate-in-two puzzles usually start with a forcing move: a sacrifice that drags the king out, or a check that leaves only one reply. Calculate their reply before you move.'
      ] },
    { id: 'endgame', t: 'Endgame basics', p: 'endgame',
      body: [
        'King and queen against king: use the queen to shrink the king\'s box (stay a knight\'s move away from it), bring your own king up, then mate on the edge. Watch for stalemate when the box gets small.',
        'King and rook against king: the rook cuts the king off rank by rank; your king walks up opposite theirs; check from the side when the kings face each other.',
        'In every endgame your king becomes a fighting piece: bring it to the centre. A passed pawn (no enemy pawns in front or on the files beside it) must be pushed.'
      ] },
    { id: 'play', t: 'Your playing routine', p: 'mixed',
      body: [
        'Play on lichess.org (free, no ads): three rapid games a week at 10+5, more time than you think you need. Start against the computer at level 2–3, then play people.',
        'After every game: run the free computer analysis and find the first big mistake. Write one line in VIKRAM\'s writing pad: what you missed and the rule that would have caught it.',
        'Every day: 10 puzzles (VIKRAM\'s daily set below or Lichess puzzles). Slow and correct beats fast and wrong. Lichess starts everyone at 1500 and you will drop at first; a good first-year goal is to climb back above 1500 in rapid.'
      ] }
  ]
};
if (typeof module !== 'undefined') module.exports = VK_CHESS;
