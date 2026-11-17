import React, { useState } from 'react';
import { LEVELS } from '../ai/levels.js';

export function DifficultySelect({ onSelect, onBack, currentLevel }){
  const [sel, setSel] = useState(currentLevel||5);
  const level = LEVELS.find(l=>l.id===sel);
  return (
    <div>
      <div className="row" style={{alignItems:'center', marginBottom:14}}>
        <button className="btn btn-ghost btn-small" onClick={onBack}>← Back</button>
        <h2 className="cinzel" style={{margin:'0 auto 0 12px'}}>Select Opponent Strength</h2>
        <span className="muted" style={{fontSize:12}}>{LEVELS.length} levels</span>
      </div>

      <div className="diff-grid">
        {LEVELS.map(l=>{
          const isSel = sel===l.id;
          const isOmega = l.isOmega;
          return (
            <div key={l.id} className={`diff-card ${isSel?'selected':''} ${isOmega?'omega':''}`} onClick={()=> setSel(l.id)}>
              <div className="diff-top">
                <span className="muted" style={{fontSize:12, fontWeight:700}}>LEVEL {String(l.id).padStart(2,'0')}</span>
                <span className="diff-elo">{l.elo} Elo</span>
              </div>
              <div className="diff-name">{l.name} {isOmega && <span style={{fontSize:12, background:'linear-gradient(90deg,#f59e0b,#fbbf24)', color:'#0f172a', padding:'2px 8px', borderRadius:999, fontWeight:800}}>FINAL BOSS</span>}</div>
              <div className="diff-sub">{l.subtitle}</div>
              <div className="diff-desc">{l.description || (isOmega ? 'Four synchronized minds collaborate. Predictor → Calculator → Confirmer → Player. The ultimate test.' : `Depth ${l.depth} • ${l.timeMs}ms • Genuine strength scaling.` )}</div>
              <div className="diff-indicator">
                {Array.from({length:10}).map((_,i)=> <i key={i} className={i < l.id ? 'filled':''} />)}
              </div>
              {isOmega && isSel && (
                <div style={{marginTop:10, background:'rgba(15,23,42,.5)', border:'1px solid rgba(245,158,11,.25)', borderRadius:10, padding:10, fontSize:12, lineHeight:1.5}}>
                  <b style={{color:'#fbbf24'}}>Omega Protocol Active</b><br/>
                  Predictor breadth {l.omega.breadth} • Calculator depth {l.omega.calculatorDepth} • Confirmer verification • Time budget {l.omega.timeBudgetMs}ms
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="panel" style={{marginTop:16, flexDirection:'row', alignItems:'center', gap:12, flexWrap:'wrap'}}>
        <div>
          <div style={{fontWeight:800}}>Selected: <span style={{color:'var(--accent)'}}>{level.name}</span> — {level.subtitle}</div>
          <div className="muted" style={{fontSize:13}}>Elo {level.elo} • Depth {level.depth} • Time {level.timeMs}ms {level.isOmega ? '• OMEGA synchronized' : ''}</div>
        </div>
        <div className="spacer" />
        <button className="btn btn-primary" onClick={()=> onSelect(sel)}>Play vs {level.name} →</button>
      </div>
    </div>
  );
}
