/**
 * AGENT 4 — THE PLAYER
 * Final Decision and Move Execution
 */

export class Player {
  constructor(options={}) {
    this.allowFallback = options.allowFallback !== false;
  }

  async decide(chess, snapshot, predictorOut, calculatorOut, confirmerOut) {
    const start = Date.now();

    // Validation: position has not changed (hash must match snapshot)
    const currentHash = (()=> {
      // compute hash same as engine: fen based
      let h=0; const fen=chess.fen();
      for(let i=0;i<fen.length;i++){ h=((h<<5)-h)+fen.charCodeAt(i); h|=0;}
      return h.toString(16)+'-'+fen.split(' ').slice(0,4).join(' ');
    })();
    if (currentHash !== snapshot.hash) {
      return {
        agent:'PLAYER',
        snapshotHash: snapshot.hash,
        currentHash,
        error:'stale position — snapshot outdated, aborting move',
        move:null,
        timeMs: Date.now()-start,
        stale:true
      };
    }

    if (chess.isGameOver()) {
      return { agent:'PLAYER', snapshotHash: snapshot.hash, error:'game already over', move:null, timeMs: Date.now()-start };
    }

    let chosen = null;
    let source = null;
    let reasoning = '';
    let confidence = 0;

    // Priority 1: Confirmer's best approved
    if (confirmerOut && confirmerOut.bestApproved && confirmerOut.bestApproved.confirmed) {
      const id = confirmerOut.bestApproved.id;
      chosen = calculatorOut.evaluations.find(e=> e.id===id) || predictorOut.candidates.find(c=>c.id===id);
      source = 'CONFIRMER_APPROVED';
      reasoning = `Confirmer approved ${chosen.san} after verification (${confirmerOut.bestApproved.riskLevel} risk).`;
      confidence = 0.95;
    }
    // Priority 2: Confirmer fallback (legal but not ideal)
    else if (confirmerOut && confirmerOut.bestApproved) {
      const id = confirmerOut.bestApproved.id;
      chosen = calculatorOut.evaluations.find(e=> e.id===id);
      source = 'CONFIRMER_FALLBACK';
      reasoning = `All top moves flagged; fallback to ${chosen.san} — least refuted.`;
      confidence = 0.65;
    }
    // Priority 3: Calculator best if confirmer failed or not available
    else if (calculatorOut && calculatorOut.best) {
      chosen = calculatorOut.best;
      source = 'CALCULATOR_BEST';
      reasoning = `No confirmer approval; using Calculator's best ${chosen.san} (score ${chosen.score}, depth ${chosen.depth}).`;
      confidence = 0.80;
    }
    // Priority 4: Predictor best
    else if (predictorOut && predictorOut.candidates.length>0) {
      chosen = predictorOut.candidates[0];
      source = 'PREDICTOR_BEST';
      reasoning = `Calculator unavailable; using Predictor's top candidate ${chosen.san}.`;
      confidence = 0.50;
    }

    if (!chosen) {
      return { agent:'PLAYER', snapshotHash: snapshot.hash, error:'no candidate available', move:null, timeMs: Date.now()-start };
    }

    // Final validation: is chosen move still legal in current position?
    const legal = chess.moves({ verbose:true });
    const stillLegal = legal.some(m=> m.from===chosen.from && m.to===chosen.to && (!chosen.promotion || m.promotion===chosen.promotion || !m.promotion));
    if (!stillLegal) {
      // Try to find legal alternative from calculator evaluations
      let fallback = null;
      if (calculatorOut) {
        for(let ev of calculatorOut.evaluations){
          if(legal.some(m=> m.from===ev.from && m.to===ev.to)){
            fallback = ev; break;
          }
        }
      }
      if (!fallback && predictorOut){
        for(let c of predictorOut.candidates){
          if(legal.some(m=> m.from===c.from && m.to===c.to)){
            fallback = c; break;
          }
        }
      }
      if (!fallback) fallback = legal[0]; // any legal
      // Convert fallback legal move to uniform format
      if (fallback && fallback.from) {
        chosen = fallback;
      } else if (fallback) {
        chosen = { from: fallback.from, to: fallback.to, promotion: fallback.promotion, san: fallback.san, uci: fallback.from+fallback.to+(fallback.promotion||'') };
      }
      source += '+LEGAL_FALLBACK';
      reasoning += ` Original choice illegal in current position; fallback to ${chosen.san || chosen.from+chosen.to}.`;
      confidence = Math.max(0.3, confidence-0.2);
    }

    // Ensure move object has required fields
    const finalMove = {
      from: chosen.from,
      to: chosen.to,
      promotion: chosen.promotion || (chosen.san && chosen.san.includes('=') ? chosen.san.slice(-1).toLowerCase() : 'q'),
      san: chosen.san,
      uci: chosen.uci || (chosen.from + chosen.to + (chosen.promotion||'')),
      source,
      confidence
    };

    // Do NOT execute on board here; let caller execute via engine.move to keep authority
    // But we verify that move would be legal via temporary
    const fenBefore = chess.fen();
    const testChess = (()=>{ try{ const { Chess } = require('chess.js'); }catch{} return null; })();
    // We already checked legality, so assume.

    return {
      agent:'PLAYER',
      snapshotHash: snapshot.hash,
      fen: snapshot.fen,
      turn: snapshot.turn,
      move: finalMove,
      source,
      reasoning,
      confidence,
      predictorTop: predictorOut?.candidates[0]?.san || null,
      calculatorTop: calculatorOut?.best?.san || null,
      confirmerVerdict: confirmerOut?.bestApproved?.san || null,
      agreement: (predictorOut?.candidates[0]?.san === calculatorOut?.best?.san && calculatorOut?.best?.san === confirmerOut?.bestApproved?.san) ? 'full' : 'partial',
      timeMs: Date.now()-start,
      snapshotValidated: currentHash===snapshot.hash,
      fenBefore
    };
  }
}
