import React from 'react';

export function PromotionModal({ color, onChoose, onCancel }){
  const pieces = [
    { type:'q', sym: color==='w'?'♕':'♛', name:'Queen' },
    { type:'r', sym: color==='w'?'♖':'♜', name:'Rook' },
    { type:'b', sym: color==='w'?'♗':'♝', name:'Bishop' },
    { type:'n', sym: color==='w'?'♘':'♞', name:'Knight' },
  ];
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <h3>Choose promotion</h3>
        <p className="muted" style={{margin:'4px 0 0'}}>Select the piece your pawn will become.</p>
        <div className="promo-grid">
          {pieces.map(p=>(
            <button key={p.type} className="promo-btn" onClick={()=>onChoose(p.type)} title={p.name}>
              <span style={{fontSize:34}}>{p.sym}</span>
            </button>
          ))}
        </div>
        <div style={{marginTop:14, display:'flex', justifyContent:'flex-end'}}>
          <button className="btn btn-ghost btn-small" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
