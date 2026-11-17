import React, { useState } from 'react';
import { Chess } from 'chess.js';
import { Board } from './Board.jsx';
import { PromotionModal } from './PromotionModal.jsx';

// Curated puzzles
const PUZZLES = [
  { id:1, title:'Mate in 1 — Back rank', fen:'6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1', solution:['Re8#'], theme:'mateIn1', desc:'Exploit the back-rank weakness.' },
  { id:2, title:'Mate in 1 — Queen sacrifice', fen:'r4rk1/1pp2ppp/p1pb4/4p3/2B5/2N2N2/PPP2PPP/R2Q1RK1 w - - 0 1', solution:['Qh7#'], theme:'mateIn1', hint:'The h-file is key.' },
  { id:3, title:'Fork — Knight', fen:'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1', solution:['Ng5'], theme:'fork', desc:'Knight fork on f7.' },
  { id:4, title:'Pin — Bishop', fen:'r1bqkbnr/ppp2ppp/2n5/3pp3/3P4/5N2/PPP1PPPP/RNBQKB1R w KQkq - 0 1', solution:['Bb5'], theme:'pin', desc:'Pin the knight to the king.' },
  { id:5, title:'Mate in 2 — Classic', fen:'r1bqk2r/ppp2ppp/2n5/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1', solution:['Bxf7+','Kxf7','Ng5#'], theme:'mateIn2', desc:'Greek gift sacrifice.' },
  { id:6, title:'Discovered Attack', fen:'rnbqkbnr/pp2pppp/3p4/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 1', solution:['e5'], theme:'discovered', desc:'Open the bishop line.' },
  { id:7, title:'Skewer — Rook', fen:'6k1/5ppp/8/8/8/8/5PPP/2R2RK1 w - - 0 1', solution:['Rc8+'], theme:'skewer', desc:'Skewer the king and rook.' },
  { id:8, title:'Mate in 3', fen:'2r3k1/p4ppp/1p6/4p3/4P3/P1N2N2/1PP2PPP/3RR1K1 w - - 0 1', solution:['Re8','Rxe8','Rxe8#'], theme:'mateIn3', desc:'Double rook sacrifice.' },
];

export function Puzzles({ onBack }){
  const [idx, setIdx] = useState(0);
  const [fen, setFen] = useState(PUZZLES[0].fen);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('solve');
  const [hint, setHint] = useState(null);
  const chessRef = React.useRef(new Chess(PUZZLES[0].fen));
  const [selected, setSelected] = useState(null);
  const [legalHints, setLegalHints] = useState([]);
  const [promotion, setPromotion] = useState(null);

  function loadPuzzle(i){
    const p = PUZZLES[i];
    chessRef.current = new Chess(p.fen);
    setFen(p.fen); setHistory([]); setStatus('solve'); setHint(null); setSelected(null); setLegalHints([]);
  }

  function onSquareClick(sq, forcedTo=null){
    if(status!=='solve') return;
    const c = chessRef.current;
    const target = forcedTo;
    if(target){
      handleMove(sq, target);
      return;
    }
    if(!selected){
      const piece = c.get(sq);
      if(!piece || piece.color!==c.turn()) return;
      setSelected(sq);
      setLegalHints(c.moves({square:sq, verbose:true}));
    } else {
      if(sq===selected){ setSelected(null); setLegalHints([]); return; }
      const m = legalHints.find(x=> x.to===sq);
      if(m) handleMove(selected, sq, m.promotion);
      else {
        const piece=c.get(sq);
        if(piece && piece.color===c.turn()){ setSelected(sq); setLegalHints(c.moves({square:sq, verbose:true})); }
        else { setSelected(null); setLegalHints([]); }
      }
    }
  }

  function handleMove(from,to,promo='q'){
    const c = chessRef.current;
    const piece=c.get(from);
    const isPromo = piece?.type==='p' && (to[1]==='8'||to[1]==='1');
    if(isPromo && !promo){ setPromotion({from,to}); return; }
    let mv=null;
    try{ mv=c.move({from,to,promotion:promo}); }catch{ mv=null; }
    if(!mv){ setSelected(null); setLegalHints([]); return; }
    setFen(c.fen());
    setHistory(h=>[...h, mv.san]);
    setSelected(null); setLegalHints([]);
    const p = PUZZLES[idx];
    // Check solution progression (simplistic: compare first move)
    const expected = p.solution[history.length]; // history before push length is index
    if(mv.san.replace('#','').replace('+','') === expected.replace('#','').replace('+','') || p.solution.includes(mv.san) || p.solution.some(s=> s.includes(mv.san.replace('#','')))){
      if(history.length+1 >= p.solution.length){
        setStatus('solved');
      } else {
        setStatus('good');
        setTimeout(()=> setStatus('solve'), 800);
      }
    } else {
      // For mate puzzles, any checkmate also counts
      if(c.isCheckmate()) setStatus('solved');
      else { setStatus('wrong'); setTimeout(()=> setStatus('solve'), 900); }
    }
  }

  const p = PUZZLES[idx];

  return (
    <div>
      <div className="row" style={{marginBottom:14}}>
        <button className="btn btn-ghost btn-small" onClick={onBack}>← Menu</button>
        <h2 className="cinzel" style={{margin:'0 0 0 12px'}}>Tactical Puzzles</h2>
        <span className="muted" style={{marginLeft:'auto', fontSize:12}}>{idx+1} / {PUZZLES.length}</span>
      </div>

      <div className="game-layout" style={{gridTemplateColumns:'360px 1fr'}}>
        <div className="panel">
          <div className="puzzle-card" style={{border:'none', background:'transparent', padding:0}}>
            <div className="panel-title">Puzzle #{p.id} — {p.theme}</div>
            <h3 style={{margin:'8px 0 4px'}}>{p.title}</h3>
            <p className="muted" style={{fontSize:13, lineHeight:1.5}}>{p.desc || 'Find the best move.'} {hint && <><br/><b style={{color:'var(--accent)'}}>Hint:</b> {hint}</>}</p>
            <div className="row" style={{marginTop:10}}>
              <button className="btn btn-ghost btn-small" onClick={()=> setHint(p.solution[0])}>💡 Hint</button>
              <button className="btn btn-ghost btn-small" onClick={()=> alert('Solution: '+p.solution.join(' → '))}>Show Solution</button>
            </div>
          </div>
          <div className="divider" />
          <div className="col">
            <div className="row" style={{justifyContent:'space-between'}}><span className="muted" style={{fontSize:12}}>Status</span><span style={{fontWeight:800, color: status==='solved'?'#10b981': status==='wrong'?'#ef4444':'var(--accent)'}}>{status==='solved'?'✓ Solved': status==='wrong'?'✕ Try again': status==='good'?'Good! Continue...':'Solve'}</span></div>
            <div className="move-list" style={{maxHeight:120}}>
              {history.map((s,i)=> <div key={i} className="mv" style={{gridColumn: i%2===0?'2':'3'}}>{s}</div>)}
              {history.length===0 && <div className="muted" style={{gridColumn:'1/-1', textAlign:'center', padding:10}}>Your moves will appear here</div>}
            </div>
            {status==='solved' && <button className="btn btn-primary btn-small" onClick={()=>{ const n=(idx+1)%PUZZLES.length; setIdx(n); loadPuzzle(n);}}>Next Puzzle →</button>}
            <div className="row">
              <button className="btn btn-ghost btn-small" disabled={idx===0} onClick={()=>{const n=idx-1; setIdx(n); loadPuzzle(n);}}>‹ Prev</button>
              <button className="btn btn-ghost btn-small" disabled={idx===PUZZLES.length-1} onClick={()=>{const n=idx+1; setIdx(n); loadPuzzle(n);}}>Next ›</button>
              <button className="btn btn-ghost btn-small" onClick={()=> loadPuzzle(idx)}>↻ Reset</button>
            </div>
          </div>
        </div>

        <div className="board-wrap">
          <div className="board-frame">
            <Board chess={chessRef.current} selected={selected} legalHints={legalHints} lastMove={history.length?{from: chessRef.current.history({verbose:true}).slice(-1)[0]?.from, to: chessRef.current.history({verbose:true}).slice(-1)[0]?.to}:null} isCheck={chessRef.current.isCheck()} flipped={false} onSquareClick={onSquareClick} />
            <div className="row" style={{justifyContent:'space-between', marginTop:10, fontSize:12, color:'var(--muted)'}}><span>Side to move: <b style={{color:'#f1f5f9'}}>{chessRef.current.turn()==='w'?'White':'Black'}</b></span><span>FEN: <span style={{fontFamily:'JetBrains Mono', fontSize:11}}>{fen.slice(0,32)}...</span></span></div>
          </div>
        </div>
      </div>
      {promotion && <PromotionModal color={chessRef.current.turn()==='w'?'b':'w'} onChoose={(pc)=>{ const {from,to}=promotion; setPromotion(null); handleMove(from,to,pc); }} onCancel={()=> setPromotion(null)} />}
    </div>
  );
}
