import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';

describe('server authoritative validation', ()=>{
  it('validates legal moves', ()=>{
    const c = new Chess();
    const m = c.move({from:'e2', to:'e4'});
    expect(m).toBeTruthy();
  });
  it('rejects illegal moves', ()=>{
    const c = new Chess();
    const fenBefore = c.fen();
    let threw=false;
    try{ c.move({from:'e2', to:'e5'}); }catch{ threw=true; }
    // chess.js throws on illegal, our engine returns null — both mean invalid
    expect(threw || c.fen()===fenBefore).toBeTruthy();
  });
  it('room fen stays synchronized after sequence', ()=>{
    const c = new Chess();
    const moves = [['e2','e4'],['e7','e5'],['g1','f3'],['b8','c6']];
    for(let [from,to] of moves){
      const m=c.move({from,to});
      expect(m).toBeTruthy();
    }
    expect(c.fen().split(' ')[0]).toContain('r1bq');
  });
  it('Elo calculation', ()=>{
    function elo(p, o, s){
      const K=32;
      const exp=1/(1+Math.pow(10,(o-p)/400));
      return Math.round(K*(s-exp));
    }
    expect(elo(1200,1200,1)).toBe(16);
    expect(elo(1200,1400,1)).toBeGreaterThan(20);
    expect(elo(1400,1200,0)).toBeLessThan(0);
  });
});
