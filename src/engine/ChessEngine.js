import { Chess } from 'chess.js';

/**
 * ChessEngine — independent rules wrapper.
 * Uses chess.js internally but exposes validation, FEN, PGN, SAN, and draw detection.
 */
export class ChessEngine {
  constructor(fen) {
    this.chess = new Chess(fen);
    this.historySan = [];
    if (fen) {
      // chess.js already loaded fen
    }
  }

  static fromFen(fen) {
    return new ChessEngine(fen);
  }

  clone() {
    const c = new ChessEngine(this.fen());
    c.historySan = [...this.historySan];
    return c;
  }

  fen() { return this.chess.fen(); }
  pgn() { return this.chess.pgn(); }
  turn() { return this.chess.turn(); }
  isCheck() { return this.chess.isCheck(); }
  isCheckmate() { return this.chess.isCheckmate(); }
  isStalemate() { return this.chess.isStalemate(); }
  isDraw() { return this.chess.isDraw(); }
  isThreefoldRepetition() { return this.chess.isThreefoldRepetition(); }
  isInsufficientMaterial() { return this.chess.isInsufficientMaterial(); }
  isGameOver() { return this.chess.isGameOver(); }
  get(square) { return this.chess.get(square); }
  board() { return this.chess.board(); }
  history(opts) { return this.chess.history(opts); }
  moves(opts) { return this.chess.moves(opts); }
  getComments() { return []; }

  // Additional rules: 50-move, 75-move, fivefold
  isFiftyMoveRule() {
    const fenParts = this.fen().split(' ');
    const halfmove = parseInt(fenParts[4], 10);
    return halfmove >= 100;
  }
  isSeventyFiveMoveRule() {
    const fenParts = this.fen().split(' ');
    const halfmove = parseInt(fenParts[4], 10);
    return halfmove >= 150;
  }
  isFivefoldRepetition() {
    // chess.js only exposes threefold; we approximate by checking history count >=5 via manual hash repetition
    // We'll use position history tracking externally; for now return false and let server handle.
    return false;
  }

  getStatus() {
    if (this.isCheckmate()) return this.turn() === 'w' ? '0-1' : '1-0';
    if (this.isStalemate() || this.isDraw() || this.isFiftyMoveRule() || this.isInsufficientMaterial() || this.isThreefoldRepetition()) return '1/2-1/2';
    return '*';
  }

  getGameResult() {
    if (this.isCheckmate()) return { over: true, result: this.turn() === 'w' ? '0-1' : '1-0', reason: 'checkmate' };
    if (this.isStalemate()) return { over: true, result: '1/2-1/2', reason: 'stalemate' };
    if (this.isThreefoldRepetition()) return { over: true, result: '1/2-1/2', reason: 'threefold repetition' };
    if (this.isInsufficientMaterial()) return { over: true, result: '1/2-1/2', reason: 'insufficient material' };
    if (this.isFiftyMoveRule()) return { over: true, result: '1/2-1/2', reason: 'fifty-move rule' };
    if (this.isSeventyFiveMoveRule()) return { over: true, result: '1/2-1/2', reason: 'seventy-five-move rule' };
    return { over: false, result: '*', reason: null };
  }

  legalMoves(square) {
    if (square) return this.chess.moves({ square, verbose: true });
    return this.chess.moves({ verbose: true });
  }

  isLegalMove(from, to, promotion) {
    const moves = this.legalMoves(from);
    return moves.some(m => m.to === to && (!promotion || m.promotion === promotion || !m.promotion));
  }

  move({ from, to, promotion = 'q' }) {
    try {
      const m = this.chess.move({ from, to, promotion });
      if (m) {
        this.historySan.push(m.san);
        return m;
      }
      return null;
    } catch {
      return null;
    }
  }

  // For AI: make move object from verbose move
  moveVerbose(mv) {
    return this.move({ from: mv.from, to: mv.to, promotion: mv.promotion || 'q' });
  }

  undo() {
    const m = this.chess.undo();
    if (m) this.historySan.pop();
    return m;
  }

  loadPgn(pgn) {
    this.chess.loadPgn(pgn);
    this.historySan = this.chess.history();
  }

  // SAN generation
  getSanHistory() { return [...this.historySan]; }

  // Position hash for transposition / sync
  hash() {
    // Zobrist-like simple hash: fen without clocks
    const fen = this.fen();
    let h = 0;
    for (let i = 0; i < fen.length; i++) {
      h = ((h << 5) - h) + fen.charCodeAt(i);
      h |= 0;
    }
    return h.toString(16) + '-' + fen.split(' ').slice(0,4).join(' ');
  }

  // For snapshot sync
  snapshot() {
    return {
      fen: this.fen(),
      turn: this.turn(),
      legalMoves: this.legalMoves(),
      history: this.getSanHistory(),
      hash: this.hash(),
      isCheck: this.isCheck(),
      isGameOver: this.isGameOver(),
      halfmove: parseInt(this.fen().split(' ')[4], 10)
    };
  }
}

// Helper to validate FEN
export function isValidFen(fen) {
  try { new Chess(fen); return true; } catch { return false; }
}

// Move validation purely
export function validateMove(fen, from, to, promotion='q') {
  const eng = new ChessEngine(fen);
  return eng.isLegalMove(from, to, promotion);
}
