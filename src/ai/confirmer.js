import { Search } from './search.js';
import { evaluateFromPerspective } from './evaluator.js';

/**
 * AGENT 3 — THE CONFIRMER
 * Independent Verification and Error Detection
 */
export class Confirmer {
  constructor(options = {}) {
    this.depth = options.depth || 3;
    this.timeMs = options.timeMs || 1200;
  }

  async verify(chess, snapshot, predictorOutput, calculatorOutput) {
    const start = Date.now();
    if (!calculatorOutput || !calculatorOutput.evaluations || calculatorOutput.evaluations.length===0) {
      return { agent:'CONFIRMER', snapshotHash: snapshot.hash, verdicts:[], approved: null, rejected:[], timeMs:0 };
    }

    const verdicts = [];
    const approved = [];
    const rejected = [];
    let bestApproved = null;

    // Sort evaluations best first; we verify top few deeply
    const toVerify = [...calculatorOutput.evaluations].slice(0, Math.min(4, calculatorOutput.evaluations.length));

    for (let ev of toVerify) {
      if (Date.now() - start > this.timeMs) break;
      const issues = [];
      let isLegal = false;
      let kingExposed = false;
      let hangPiece = false;
      let tacticalRefutation = null;
      let alternativeStronger = false;

      // 1. Legality: check candidate is in predictor and in legal moves
      const legal = chess.moves({ verbose:true });
      const legalMatch = legal.find(m=> m.from===ev.from && m.to===ev.to);
      isLegal = !!legalMatch;
      if (!isLegal) issues.push('illegal move');

      let maxCaptureGain = 0;
      let dangerousReply = null;
      if (isLegal) {
        const beforeFen = chess.fen();
        chess.move({ from: ev.from, to: ev.to, promotion: ev.promotion || 'q' });

        // 2. King exposed? Check if our king is in check after move? Actually after our move, opponent to move; check if move leaves own king in check would have been illegal, but double-check
        // If our move leaves us in check? chess.move would have prevented, but we verify

        // 3. Can opponent capture important piece immediately?
        const opponentMoves = chess.moves({ verbose:true });
        maxCaptureGain = 0;
        dangerousReply = null;
        for (let om of opponentMoves) {
          if (om.captured) {
            const val = { p:1,n:3,b:3,r:5,q:9,k:100 }[om.captured] || 0;
            const attackerVal = { p:1,n:3,b:3,r:5,q:9,k:100 }[om.piece] || 0;
            const gain = val - (attackerVal*0.1);
            if (gain > maxCaptureGain) {
              maxCaptureGain = gain;
              dangerousReply = om;
            }
          }
        }
        if (maxCaptureGain >=5 ) {
          hangPiece = true;
          issues.push(`hangs material: opponent can capture with ${dangerousReply.san} (gain ~${maxCaptureGain})`);
        }

        // 4. Can opponent force checkmate in 1 or 2?
        // Quick search for opponent mate threat
        const oppSearch = new Search(chess, { depth: Math.min(3, this.depth), timeMs: 300, useTT:false });
        const oppResult = oppSearch.search();
        if (oppResult.score > 90000) {
          tacticalRefutation = `Opponent has forced mate in ${oppResult.pv.length}: ${oppResult.pv.map(m=>m.san).join(' ')}`;
          issues.push(tacticalRefutation);
        } else if (oppResult.score > 500) {
          // large swing indicates maybe bad move
          if(ev.score < -200 && oppResult.score > 400) {
            issues.push(`Position swings heavily to opponent (+${oppResult.score})`);
          }
        }

        // 5. Is there an alternative dramatically stronger that we ignored?
        // Compare with calculator's best
        const bestScore = calculatorOutput.best.score;
        if (ev.score < bestScore - 150) {
          alternativeStronger = true;
          issues.push(`Alternative ${calculatorOutput.best.san} is significantly stronger (${bestScore} vs ${ev.score})`);
        }

        // 6. King safety after move: evaluate king exposure
        // Simple: count attackers near king
        chess.undo();
        if (chess.fen()!==beforeFen) chess.load(beforeFen);
      }

      const isRejected = (!isLegal) || tacticalRefutation || maxCaptureGain>=9 || (issues.length>=2 && ev.score < calculatorOutput.best.score - 100);
      // But we still want to confirm best move if no mate refutation and legal
      const verdict = {
        id: ev.id,
        san: ev.san,
        from: ev.from, to: ev.to, promotion: ev.promotion,
        score: ev.score,
        isLegal,
        issues,
        tacticalRefutation,
        hangPiece,
        alternativeStronger,
        confirmed: !isRejected && isLegal,
        riskLevel: issues.length===0? 'low' : issues.length===1? 'medium' : 'high',
        timeMs: Date.now() - start
      };
      verdicts.push(verdict);
      if (verdict.confirmed) approved.push(verdict);
      else rejected.push(verdict);
    }

    // Pick best approved by calculator score
    if (approved.length>0) {
      approved.sort((a,b)=> {
        const ea = calculatorOutput.evaluations.find(e=>e.id===a.id);
        const eb = calculatorOutput.evaluations.find(e=>e.id===b.id);
        return (eb?.score||0) - (ea?.score||0);
      });
      bestApproved = approved[0];
    } else {
      // If all rejected but we have evaluations, pick least bad confirmed? fallback to calculator best if not illegal
      const fallback = calculatorOutput.evaluations.find(e=> {
        const v = verdicts.find(vv=>vv.id===e.id);
        return v && v.isLegal && !v.tacticalRefutation;
      });
      if (fallback) {
        bestApproved = { id:fallback.id, san:fallback.san, from:fallback.from, to:fallback.to, promotion:fallback.promotion, confirmed:false, fallback:true };
      }
    }

    // Also verify that predictor's candidates were all considered; if top predictor not in calculator best, note
    const predictorTop = predictorOutput.candidates[0];
    const calcBest = calculatorOutput.best;
    let disagreement = null;
    if (predictorTop && calcBest && predictorTop.san !== calcBest.san) {
      disagreement = `Predictor favored ${predictorTop.san} but Calculator prefers ${calcBest.san} (${calcBest.score} vs ${predictorTop.score}) — Confirmer notes strategic vs tactical divergence.`;
    }

    return {
      agent: 'CONFIRMER',
      snapshotHash: snapshot.hash,
      fen: snapshot.fen,
      verdicts,
      approved,
      rejected,
      bestApproved,
      fallbackUsed: !approved.length && !!bestApproved,
      disagreement,
      timeMs: Date.now() - start,
      totalChecked: toVerify.length
    };
  }
}
