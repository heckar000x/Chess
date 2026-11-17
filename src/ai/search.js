import { evaluate, evaluateFromPerspective } from './evaluator.js';

/**
 * Negamax search with alpha-beta, quiescence, move ordering, transposition
 */

export class Search {
  constructor(chess, options = {}) {
    this.chess = chess;
    this.maxDepth = options.depth || 3;
    this.maxTimeMs = options.timeMs || 1000;
    this.useTT = options.useTT !== false;
    this.tt = new Map();
    this.nodes = 0;
    this.startTime = 0;
    this.stop = false;
    this.bestMove = null;
    this.pv = [];
  }

  shouldStop() {
    if (this.stop) return true;
    if (Date.now() - this.startTime > this.maxTimeMs) return true;
    return false;
  }

  // Simple move ordering: captures first (MVV-LVA), checks, promotions
  orderMoves(moves, chess) {
    const pieceVal = { p:1, n:3, b:3, r:5, q:9, k:100 };
    return moves.sort((a,b)=>{
      let scoreA=0, scoreB=0;
      if(a.captured) scoreA += 10 + (pieceVal[a.captured]||0)*10 - (pieceVal[a.piece]||0);
      if(b.captured) scoreB += 10 + (pieceVal[b.captured]||0)*10 - (pieceVal[b.piece]||0);
      if(a.promotion) scoreA+= 20;
      if(b.promotion) scoreB+= 20;
      if(a.flags && a.flags.includes('k')) scoreA+=5;
      if(b.flags && b.flags.includes('k')) scoreB+=5;
      // check if move gives check? quick
      return scoreB - scoreA;
    });
  }

  quiescence(chess, alpha, beta, depth=0) {
    this.nodes++;
    if (this.shouldStop()) return evaluateFromPerspective(chess);
    const standPat = evaluateFromPerspective(chess);
    if (depth > 6) return standPat;
    if (standPat >= beta) return beta;
    if (alpha < standPat) alpha = standPat;

    let moves = chess.moves({ verbose:true });
    // only captures and promotions in quiescence
    moves = moves.filter(m=> m.captured || m.promotion);
    moves = this.orderMoves(moves, chess);
    for (const mv of moves) {
      chess.move({ from: mv.from, to: mv.to, promotion: mv.promotion || 'q' });
      const score = -this.quiescence(chess, -beta, -alpha, depth+1);
      chess.undo();
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
      if (this.shouldStop()) break;
    }
    return alpha;
  }

  negamax(chess, depth, alpha, beta, pvLine) {
    this.nodes++;
    if (this.shouldStop()) return evaluateFromPerspective(chess);
    const fenKey = chess.fen() + '|' + depth;
    if (this.useTT && this.tt.has(fenKey)) {
      const e = this.tt.get(fenKey);
      if (e.depth >= depth) return e.score;
    }
    if (chess.isCheckmate()) return -99999 + (this.maxDepth - depth);
    if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) return 0;
    if (depth === 0) {
      return this.quiescence(chess, alpha, beta, 0);
    }

    let moves = chess.moves({ verbose:true });
    if (moves.length===0) {
      if (chess.isCheck()) return -99999 + (this.maxDepth-depth);
      return 0;
    }
    moves = this.orderMoves(moves, chess);
    let bestScore = -Infinity;
    let bestLocalPv = [];
    let alphaOrig = alpha;

    for (let i=0;i<moves.length;i++) {
      const mv = moves[i];
      chess.move({ from: mv.from, to: mv.to, promotion: mv.promotion || 'q' });
      let childPv = [];
      let score = -this.negamax(chess, depth-1, -beta, -alpha, childPv);
      chess.undo();
      if (this.shouldStop()) break;
      if (score > bestScore) {
        bestScore = score;
        bestLocalPv = [mv, ...childPv];
        if (score > alpha) {
          alpha = score;
          pvLine.length = 0;
          pvLine.push(mv, ...childPv);
        }
      }
      if (alpha >= beta) break; // beta cutoff
    }

    if (this.useTT) {
      this.tt.set(fenKey, { score: bestScore, depth, flag: bestScore <= alphaOrig ? 'upper' : bestScore >= beta ? 'lower' : 'exact' });
    }
    // if no moveImproved, pvLine remains empty; ensure we at least have bestLocalPv
    if (pvLine.length===0 && bestLocalPv.length>0) {
      pvLine.push(...bestLocalPv);
    }
    return bestScore;
  }

  iterativeDeepening() {
    this.startTime = Date.now();
    this.nodes =0;
    this.tt.clear();
    let bestMove = null;
    let bestScore = -Infinity;
    let bestPv = [];
    let completedDepth = 0;

    for (let d=1; d<= this.maxDepth; d++) {
      if (this.shouldStop()) break;
      let pv = [];
      const score = this.negamax(this.chess, d, -Infinity, Infinity, pv);
      if (!this.shouldStop()) {
        if (pv.length>0) {
          bestMove = pv[0];
          bestPv = [...pv];
          bestScore = score;
          completedDepth = d;
        }
      } else {
        break;
      }
      // time management: if we used > 70% time, stop
      if (Date.now() - this.startTime > this.maxTimeMs * 0.75) break;
    }
    return {
      move: bestMove,
      score: bestScore,
      pv: bestPv,
      depth: completedDepth,
      nodes: this.nodes,
      timeMs: Date.now() - this.startTime
    };
  }

  search() {
    return this.iterativeDeepening();
  }

  // quick shallow search for candidate scoring
  static quickEvaluate(chess, move) {
    chess.move({ from: move.from, to: move.to, promotion: move.promotion || 'q'});
    const s = evaluateFromPerspective(chess);
    chess.undo();
    // return from original perspective: we moved, so invert?
    return -s;
  }
}

// Helper to run search on a fen string directly
export function searchBestMove(fen, opts) {
  const { Chess } = requireChess();
  const c = new Chess(fen);
  const s = new Search(c, opts);
  return s.search();
}
function requireChess(){
  // dynamic import workaround for CommonJS/ESM
  // We'll import via chess.js directly
  // This function is placeholder; actual usage passes Chess instance
  return { Chess: null };
}
