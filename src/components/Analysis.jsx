import React, { useState } from 'react';
import { Chess } from 'chess.js';
import { Board } from './Board.jsx';
import { Search } from '../ai/search.js';
import { evaluate } from '../ai/evaluator.js';

export function Analysis({ onBack }){
  const [pgn, setPgn] = useState('');
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [ Moves, setMoves ] = useState([]);
  const [ply, setPly] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  const chess = new Chess();
  // reconstruct to ply
  try{
    if(pgn){
      chess.loadPgn(pgn);
      const hist = chess.history({verbose:true});
      setTimeout(()=>{},0);
      // we need to reset: instead create new and replay
    }
  }catch{}

  // Build position at ply
  const pos = new Chess();
  let historySan = [];
  if(pgn){
    try{ const tmp=new Chess(); tmp.loadPgn(pgn); historySan=tmp.history(); }catch{}
    for(let i=0;i<Math.min(ply, historySan.length); i++){
      try{ pos.move(historySan[i]); }catch{}
    }
  } else {
    try{ pos.load(fen); }catch{}
  }
  const evalScore = (()=>{ try{ return evaluate(pos); }catch{ return 0; }})();

  function analyze(){
    const c = new Chess(pos.fen());
    const s = new Search(c, {depth:3, timeMs:1200});
    const r = s.search();
    setAnalysis({ best: r.move? r.move.san : '—', score: r.score, pv: r.pv.map(m=>m.san).join(' '), depth: r.depth, nodes: r.nodes });
  }

  return (
    <div>
      <div className="row" style={{marginBottom:14}}>
        <button className="btn btn-ghost btn-small" onClick={onBack}>← Menu</button>
        <h2 className="cinzel" style={{margin:'0 0 0 12px'}}>Game Analysis</h2>
      </div>

      <div className="game-layout" style={{gridTemplateColumns:'380px 1fr'}}>
        <div className="panel">
          <div className="panel-title">Load Position</div>
          <label style={{fontSize:12, fontWeight:700}}>PGN</label>
          <textarea value={pgn} onChange={e=> {setPgn(e.target.value); setPly(0); setAnalysis(null);}} placeholder="Paste PGN here — e.g. 1. e4 e5 2. Nf3 ..." rows={5} style={{width:'100%', padding:10, borderRadius:10, border:'1px solid var(--border)', background:'#0f172a', color:'var(--text)', fontFamily:'JetBrains Mono', fontSize:12}} />
          <label style={{fontSize:12, fontWeight:700, marginTop:8}}>or FEN</label>
          <input value={fen} onChange={e=> setFen(e.target.value)} placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" style={{width:'100%', padding:'10px 12px', borderRadius:10, border:'1px solid var(--border)', background:'#0f172a', color:'var(--text)', fontFamily:'JetBrains Mono', fontSize:11}} />
          <div className="row" style={{marginTop:10}}>
            <button className="btn btn-ghost btn-small" onClick={()=>{setPgn(''); setFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'); setPly(0);}}>Reset</button>
            <button className="btn btn-primary btn-small" onClick={analyze}>Analyze Position</button>
          </div>

          <div className="divider" />
          <div className="panel-title">Navigation</div>
          <div className="row" style={{marginTop:8}}>
            <button className="btn btn-ghost btn-small" disabled={ply===0} onClick={()=> setPly(p=> Math.max(0,p-1))}>‹ Prev</button>
            <button className="btn btn-ghost btn-small" disabled={ply>= (historySan.length||1)} onClick={()=> setPly(p=> p+1)}>Next ›</button>
            <span className="muted" style={{fontSize:12, marginLeft:'auto'}}>Ply {ply} / {historySan.length||1}</span>
          </div>
          <div style={{display:'flex', flexWrap:'wrap', gap:6, marginTop:10}}>
            {historySan.map((s,i)=> (
              <span key={i} className="kbd" style={{background: i<ply?'var(--accent)':'#0f172a', color: i<ply?'#0f172a':'var(--muted)', borderColor: i<ply?'#f59e0b':'var(--border)', cursor:'pointer'}} onClick={()=> setPly(i+1)}>{Math.floor(i/2)+1}{i%2===0?'.':'. ..'} {s}</span>
            ))}
            {historySan.length===0 && <span className="muted" style={{fontSize:12}}>No PGN loaded — showing FEN position.</span>}
          </div>

          <div className="divider" />
          <div className="panel-title">Engine Evaluation</div>
          <div style={{marginTop:8, background:'#0f172a', border:'1px solid var(--border)', borderRadius:12, padding:12}}>
            <div className="row" style={{justifyContent:'space-between'}}><span className="muted">Score (white perspective)</span><b style={{color: evalScore>100?'#10b981': evalScore<-100?'#ef4444':'var(--text)'}}>{evalScore>0?`+${(evalScore/100).toFixed(2)}`: (evalScore/100).toFixed(2)} </b></div>
            <div style={{height:8, background:'#1e293b', borderRadius:999, overflow:'hidden', marginTop:8, border:'1px solid var(--border)'}}>
              <div style={{height:'100%', width: `${50 + Math.max(-50, Math.min(50, evalScore/20))}%`, background: evalScore>0?'linear-gradient(90deg,#10b981,#34d399)':'linear-gradient(90deg,#ef4444,#f87171)', transition:'width .3s'}}></div>
            </div>
            {analysis ? (
              <div style={{marginTop:10, fontSize:12, lineHeight:1.6}}>
                <div><b>Best move:</b> <span style={{color:'var(--accent)'}}>{analysis.best}</span> • score {analysis.score} • depth {analysis.depth}</div>
                <div><b>PV:</b> {analysis.pv || '—'}</div>
                <div className="muted">Nodes {analysis.nodes}</div>
              </div>
            ) : <div className="muted" style={{fontSize:12, marginTop:8}}>Tap Analyze to get best-move suggestion and principal variation.</div>}
          </div>
        </div>

        <div className="board-wrap">
          <div className="board-frame" style={{maxWidth:520}}>
            <Board chess={pos} selected={null} legalHints={[]} lastMove={null} isCheck={pos.isCheck()} flipped={false} onSquareClick={()=>{}} showHints={false} />
            <div className="row" style={{justifyContent:'space-between', marginTop:10, fontSize:12, color:'var(--muted)'}}>
              <span>Turn: <b style={{color:'#f1f5f9'}}>{pos.turn()==='w'?'White':'Black'}</b> {pos.isCheck() && <span style={{color:'#ef4444'}}>• Check</span>}</span>
              <span style={{fontFamily:'JetBrains Mono', fontSize:11}}>{pos.fen().slice(0,36)}…</span>
            </div>
          </div>
          <div className="panel" style={{maxWidth:520, width:'100%'}}>
            <div className="panel-title">How to use</div>
            <ul className="muted" style={{margin:'8px 0 0 18px', fontSize:13, lineHeight:1.6}}>
              <li>Paste a PGN from any game (or type FEN).</li>
              <li>Use navigation to step through moves.</li>
              <li>Analyze to see engine's best move & evaluation graph.</li>
              <li>Copy FEN/PGN to share or continue playing.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
