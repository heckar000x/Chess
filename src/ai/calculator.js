import { Search } from './search.js';
import { evaluateFromPerspective } from './evaluator.js';

/**
 * AGENT 2 — THE CALCULATOR
 * Deep Calculation and Technical Evaluation
 */
export class Calculator {
  constructor(options = {}) {
    this.depth = options.depth || 4;
    this.timeMs = options.timeMs || 2500;
    this.useTT = options.useTT !== false;
  }

  async calculate(chess, snapshot, predictorOutput) {
    const start = Date.now();
    const candidates = predictorOutput.candidates;
    if (!candidates || candidates.length===0) {
      return { agent: 'CALCULATOR', snapshotHash: snapshot.hash, evaluations: [], best: null, timeMs: 0 };
    }

    const evaluations = [];
    let timePerMove = Math.max(200, Math.floor((this.timeMs - (Date.now()-start) ) / candidates.length));

    for (let cand of candidates) {
      if (Date.now() - start > this.timeMs) break;
      const perMoveStart = Date.now();
      // Make candidate move
      const beforeFen = chess.fen();
      const moved = chess.move({ from: cand.from, to: cand.to, promotion: cand.promotion || 'q' });
      if (!moved) {
        evaluations.push({ ...cand, error:'illegal', score: -Infinity });
        continue;
      }

      // Deep search from opponent perspective
      const search = new Search(chess, { depth: this.depth, timeMs: timePerMove, useTT: this.useTT });
      const result = search.search();
      // Score from candidate mover perspective = - result.score (negamax returns from side to move)
      let finalScore = -result.score;

      // Additional technical metrics
      const materialCheck = evaluateFromPerspective(chess); // from opponent perspective, invert?
      // Detect forced mate
      let isMateThreat = false;
      let mateIn = null;
      if (Math.abs(result.score) > 90000) {
        isMateThreat = true;
        mateIn = result.pv.length;
        finalScore = result.score > 0 ? -99990 + mateIn : 99990 - mateIn; // adjust
        // but from our perspective
        finalScore = -result.score;
      }

      chess.undo();
      // Verify fen restored
      if (chess.fen() !== beforeFen) {
        // restore
        chess.load(beforeFen);
      }

      evaluations.push({
        id: cand.id,
        san: cand.san,
        from: cand.from,
        to: cand.to,
        promotion: cand.promotion,
        uci: cand.uci,
        score: finalScore,
        depth: result.depth,
        nodes: result.nodes,
        pv: result.pv.map(m=>m.san),
        pvMoves: result.pv,
        rawSearchScore: result.score,
        mateThreat: isMateThreat,
        mateIn,
        timeMs: Date.now() - perMoveStart,
        verifiedFen: beforeFen
      });

      // Early exit if found forced mate for us
      if (isMateThreat && finalScore > 90000) break;
    }

    evaluations.sort((a,b)=> b.score - a.score);

    const best = evaluations[0] || null;
    const worst = evaluations[evaluations.length-1] || null;

    return {
      agent: 'CALCULATOR',
      snapshotHash: snapshot.hash,
      fen: snapshot.fen,
      evaluations,
      best,
      worst,
      spread: best && worst ? best.score - worst.score : 0,
      timeMs: Date.now() - start,
      depth: this.depth,
      nodesTotal: evaluations.reduce((s,e)=>s+(e.nodes||0),0)
    };
  }
}
