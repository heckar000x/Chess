/**
 * Positional evaluator
 * Material + Piece Square Tables + King safety + Mobility + Pawn structure
 */

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// Piece-square tables (white perspective, 0 = a8)
const PST = {
  p: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0
  ],
  n: [
   -50,-40,-30,-30,-30,-30,-40,-50,
   -40,-20,  0,  0,  0,  0,-20,-40,
   -30,  0, 10, 15, 15, 10,  0,-30,
   -30,  5, 15, 20, 20, 15,  5,-30,
   -30,  0, 15, 20, 20, 15,  0,-30,
   -30,  5, 10, 15, 15, 10,  5,-30,
   -40,-20,  0,  5,  5,  0,-20,-40,
   -50,-40,-30,-30,-30,-30,-40,-50
  ],
  b: [
   -20,-10,-10,-10,-10,-10,-10,-20,
   -10,  0,  0,  0,  0,  0,  0,-10,
   -10,  0,  5, 10, 10,  5,  0,-10,
   -10,  5,  5, 10, 10,  5,  5,-10,
   -10,  0, 10, 10, 10, 10,  0,-10,
   -10, 10, 10, 10, 10, 10, 10,-10,
   -10,  5,  0,  0,  0,  0,  5,-10,
   -20,-10,-10,-10,-10,-10,-10,-20
  ],
  r: [
      0,  0,  0,  0,  0,  0,  0,  0,
      5, 10, 10, 10, 10, 10, 10,  5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
      0,  0,  0,  5,  5,  0,  0,  0
  ],
  q: [
   -20,-10,-10, -5, -5,-10,-10,-20,
   -10,  0,  0,  0,  0,  0,  0,-10,
   -10,  0,  5,  5,  5,  5,  0,-10,
    -5,  0,  5,  5,  5,  5,  0, -5,
     0,  0,  5,  5,  5,  5,  0, -5,
   -10,  5,  5,  5,  5,  5,  0,-10,
   -10,  0,  5,  0,  0,  0,  0,-10,
   -20,-10,-10, -5, -5,-10,-10,-20
  ],
  k: [
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -20,-30,-30,-40,-40,-30,-30,-20,
   -10,-20,-20,-20,-20,-20,-20,-10,
    20, 20,  0,  0,  0,  0, 20, 20,
    20, 30, 10,  0,  0, 10, 30, 20
  ],
  k_end: [
   -50,-40,-30,-20,-20,-30,-40,-50,
   -30,-20,-10,  0,  0,-10,-20,-30,
   -30,-10, 20, 30, 30, 20,-10,-30,
   -30,-10, 30, 40, 40, 30,-10,-30,
   -30,-10, 30, 40, 40, 30,-10,-30,
   -30,-10, 20, 30, 30, 20,-10,-30,
   -30,-30,  0,  0,  0,  0,-30,-30,
   -50,-30,-30,-30,-30,-30,-30,-50
  ]
};

function squareIndex(file, rank) {
  // file 0-7 a-h, rank 0-7 1-8 ; board array is 8x8 with 0 = a8
  // rank 8 is row 0, rank 1 is row 7
  const row = 8 - rank;
  const col = file;
  return row * 8 + col;
}

export function evaluateBoard(chess) {
  // chess is Chess instance from chess.js
  const board = chess.board();
  let score = 0;
  let pieceCount = 0;
  // Count material for endgame detection
  let whiteMaterial = 0, blackMaterial = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      pieceCount++;
      const val = PIECE_VALUES[piece.type];
      if (piece.color === 'w') whiteMaterial += val;
      else blackMaterial += val;
      const idx = r*8 + c;
      // PST: white uses table as is mirrored? PST tables are white perspective from a8 perspective
      // For black, mirror vertically
      const pstVal = PST[piece.type] ? (piece.color === 'w' ? PST[piece.type][idx] : PST[piece.type][63-idx] * -1 ? 0:0) : 0;
      // Simpler: compute pst index
      let pst = 0;
      if (PST[piece.type]) {
        if (piece.color === 'w') pst = PST[piece.type][idx];
        else pst = PST[piece.type][63 - idx];
        // invert for black piece: we want black pieces to subtract
      }
      if (piece.type === 'k') {
        const isEndgame = (whiteMaterial + blackMaterial) < 3000; // rough
        const table = isEndgame ? PST.k_end : PST.k;
        if (piece.color === 'w') pst = table[idx];
        else pst = table[63 - idx];
      }
      const total = val + pst;
      if (piece.color === 'w') score += total;
      else score -= total;
    }
  }

  // Mobility bonus
  const turn = chess.turn();
  // we need to compute legal moves count without changing turn? chess.moves will give current turn only
  // Evaluate mobility as difference: clone and count
  try {
    const fen = chess.fen();
    const { Chess } = awaitImportChess(); // fallback placeholder
  } catch {}

  // Quick mobility using current moves vs opponent (approximate by counting)
  // We'll compute by temporarily swapping side to move via board analysis? Simpler: use move counts as is
  // Instead, compute pawn structure penalties
  // Doubled / isolated pawns
  let pawnScore = 0;
  const files = [[],[]]; // white pawn files, black
  for (let r=0;r<8;r++) for(let c=0;c<8;c++) {
    const p = board[r][c];
    if(p && p.type==='p'){
      if(p.color==='w') files[0].push(c);
      else files[1].push(c);
    }
  }
  // isolated pawn penalty
  for (let colorIdx=0;colorIdx<2;colorIdx++){
    const arr = files[colorIdx];
    for(let f of arr){
      const hasNeighbor = arr.some(x=> Math.abs(x-f)===1);
      if(!hasNeighbor) pawnScore += (colorIdx===0 ? -15 : 15);
    }
    // doubled
    const counts = {};
    for(let f of arr) counts[f]=(counts[f]||0)+1;
    for(let k in counts) if(counts[k]>1) pawnScore += (colorIdx===0? -20*(counts[k]-1): 20*(counts[k]-1));
  }
  score += pawnScore;

  // King safety: if king in check, penalty
  if (chess.isCheck()) {
    if (chess.turn() === 'w') score -= 50;
    else score += 50;
  }

  // Return from White perspective. For search we will return from side to move perspective via wrapper.
  // But here we return white-relative.
  return score;
}

// Synchronous wrapper that doesn't need async import
export function evaluate(chess) {
  const board = chess.board();
  let score = 0;
  let whiteMat = 0, blackMat = 0;
  for (let r=0;r<8;r++) for(let c=0;c<8;c++) {
    const piece = board[r][c];
    if(!piece) continue;
    const val = PIECE_VALUES[piece.type];
    if(piece.color==='w') whiteMat+=val; else blackMat+=val;
  }
  const isEndgame = (whiteMat+blackMat) < 3000;

  for(let r=0;r<8;r++) for(let c=0;c<8;c++) {
    const piece = board[r][c];
    if(!piece) continue;
    const idx = r*8 + c;
    let pst = 0;
    if(piece.type==='k'){
      const table = isEndgame ? PST.k_end : PST.k;
      pst = piece.color==='w' ? table[idx] : table[63-idx];
    } else if(PST[piece.type]) {
      pst = piece.color==='w' ? PST[piece.type][idx] : PST[piece.type][63-idx];
    }
    const total = PIECE_VALUES[piece.type] + pst;
    if(piece.color==='w') score+= total;
    else score-= total;
  }

  // pawn structure
  let whitePawnsPerFile = Array(8).fill(0), blackPawnsPerFile = Array(8).fill(0);
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p=board[r][c];
    if(p && p.type==='p'){
      if(p.color==='w') whitePawnsPerFile[c]++;
      else blackPawnsPerFile[c]++;
    }
  }
  for(let f=0;f<8;f++){
    if(whitePawnsPerFile[f]>1) score-= 20*(whitePawnsPerFile[f]-1);
    if(blackPawnsPerFile[f]>1) score+= 20*(blackPawnsPerFile[f]-1);
    // isolated
    if(whitePawnsPerFile[f]>0){
      const neighbor = (f>0 && whitePawnsPerFile[f-1]>0) || (f<7 && whitePawnsPerFile[f+1]>0);
      if(!neighbor) score-=15;
    }
    if(blackPawnsPerFile[f]>0){
      const neighbor = (f>0 && blackPawnsPerFile[f-1]>0) || (f<7 && blackPawnsPerFile[f+1]>0);
      if(!neighbor) score+=15;
    }
  }

  // center control bonus (simple)
  const center = [[3,3],[3,4],[4,3],[4,4]];
  for(let [r,c] of center){
    const p=board[r][c];
    if(p){
      if(p.color==='w') score+=10;
      else score-=10;
    }
  }

  // check bonus
  if(chess.isCheck()){
    if(chess.turn()==='w') score-=50;
    else score+=50;
  }

  // mobility: count legal moves quickly (clone fen)
  try {
    const movesW = (() => {
      const fen = chess.fen();
      // we can't easily get opponent moves without moving, so approximate via board
      return chess.moves().length;
    })();
    if(chess.turn()==='w') score += movesW*2;
    else score -= movesW*2;
  } catch {}

  if(chess.isCheckmate()){
    if(chess.turn()==='w') return -99999;
    else return 99999;
  }
  if(chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()){
    return 0;
  }

  return score;
}

function awaitImportChess(){ return null; }

export function evaluateFromPerspective(chess){
  const s = evaluate(chess);
  return chess.turn()==='w' ? s : -s;
}
