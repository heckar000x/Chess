import React, { useState } from 'react';
import { Chess } from 'chess.js';
import { Board } from './Board.jsx';

const OPENINGS_DATA = [
  { name:"Ruy Lopez", eco:"C60", moves:["e4","e5","Nf3","Nc6","Bb5"], desc:"The Spanish Torture. White pressures the knight defending e5.", line:"1. e4 e5 2. Nf3 Nc6 3. Bb5" },
  { name:"Italian Game", eco:"C50", moves:["e4","e5","Nf3","Nc6","Bc4"], desc:"Classical development targeting f7, the weakest square.", line:"1. e4 e5 2. Nf3 Nc6 3. Bc4" },
  { name:"Sicilian Defense", eco:"B20", moves:["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6"], desc:"Black's most ambitious reply to 1.e4, fighting for center.", line:"1. e4 c5" },
  { name:"French Defense", eco:"C00", moves:["e4","e6","d4","d5","Nd2"], desc:"Solid but slightly passive; aims for counterattack with ...c5.", line:"1. e4 e6" },
  { name:"Queen's Gambit", eco:"D06", moves:["d4","d5","c4","e6","Nc3","Nf6"], desc:"White offers a pawn to dominate the center.", line:"1. d4 d5 2. c4" },
  { name:"King's Indian Defense", eco:"E60", moves:["d4","Nf6","c4","g6","Nc3","Bg7","e4","d6"], desc:"Hypermodern defense — allow center then strike.", line:"1. d4 Nf6 2. c4 g6" },
  { name:"Caro-Kann", eco:"B10", moves:["e4","c6","d4","d5","Nc3","dxe4","Nxe4"], desc:"Ultra-solid, favored by Karpov and Carlsen.", line:"1. e4 c6" },
  { name:"English Opening", eco:"A10", moves:["c4","e5","Nc3","Nf6","g3"], desc:"Flexible flank opening, leads to positional battles.", line:"1. c4" },
];

export function Openings({ onBack }){
  const [sel, setSel] = useState(0);
  const [ply, setPly] = useState(0);
  const data = OPENINGS_DATA[sel];
  const chess = new Chess();
  for(let i=0;i<ply;i++){
    try{ chess.move(data.moves[i]); }catch{}
  }

  return (
    <div>
      <div className="row" style={{marginBottom:14}}>
        <button className="btn btn-ghost btn-small" onClick={onBack}>← Menu</button>
        <h2 className="cinzel" style={{margin:'0 0 0 12px'}}>Opening Explorer</h2>
      </div>

      <div className="game-layout" style={{gridTemplateColumns:'340px 1fr'}}>
        <div className="panel" style={{gap:10, maxHeight:'72vh', overflow:'auto'}}>
          {OPENINGS_DATA.map((op,i)=>(
            <div key={op.name} onClick={()=>{setSel(i); setPly(0);}} className="mode-card" style={{padding:12, borderColor: sel===i?'var(--accent)':'var(--border)', background: sel===i?'rgba(245,158,11,.08)':'var(--panel)', cursor:'pointer'}}>
              <div className="row" style={{justifyContent:'space-between'}}>
                <span style={{fontWeight:800}}>{op.name}</span>
                <span className="diff-elo">{op.eco}</span>
              </div>
              <div className="muted" style={{fontSize:12, marginTop:4}}>{op.line}</div>
              <div style={{fontSize:12, marginTop:6, color:'#cbd5e1', lineHeight:1.4}}>{op.desc}</div>
            </div>
          ))}
        </div>

        <div className="board-wrap">
          <div className="panel" style={{width:'100%', maxWidth:560}}>
            <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
              <h3 style={{margin:0}}>{data.name} <span className="muted" style={{fontWeight:400, fontSize:13}}>• {data.eco}</span></h3>
              <span className="muted" style={{fontSize:12}}>{ply} / {data.moves.length} plies</span>
            </div>
            <p className="muted" style={{fontSize:13, lineHeight:1.5}}>{data.desc}</p>
            <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:12}}>
              {data.moves.map((m,i)=>(
                <span key={i} className="kbd" style={{background: i<ply?'var(--accent)':'#0f172a', color: i<ply?'#0f172a':'var(--muted)', borderColor: i<ply?'#fbbf24':'var(--border)', cursor:'pointer'}} onClick={()=> setPly(i+1)}>{i%2===0? `${Math.floor(i/2)+1}.` : ''} {m}</span>
              ))}
            </div>
            <div className="row" style={{marginBottom:12}}>
              <button className="btn btn-ghost btn-small" disabled={ply===0} onClick={()=> setPly(p=>p-1)}>‹ Prev</button>
              <button className="btn btn-ghost btn-small" disabled={ply===data.moves.length} onClick={()=> setPly(p=>p+1)}>Next ›</button>
              <button className="btn btn-ghost btn-small" onClick={()=> setPly(0)}>↺ Reset</button>
              <button className="btn btn-primary btn-small" style={{marginLeft:'auto'}} onClick={()=> setPly(data.moves.length)}>Show Final Position</button>
            </div>
          </div>
          <div className="board-frame" style={{maxWidth:460}}>
            <Board chess={chess} selected={null} legalHints={[]} lastMove={null} isCheck={false} flipped={false} onSquareClick={()=>{}} showHints={false} />
          </div>
          <div className="panel" style={{maxWidth:460, width:'100%'}}>
            <div className="panel-title">Study Tips</div>
            <ul className="muted" style={{margin:'8px 0 0 18px', fontSize:13, lineHeight:1.6}}>
              <li>Tap a move pill to jump to that position</li>
              <li>Try to guess the next move before revealing</li>
              <li>Focus on piece development and king safety</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
