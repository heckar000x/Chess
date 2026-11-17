import { Predictor } from './predictor.js';
import { Calculator } from './calculator.js';
import { Confirmer } from './confirmer.js';
import { Player } from './player.js';
import { Chess } from 'chess.js';

/**
 * FOUR MINDS OMEGA PROTOCOL — Unified orchestrator
 * Implements 7-step synchronized workflow
 */

export class OmegaProtocol {
  constructor(options = {}) {
    const cfg = options.omega || {};
    this.predictor = new Predictor({
      breadth: cfg.breadth || 6,
      shallowDepth: cfg.predictorDepth || 2,
      timeMs: cfg.predictorTimeMs || 900
    });
    this.calculator = new Calculator({
      depth: cfg.calculatorDepth || 5,
      timeMs: cfg.calculatorTimeMs || 3500,
      useTT: true
    });
    this.confirmer = new Confirmer({
      depth: cfg.confirmerDepth || 4,
      timeMs: cfg.confirmerTimeMs || 1200
    });
    this.player = new Player();
    this.timeBudgetMs = cfg.timeBudgetMs || 7000;
    this.turnId = 0;
  }

  makeSnapshot(chess) {
    const fen = chess.fen();
    let h=0; for(let i=0;i<fen.length;i++){ h=((h<<5)-h)+fen.charCodeAt(i); h|=0;}
    const hash = h.toString(16)+'-'+fen.split(' ').slice(0,4).join(' ');
    return {
      fen,
      turn: chess.turn(),
      legalMoves: chess.moves({ verbose:true }),
      history: chess.history(),
      hash,
      isCheck: chess.isCheck(),
      turnId: ++this.turnId,
      timestamp: Date.now(),
      remainingBudget: this.timeBudgetMs
    };
  }

  async think(fen, opts = {}) {
    const chess = new Chess(fen);
    const snapshot = this.makeSnapshot(chess);
    const overallStart = Date.now();
    const timeoutMs = opts.timeMs || this.timeBudgetMs;

    // Helper with timeout race
    const withTimeout = (promise, ms, fallback) => {
      let timeout;
      const timeoutPromise = new Promise(resolve => {
        timeout = setTimeout(()=> resolve(fallback), ms);
      });
      return Promise.race([promise.then(v=> { clearTimeout(timeout); return v; }), timeoutPromise]);
    };

    // STEP 1 — SYNCHRONIZATION (snapshot already immutable)
    // STEP 2 — PREDICTION
    const predictorPromise = this.predictor.predict(chess, snapshot);
    let predictorOut = await withTimeout(predictorPromise, Math.min(1200, timeoutMs*0.2), {
      agent:'PREDICTOR', snapshotHash: snapshot.hash, candidates: chess.moves({verbose:true}).slice(0,6).map((m,i)=>({id:`P-${i+1}`, san:m.san, from:m.from, to:m.to, promotion:m.promotion, uci:m.from+m.to+(m.promotion||''), score:0, predictedVariation:[m.san]})),
      fallback:true, timeMs: timeoutMs*0.2
    });

    if (!predictorOut.candidates || predictorOut.candidates.length===0) {
      const legal = chess.moves({ verbose:true });
      if (legal.length===0) return { error:'no moves', snapshot, predictor: predictorOut };
      predictorOut.candidates = legal.slice(0,4).map((m,i)=>({id:`P-${i+1}`, san:m.san, from:m.from, to:m.to, promotion:m.promotion, uci:m.from+m.to+(m.promotion||'')}));
    }

    // STEP 3 — CALCULATION (parallel candidates, but staged)
    const remainingForCalc = Math.max(800, timeoutMs - (Date.now()-overallStart) - 600);
    this.calculator.timeMs = remainingForCalc;
    const calcStart = Date.now();
    let calculatorOut = await withTimeout(this.calculator.calculate(chess, snapshot, predictorOut), remainingForCalc, {
      agent:'CALCULATOR', snapshotHash: snapshot.hash, evaluations: predictorOut.candidates.map(c=>({id:c.id, san:c.san, from:c.from, to:c.to, promotion:c.promotion, uci:c.uci, score:c.score||0, depth:1, pv:[c.san]})),
      best: null, fallback:true
    });
    if (calculatorOut && !calculatorOut.best && calculatorOut.evaluations.length>0) {
      calculatorOut.evaluations.sort((a,b)=>b.score-a.score);
      calculatorOut.best = calculatorOut.evaluations[0];
    }

    // STEP 4 — VERIFICATION
    const remainingForConf = Math.max(400, timeoutMs - (Date.now()-overallStart) - 400);
    this.confirmer.timeMs = remainingForConf;
    let confirmerOut = await withTimeout(this.confirmer.verify(chess, snapshot, predictorOut, calculatorOut), remainingForConf, {
      agent:'CONFIRMER', snapshotHash: snapshot.hash, verdicts:[], approved:[], bestApproved: calculatorOut.best ? { id: calculatorOut.best.id, san: calculatorOut.best.san, from: calculatorOut.best.from, to: calculatorOut.best.to, promotion: calculatorOut.best.promotion, confirmed:false, fallback:true } : null,
      fallback:true
    });

    // STEP 5 — COLLABORATIVE DECISION (implicit in player)
    // STEP 6 — EXECUTION (player decides, caller executes)
    const playerOut = await this.player.decide(chess, snapshot, predictorOut, calculatorOut, confirmerOut);

    // STEP 7 — POSITION VALIDATION will be done after move execution by caller; we provide snapshot for comparison

    const totalTime = Date.now() - overallStart;

    return {
      protocol: 'OMEGA',
      snapshot,
      predictor: predictorOut,
      calculator: calculatorOut,
      confirmer: confirmerOut,
      player: playerOut,
      move: playerOut.move,
      totalTimeMs: totalTime,
      turnId: snapshot.turnId,
      synchronized: predictorOut.snapshotHash===snapshot.hash && calculatorOut.snapshotHash===snapshot.hash && confirmerOut.snapshotHash===snapshot.hash,
      agreement: playerOut.agreement,
      nodes: calculatorOut.nodesTotal || 0
    };
  }

  // Simplified single-call for non-omega levels (direct search)
  async thinkSimple(fen, level) {
    const chess = new Chess(fen);
    const snapshot = this.makeSnapshot(chess);
    const { Search } = await import('./search.js');
    const search = new Search(chess, { depth: level.depth, timeMs: level.timeMs, useTT: level.useTT });
    // Add blunder/noise for low levels
    let result = search.search();

    // Introduce deliberate imperfection
    if (level.blunderRate > 0 && Math.random() < level.blunderRate) {
      const legal = chess.moves({ verbose:true });
      // pick suboptimal move: second best or random
      if (legal.length > 1) {
        // find all moves and score quickly second tier
        // Instead just pick random non-best with probability
        if (result.move) {
          const alternatives = legal.filter(m=> !(m.from===result.move.from && m.to===result.move.to));
          if (alternatives.length>0) {
            const pick = alternatives[Math.floor(Math.random()* Math.min(3, alternatives.length))];
            result.move = pick;
            result.score += (Math.random()-0.5)* level.evaluationNoise;
            result.blunder = true;
          }
        }
      }
    } else if (level.evaluationNoise >0) {
      result.score += (Math.random()-0.5)* level.evaluationNoise * 2;
    }

    if (level.randomness >0 && Math.random() < level.randomness) {
      const legal = chess.moves({verbose:true});
      if (Math.random()<0.5 && legal.length>1) {
        // sometimes pick top 3 random
        const top3 = legal.slice(0, Math.min(5, legal.length));
        const rnd = top3[Math.floor(Math.random()*top3.length)];
        if (rnd) result.move = rnd;
      }
    }

    return {
      protocol: 'SIMPLE',
      snapshot,
      move: result.move ? { from: result.move.from, to: result.move.to, promotion: result.move.promotion || 'q', san: result.move.san, uci: result.move.from+result.move.to+(result.move.promotion||'') } : null,
      score: result.score,
      pv: result.pv,
      depth: result.depth,
      nodes: result.nodes,
      timeMs: result.timeMs,
      level: level.name,
      blunder: result.blunder || false
    };
  }
}

// Singleton for app
export const omega = new OmegaProtocol();
