/**
 * Web Worker for Omega AI — keeps UI responsive
 */
import { OmegaProtocol } from '../ai/omega.js';
import { Chess } from 'chess.js';

const omega = new OmegaProtocol();

self.onmessage = async (e) => {
  const { id, fen, level, omegaOpts, type } = e.data;
  try {
    if (type === 'omega' || (level && level.isOmega)) {
      const res = await omega.think(fen, { timeMs: omegaOpts?.timeBudgetMs || level?.omega?.timeBudgetMs || 7000 });
      self.postMessage({ id, success: true, result: res });
    } else {
      const res = await omega.thinkSimple(fen, level);
      self.postMessage({ id, success: true, result: res });
    }
  } catch (err) {
    self.postMessage({ id, success: false, error: err.message || String(err) });
  }
};
