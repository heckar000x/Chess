/**
 * Simple Web Audio sound effects (no external files needed)
 */
let ctx = null;
function getCtx(){
  if(!ctx){
    try{ ctx = new (window.AudioContext || window.webkitAudioContext)(); }catch{}
  }
  return ctx;
}

export function playTone(freq, dur, type='sine', gain=0.12){
  const c = getCtx();
  if(!c) return;
  if(c.state==='suspended') c.resume();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = gain;
  o.connect(g); g.connect(c.destination);
  o.start();
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.stop(c.currentTime + dur);
}

export function sfxMove(){ playTone(520,0.08,'sine',0.12); }
export function sfxCapture(){ playTone(180,0.12,'square',0.10); setTimeout(()=>playTone(340,0.08,'triangle',0.08),40); }
export function sfxCheck(){ playTone(880,0.14,'sine',0.14); setTimeout(()=>playTone(1100,0.10,'sine',0.10),90); }
export function sfxCastle(){ playTone(640,0.10,'triangle',0.11); setTimeout(()=>playTone(520,0.08,'sine',0.09),70);}
export function sfxGameEnd(win){ if(win){ playTone(660,0.12,'sine',0.13); setTimeout(()=>playTone(880,0.16,'sine',0.13),120); setTimeout(()=>playTone(1100,0.20,'sine',0.12),260);} else { playTone(220,0.18,'sine',0.10); setTimeout(()=>playTone(180,0.22,'sine',0.08),140);} }
export function sfxClick(){ playTone(900,0.06,'triangle',0.06); }
