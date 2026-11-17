/**
 * Opening book — common lines for predictor and lower levels
 */

export const OPENINGS = [
  { name: "Ruy Lopez", moves: ["e4","e5","Nf3","Nc6","Bb5"] },
  { name: "Italian Game", moves: ["e4","e5","Nf3","Nc6","Bc4"] },
  { name: "Sicilian Defense", moves: ["e4","c5"] },
  { name: "French Defense", moves: ["e4","e6"] },
  { name: "King's Gambit", moves: ["e4","e5","f4"] },
  { name: "Queen's Gambit", moves: ["d4","d5","c4"] },
  { name: "King's Indian Defense", moves: ["d4","Nf6","c4","g6"] },
  { name: "Caro-Kann", moves: ["e4","c6"] },
  { name: "English Opening", moves: ["c4"] },
  { name: "Slav Defense", moves: ["d4","d5","c4","c6"] },
  { name: "Nimzo-Indian", moves: ["d4","Nf6","c4","e6","Nc3","Bb4"] },
];

// Simple opening move suggestion based on history SAN
export function getOpeningMove(historySan) {
  if (!historySan || historySan.length===0) {
    // pick random first move weighted
    const firsts = ["e4","d4","Nf3","c4"];
    return firsts[Math.floor(Math.random()*firsts.length)];
  }
  // try to continue an opening
  for (let op of OPENINGS) {
    let matches = true;
    for (let i=0;i<historySan.length;i++){
      if(op.moves[i] !== historySan[i]) { matches=false; break; }
      if(i >= op.moves.length-1) matches=false;
    }
    if(matches){
      const next = op.moves[historySan.length];
      if(next) return next;
    }
  }
  return null;
}

export function detectOpening(historySan){
  for(let op of OPENINGS){
    let ok = true;
    for(let i=0;i<Math.min(historySan.length, op.moves.length);i++){
      if(historySan[i]!==op.moves[i]) { ok=false; break; }
    }
    if(ok && historySan.length>=3) return op.name;
  }
  return null;
}
