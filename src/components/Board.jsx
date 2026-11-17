import React, { useState, useRef } from 'react';

const FILES = ['a','b','c','d','e','f','g','h'];

function pieceSymbol(type, color){
  const map = {
    'k': color==='w' ? '♔' : '♚',
    'q': color==='w' ? '♕' : '♛',
    'r': color==='w' ? '♖' : '♜',
    'b': color==='w' ? '♗' : '♝',
    'n': color==='w' ? '♘' : '♞',
    'p': color==='w' ? '♙' : '♟'
  };
  return map[type] || '';
}

export function Board({ chess, selected, legalHints, lastMove, isCheck, flipped, showCoords=true, showHints=true, onSquareClick, animFrom }) {
  const board = chess.board(); // 8x8 array row 0 = rank 8
  const [dragFrom, setDragFrom] = useState(null);

  const squares = [];
  // board is [rank8 .. rank1], files a-h
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      // compute square name
      const rank = 8 - r;
      const file = FILES[c];
      const sq = `${file}${rank}`;
      // flipped: reverse board visually but keep square mapping? Actually flip means white at top etc.
      // We will handle via CSS order; easier to reorder loops
    }
  }

  // Generate display order
  const displayRows = [];
  for(let r=0;r<8;r++){
    const row = [];
    for(let c=0;c<8;c++){
      const rank = 8 - r;
      const file = FILES[c];
      const sq = `${file}${rank}`;
      const piece = chess.get(sq); // use chess.js getter
      // Color of square
      const isLight = (r+c)%2===0;
      row.push({ sq, piece, isLight, rank, file });
    }
    displayRows.push(row);
  }
  if(flipped){
    displayRows.reverse();
    displayRows.forEach(row=> row.reverse());
  }

  const hintSet = new Set( (showHints ? legalHints : []).map(m=>m.to) );
  const captureHintSet = new Set( (showHints ? legalHints : []).filter(m=>m.captured).map(m=>m.to) );

  function handleDragStart(e, sq, piece){
    if(!piece) { e.preventDefault(); return; }
    setDragFrom(sq);
    e.dataTransfer.effectAllowed='move';
    // ghost image
    try{
      const img = document.createElement('div');
      img.textContent = pieceSymbol(piece.type, piece.color);
      img.style.position='absolute'; img.style.top='-1000px';
      document.body.appendChild(img);
      e.dataTransfer.setDragImage(img, 20,20);
      setTimeout(()=> img.remove(), 0);
    }catch{}
  }
  function handleDrop(e, to){
    e.preventDefault();
    const from = dragFrom;
    setDragFrom(null);
    if(from && from!==to){
      onSquareClick(from, to);
    }
  }
  function handleDragOver(e){ e.preventDefault(); }

  return (
    <div className="board" role="grid" aria-label="Chess board">
      {displayRows.flat().map(({sq, piece, isLight, rank, file})=>{
        const isSelected = selected===sq;
        const isLast = lastMove && (lastMove.from===sq || lastMove.to===sq);
        const isHint = hintSet.has(sq);
        const isCapHint = captureHintSet.has(sq);
        const inCheck = isCheck && piece && piece.type==='k' && piece.color===chess.turn();
        const fileIdx = FILES.indexOf(file);
        const rankNum = rank;
        const isEdgeFile = (!flipped && file==='h') || (flipped && file==='a');
        const isEdgeRank = (!flipped && rank===1) || (flipped && rank===8);

        return (
          <div
            key={sq}
            onClick={()=> onSquareClick(sq)}
            onDragOver={handleDragOver}
            onDrop={(e)=> handleDrop(e, sq)}
            className={
              `square ${isLight?'light':'dark'} ${isSelected?'selected':''} ${isLast?'lastMove':''} ${inCheck?'check':''} ${isHint && !isCapHint ? 'hint':''} ${isCapHint?'capture-hint':''}`
            }
            data-square={sq}
            draggable={!!piece}
            onDragStart={(e)=> handleDragStart(e, sq, piece)}
          >
            {showCoords && isEdgeFile && <span className="coord file">{file}</span>}
            {showCoords && isEdgeRank && <span className="coord rank" style={{left:isEdgeFile? '3px':'4px'}}>{rankNum}</span>}
            {piece && (
              <div className={`piece ${piece.color==='w'?'white':'black'} ${animFrom===sq?'anim-move':''}`} style={{pointerEvents:'none'}}>
                {pieceSymbol(piece.type, piece.color)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
