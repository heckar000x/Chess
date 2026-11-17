import { Search } from './search.js';
import { getOpeningMove } from './openings.js';

/**
 * AGENT 1 — THE PREDICTOR
 * Strategic Prediction and Candidate Generation
 */
export class Predictor {
  constructor(options = {}) {
    this.breadth = options.breadth || 6;
    this.shallowDepth = options.shallowDepth || 2;
    this.timeMs = options.timeMs || 800;
  }

  /**
   * Analyze position and return candidate moves with predicted variations
   * @param { Chess } chess - chess.js instance (will not be mutated externally via clone)
   * @param {Object} snapshot - shared snapshot containing fen, history, hash, etc.
   */
  async predict(chess, snapshot) {
    const start = Date.now();
    const legal = chess.moves({ verbose: true });
    if (legal.length === 0) return { candidates: [], reasoning: 'no legal moves', snapshotHash: snapshot.hash, timeMs: 0 };

    // 1. Opening book suggestion
    const openingSan = getOpeningMove(snapshot.history);
    let openingCandidate = null;
    if (openingSan) {
      const match = legal.find(m => m.san === openingSan || m.san.startsWith(openingSan));
      if (match) openingCandidate = match;
    }

    // 2. Shallow search for each move to estimate potential
    const scored = [];
    for (const mv of legal) {
      if (Date.now() - start > this.timeMs) break;
      chess.move({ from: mv.from, to: mv.to, promotion: mv.promotion || 'q' });
      const search = new Search(chess, { depth: this.shallowDepth, timeMs: 150, useTT: false });
      const result = search.search();
      // Score from original perspective is -result.score (since we moved)
      const score = -result.score;
      chess.undo();

      // Add bonuses for strategic features
      let bonus = 0;
      if (mv.captured) bonus += 30;
      if (mv.promotion) bonus += 50;
      if (mv.flags.includes('k') || mv.flags.includes('q')) bonus += 20; // castling
      if (openingCandidate && mv.san === openingCandidate.san) bonus += 40;
      // Center control
      const center = ['e4','e5','d4','d5'];
      if (center.includes(mv.to)) bonus += 10;
      // Check bonus
      // we can test if move gives check by doing temp
      chess.move({ from: mv.from, to: mv.to, promotion: mv.promotion || 'q' });
      if (chess.isCheck()) bonus += 25;
      chess.undo();

      scored.push({
        move: mv,
        score: score + bonus,
        pv: result.pv,
        rawScore: result.score,
        flags: mv.flags,
        isCapture: !!mv.captured,
        isCheck: bonus >=25
      });
    }

    scored.sort((a,b)=> b.score - a.score);
    let top = scored.slice(0, this.breadth);

    // Ensure opening candidate is included if exists and not in top
    if (openingCandidate && !top.some(t=> t.move.from===openingCandidate.from && t.move.to===openingCandidate.to)) {
      const oc = scored.find(s=> s.move.san===openingCandidate.san);
      if (oc) {
        top.pop();
        top.push(oc);
        top.sort((a,b)=>b.score-a.score);
      }
    }

    // Add variation predictions: for each candidate, shallow PV already is predicted opponent response line
    const candidates = top.map((c, idx)=> ({
      id: `P-${idx+1}`,
      san: c.move.san,
      from: c.move.from,
      to: c.move.to,
      promotion: c.move.promotion,
      uci: c.move.from + c.move.to + (c.move.promotion||''),
      score: c.score,
      predictedVariation: [c.move.san, ...c.pv.map(m=>m.san)].slice(0,6),
      pv: c.pv,
      reasoning: this.describeReason(c, idx),
      isTactical: c.isCapture || c.isCheck,
      isOpening: openingCandidate && c.move.san===openingCandidate.san
    }));

    return {
      agent: 'PREDICTOR',
      snapshotHash: snapshot.hash,
      fen: snapshot.fen,
      turn: snapshot.turn,
      candidates,
      breadth: this.breadth,
      openingSuggestion: openingCandidate ? openingCandidate.san : null,
      timeMs: Date.now() - start,
      totalLegalMoves: legal.length
    };
  }

  describeReason(c, idx){
    if (idx===0) return "Highest strategic potential — controls center and anticipates opponent response.";
    if (c.isCapture) return "Tactical capture predicted to gain material or open lines.";
    if (c.isCheck) return "Checking move forcing opponent response.";
    if (c.score>50) return "Positional pressure — improves piece activity.";
    return "Solid developing move maintaining flexibility.";
  }
}
