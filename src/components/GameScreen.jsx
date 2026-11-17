import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Board } from './Board.jsx';
import { PromotionModal } from './PromotionModal.jsx';
import { OmegaProtocol } from '../ai/omega.js';
import { getLevel } from '../ai/levels.js';
import { loadSettings, loadProfile, saveProfile, saveGame, eloChange } from '../utils/storage.js';
import { sfxMove, sfxCapture, sfxCheck, sfxCastle, sfxGameEnd } from '../utils/sound.js';

const omega = new OmegaProtocol();

export function GameScreen({ mode, levelId=5, onExit, onlineState=null, onOnlineMove=null }){
  const [fen, setFen] = useState(new Chess().fen());
  const chessRef = useRef(new Chess());
  const [selected, setSelected] = useState(null);
  const [legalHints, setLegalHints] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [history, setHistory] = useState([]); // {san, fen, move}
  const [turn, setTurn] = useState('w');
  const [gameOver, setGameOver] = useState(null); // {result, reason}
  const [promotion, setPromotion] = useState(null); // {from,to,color}
  const [settings, setSettings] = useState(()=> loadSettings());
  const [profile, setProfile] = useState(()=> loadProfile());
  const [isThinking, setIsThinking] = useState(false);
  const [omegaLog, setOmegaLog] = useState(null);
  const [clocks, setClocks] = useState({ w: 600, b:600 }); // seconds
  const [activeClock, setActiveClock] = useState('w');
  const clockRef = useRef(null);
  const [captured, setCaptured] = useState({ w:[], b:[] });
  const [check, setCheck] = useState(false);
  const [moveIdx, setMoveIdx] = useState(-1); // for navigation

  const level = getLevel(levelId);
  const isAI = mode==='ai';
  const isLocal = mode==='local';
  const isPractice = mode==='practice';
  const isOnline = mode==='online';
  const humanColor = 'w'; // in AI mode human is white by default; could add option
  const aiColor = humanColor==='w'?'b':'w';

  // init chess
  useEffect(()=>{
    const c = new Chess();
    chessRef.current = c;
    setFen(c.fen());
    setTurn(c.turn());
    setHistory([]);
    setCaptured({w:[],b:[]});
    setGameOver(null);
    setLastMove(null);
    setCheck(false);
    // clocks
    const initial = mode==='online' ? 600 : 0; // no clock offline unless practice? we keep optional
    setClocks({w:600,b:600});
    setActiveClock('w');
  }, [mode, levelId]);

  // Clock ticking
  useEffect(()=>{
    if(gameOver) return;
    if(mode==='practice' || mode==='local') return; // no clock for those? we keep but paused?
    // For AI we also tick?
    if(!isAI && !isOnline) return;
    clockRef.current = setInterval(()=>{
      setClocks(prev=>{
        const t = activeClock;
        const next = { ...prev, [t]: Math.max(0, prev[t]-1) };
        if(next[t]===0){
          // flag
          setGameOver({ result: t==='w'?'0-1':'1-0', reason:'flag' });
        }
        return next;
      });
    },1000);
    return ()=> clearInterval(clockRef.current);
  }, [activeClock, gameOver, mode, isAI, isOnline]);

  function updateFromChess(){
    const c = chessRef.current;
    setFen(c.fen());
    setTurn(c.turn());
    setActiveClock(c.turn());
    setCheck(c.isCheck());
    // game over
    if(c.isCheckmate()) setGameOver({ result: c.turn()==='w'?'0-1':'1-0', reason:'checkmate' });
    else if(c.isStalemate()) setGameOver({ result:'1/2-1/2', reason:'stalemate'});
    else if(c.isDraw()) setGameOver({ result:'1/2-1/2', reason:'draw'});
    else if(c.isThreefoldRepetition()) setGameOver({ result:'1/2-1/2', reason:'threefold repetition'});
    else if(c.isInsufficientMaterial()) setGameOver({ result:'1/2-1/2', reason:'insufficient material'});
    // 50 move check via fen halfmove
    const half = parseInt(c.fen().split(' ')[4],10);
    if(half>=100) setGameOver({ result:'1/2-1/2', reason:'fifty-move rule'});
  }

  function pushHistory(move, fenAfter){
    setHistory(h=> [...h, { san: move.san, from: move.from, to: move.to, fen: fenAfter, color: move.color }]);
    setMoveIdx(history.length); // will be updated after
  }

  function handleMove(from, to, promo='q'){
    const c = chessRef.current;
    // check promotion needed?
    const piece = c.get(from);
    const isPawn = piece && piece.type==='p';
    const isPromotionRank = (piece?.color==='w' && to[1]==='8') || (piece?.color==='b' && to[1]==='1');
    if(isPawn && isPromotionRank && !promo){
      setPromotion({from,to,color:piece.color});
      return;
    }
    // validate
    let move = null;
    try{
      move = c.move({ from, to, promotion: promo });
    }catch{ move=null; }
    if(!move){
      // invalid
      setSelected(null); setLegalHints([]);
      return;
    }
    // sound
    if(settings.sound){
      if(move.flags.includes('k')|| move.flags.includes('q')) sfxCastle();
      else if(move.captured) sfxCapture();
      else if(c.isCheck()) sfxCheck();
      else sfxMove();
    }
    if(move.captured){
      // track captured pieces from mover perspective? we store captured by color that did capture?
      // If white captured black piece, add to white's captured list
      setCaptured(prev=>{
        const next={ ...prev, w:[...prev.w], b:[...prev.b]};
        if(move.color==='w') next.w.push(move.captured);
        else next.b.push(move.captured);
        return next;
      });
    }

    const fenAfter = c.fen();
    setFen(fenAfter);
    setLastMove({from: move.from, to: move.to});
    pushHistory(move, fenAfter);
    updateFromChess();
    setSelected(null); setLegalHints([]);

    // check game over sound
    if(c.isGameOver() && settings.sound){
      const win = c.isCheckmate() ? (move.color==='w' ? 1: -1) : 0;
      sfxGameEnd(win!==0);
    }

    // update profile stats if game over?
    if(c.isGameOver()){
      const result = c.isCheckmate() ? (c.turn()==='w'?'0-1':'1-0') : '1/2-1/2';
      // save game
      saveGame({ fen: fenAfter, pgn: c.pgn(), history: c.history(), result, mode, levelId, date: Date.now() });
      // rating update for AI
      if(isAI){
        let score = result==='1/2-1/2'?0.5: (result==='1-0'?1:0);
        // human is white
        const humanScore = result==='1-0'?1: result==='0-1'?0:0.5;
        // opponent rating is level elo
        const delta = eloChange(profile.rating, level.elo, humanScore);
        const newRating = Math.max(200, profile.rating + delta);
        const newProfile = { ...profile, rating:newRating, bestRating: Math.max(profile.bestRating,newRating), gamesPlayed: profile.gamesPlayed+1, wins: profile.wins + (humanScore===1?1:0), losses: profile.losses + (humanScore===0?1:0), draws: profile.draws + (humanScore===0.5?1:0)};
        setProfile(newProfile); saveProfile(newProfile);
      }
      return;
    }

    // trigger AI if needed
    if(isAI && c.turn()===aiColor && !c.isGameOver()){
      triggerAI(fenAfter);
    }
    if(isOnline && onOnlineMove){
      onOnlineMove(move);
    }
  }

  async function triggerAI(fenAfter){
    if(isThinking) return;
    setIsThinking(true);
    setOmegaLog(null);

    // For Omega level, show detailed logs
    const isOmega = level.isOmega;
    try{
      if(isOmega){
        // simulate streaming logs
        setOmegaLog({ stage:'SYNC', text:'Synchronizing four minds — snapshot hash validating...' });
        const res = await omega.think(fenAfter, { timeMs: level.omega?.timeBudgetMs || 6500 });
        setOmegaLog(res);
        if(res.move){
          // small delay for drama
          setTimeout(()=>{
            applyAIMove(res.move);
            setIsThinking(false);
          }, 300);
          return;
        } else {
          setIsThinking(false);
        }
      } else {
        // simple level
        const res = await omega.thinkSimple(fenAfter, level);
        setOmegaLog({ simple:true, level: level.name, move: res.move?.san, score: res.score, depth: res.depth });
        setTimeout(()=>{
          if(res.move) applyAIMove(res.move);
          setIsThinking(false);
        }, 420);
        return;
      }
    }catch(e){
      console.error(e);
      // fallback random move
      const legal = chessRef.current.moves({verbose:true});
      if(legal.length>0){
        const rnd = legal[Math.floor(Math.random()*legal.length)];
        applyAIMove(rnd);
      }
      setIsThinking(false);
    }
  }

  function applyAIMove(mv){
    // mv has from,to,promotion
    handleMove(mv.from, mv.to, mv.promotion||'q');
  }

  function onSquareClick(sq, forcedTo=null){
    if(gameOver) return;
    if(isThinking) return;
    const c = chessRef.current;
    // Online: only allow move on your turn & color
    if(isOnline && onlineState){
      if(c.turn()!==onlineState.color) return;
    }
    if(isAI && c.turn()!==humanColor && !isPractice) return;

    const to = forcedTo;
    if(to){
      // direct drag drop
      const from = sq;
      handleMove(from, to);
      return;
    }

    // Select logic
    if(!selected){
      const piece = c.get(sq);
      if(!piece) return;
      if(piece.color!==c.turn()) return;
      // In AI mode, only allow human color selection unless practice
      if(isAI && !isPractice && piece.color!==humanColor) return;
      setSelected(sq);
      const ms = c.moves({ square:sq, verbose:true });
      setLegalHints(ms);
    } else {
      if(sq===selected){
        setSelected(null); setLegalHints([]);
        return;
      }
      const legal = legalHints.find(m=> m.to===sq);
      if(legal){
        handleMove(selected, sq, legal.promotion || 'q');
      } else {
        // reselect if own piece
        const piece = c.get(sq);
        if(piece && piece.color===c.turn()){
          if(isAI && !isPractice && piece.color!==humanColor){
            setSelected(null); setLegalHints([]);
            return;
          }
          setSelected(sq);
          setLegalHints(c.moves({ square:sq, verbose:true }));
        } else {
          setSelected(null); setLegalHints([]);
        }
      }
    }
  }

  function undo(){
    if(isThinking) return;
    const c = chessRef.current;
    if(isAI){
      // undo two plies if possible (human+AI)
      c.undo(); c.undo();
      setHistory(h=> h.slice(0, Math.max(0, h.length-2)));
    } else {
      c.undo();
      setHistory(h=> h.slice(0, Math.max(0, h.length-1)));
    }
    setGameOver(null);
    updateFromChess();
    setSelected(null); setLegalHints([]); setLastMove(history[history.length-2] ? {from: history[history.length-2].from, to: history[history.length-2].to} : null);
    // recompute captured
    const newCaptured={w:[],b:[]};
    const temp = new Chess();
    for(let h of history.slice(0, history.length - (isAI?2:1))){
      const m = temp.move(h.san);
      if(m && m.captured){
        if(m.color==='w') newCaptured.w.push(m.captured);
        else newCaptured.b.push(m.captured);
      }
    }
    setCaptured(newCaptured);
  }

  function restart(){
    const c = new Chess();
    chessRef.current=c;
    setFen(c.fen());
    setHistory([]);
    setCaptured({w:[],b:[]});
    setGameOver(null);
    setLastMove(null);
    setCheck(false);
    setSelected(null); setLegalHints([]); setOmegaLog(null); setIsThinking(false);
    updateFromChess();
  }

  function hint(){
    const c = chessRef.current;
    if(c.isGameOver()) return;
    // quick search to suggest move
    // Use shallow search
    import('../ai/search.js').then(({Search})=>{
      const s = new Search(c, {depth:2, timeMs:700});
      const r = s.search();
      if(r.move){
        setSelected(r.move.from);
        setLegalHints(c.moves({ square: r.move.from, verbose:true }));
      }
    });
  }

  function flipBoard(){ setSettings(s=> { const ns={...s, boardFlipped: !s.boardFlipped}; saveSettings(ns); return ns; }); }

  function formatClock(sec){
    const m=Math.floor(sec/60).toString().padStart(2,'0');
    const s=(sec%60).toString().padStart(2,'0');
    return `${m}:${s}`;
  }

  function capturedDisplay(color){
    const arr = color==='w' ? captured.w : captured.b;
    const map={p:'♟', n:'♞', b:'♝', r:'♜', q:'♛', k:'♚'};
    const rev={p:'♙',n:'♘',b:'♗',r:'♖',q:'♕',k:'♔'};
    // white captured = black pieces captured by white -> show black symbols
    // captured.w contains black piece types captured by white? Actually we pushed move.captured which is piece type without color. So we lost color. Assume opponent color.
    // We'll just show symbols in capturing color's style: for white captures show black pieces
    return arr.map((t,i)=> <span key={i} style={{marginRight:2}}>{ color==='w' ? (map[t]||t) : (rev[t]||t)}</span> );
  }

  const gameResultText = gameOver ? (
    gameOver.reason==='checkmate' ? (gameOver.result==='1-0'?'White wins by checkmate':'Black wins by checkmate') :
    gameOver.reason==='stalemate' ? 'Draw by stalemate' :
    gameOver.reason==='draw' ? 'Draw' :
    gameOver.reason==='threefold repetition' ? 'Draw by threefold repetition' :
    gameOver.reason==='insufficient material' ? 'Draw by insufficient material' :
    gameOver.reason==='fifty-move rule' ? 'Draw by fifty-move rule' :
    gameOver.reason==='flag' ? 'Win on time' : gameOver.result
  ) : null;

  const canUndo = history.length>0 && (isPractice || isAI || isLocal);

  return (
    <div className="game-layout">
      {/* Left panel */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Game Controls</span>
          <button className="btn btn-ghost btn-small" onClick={onExit}>← Menu</button>
        </div>

        <div className="row" style={{gap:8}}>
          <button className="btn btn-ghost btn-small" onClick={restart}>↻ Restart</button>
          <button className="btn btn-ghost btn-small" disabled={!canUndo} onClick={undo}>↩ Undo</button>
          <button className="btn btn-ghost btn-small" onClick={hint}>💡 Hint</button>
          <button className="btn btn-ghost btn-small" onClick={flipBoard}>⇅ Flip</button>
        </div>

        <div className="divider" />

        <div className="col">
          <div className="player-row" style={{opacity: turn==='b'?1:0.7, borderColor: turn==='b'?'var(--accent)':undefined}}>
            <div className="avatar">{ level.isOmega ? 'Ω' : '◈'}</div>
            <div>
              <div style={{fontWeight:800, fontSize:14}}>{isAI ? level.name : (isLocal ? 'Black' : 'Opponent')} {isAI && level.isOmega && <span style={{color:'var(--accent)'}}>• OMEGA</span>}</div>
              <div className="muted" style={{fontSize:12}}>{isAI ? `Elo ${level.elo}` : (isLocal ? 'Local player' : 'Online')}</div>
            </div>
            <div className={`clock ${clocks.b<30?'low':''}`} style={{marginLeft:'auto'}}>{formatClock(clocks.b)}</div>
          </div>
          <div className="captured">Captured: {capturedDisplay('b')} {captured.b.length===0 && <span className="muted">—</span>}</div>

          <div className="player-row active" style={{opacity: turn==='w'?1:0.7}}>
            <div className="avatar" style={{background:'linear-gradient(135deg,#fef3c7,#f59e0b)', color:'#0f172a'}}>{profile.avatar}</div>
            <div>
              <div style={{fontWeight:800, fontSize:14}}>{profile.username}</div>
              <div className="muted" style={{fontSize:12}}>You • Elo {profile.rating}</div>
            </div>
            <div className={`clock ${clocks.w<30?'low':''}`}>{formatClock(clocks.w)}</div>
          </div>
          <div className="captured">Captured: {capturedDisplay('w')} {captured.w.length===0 && <span className="muted">—</span>}</div>
        </div>

        {gameOver && (
          <div style={{background:'rgba(245,158,11,.12)', border:'1px solid rgba(245,158,11,.3)', borderRadius:12, padding:12, textAlign:'center'}}>
            <div style={{fontWeight:800, color:'var(--accent)'}}>{gameResultText}</div>
            <div className="muted" style={{fontSize:12, marginTop:4}}>{gameOver.result}</div>
            <div className="row" style={{justifyContent:'center', marginTop:10}}>
              <button className="btn btn-primary btn-small" onClick={restart}>Play Again</button>
              <button className="btn btn-ghost btn-small" onClick={onExit}>Menu</button>
            </div>
          </div>
        )}

        <div className="divider" />
        <div>
          <div className="panel-title" style={{marginBottom:8}}>Move History</div>
          <div className="move-list">
            <div className="idx">#</div><div style={{fontWeight:700, color:'var(--muted)'}}>White</div><div style={{fontWeight:700, color:'var(--muted)'}}>Black</div>
            {Array.from({length: Math.ceil(history.length/2)}).map((_,i)=>{
              const w = history[i*2];
              const b = history[i*2+1];
              return (
                <React.Fragment key={i}>
                  <div className="idx">{i+1}</div>
                  <div className={`mv ${moveIdx===i*2?'active':''}`} onClick={()=>{/* navigate*/}}>{w ? w.san : ''}</div>
                  <div className={`mv ${moveIdx===i*2+1?'active':''}`}>{b ? b.san : ''}</div>
                </React.Fragment>
              );
            })}
            {history.length===0 && <div style={{gridColumn:'1/-1', color:'var(--muted)', textAlign:'center', padding:12}}>No moves yet</div>}
          </div>
        </div>

        {isAI && level.isOmega && (
          <div className="panel omega-panel" style={{marginTop:8}}>
            <div className="omega-head">
              <div className="omega-dot"></div>
              <div style={{fontWeight:800, fontSize:12, letterSpacing:'.10em', textTransform:'uppercase'}}>Omega Protocol</div>
              <span className="spacer" />
              <span className="muted" style={{fontSize:11}}>{isThinking ? 'THINKING' : 'IDLE'}</span>
            </div>
            <div className="think-bar" style={{margin:'10px 0 8px'}}>
              <i style={{width: isThinking ? '72%' : '0%'}}></i>
            </div>
            <div className="mind-log">
              {!omegaLog && <div className="log-item">Omega standing by — four minds synchronized and ready.</div>}
              {omegaLog && omegaLog.protocol==='OMEGA' && (
                <>
                  <div className="log-item"><b>🔮 Predictor:</b> {omegaLog.predictor.candidates.slice(0,3).map(c=>c.san).join(', ')} <small>• {omegaLog.predictor.timeMs}ms • breadth {omegaLog.predictor.breadth}</small><br/><small>{omegaLog.predictor.candidates[0]?.reasoning}</small></div>
                  <div className="log-item"><b>🧮 Calculator:</b> Best {omegaLog.calculator.best?.san} ({omegaLog.calculator.best?.score}) • depth {omegaLog.calculator.best?.depth} • nodes {omegaLog.calculator.nodesTotal}<br/><small>PV: {omegaLog.calculator.best?.pv?.slice(0,4).join(' ')}</small></div>
                  <div className="log-item"><b>✅ Confirmer:</b> {omegaLog.confirmer.verdicts.slice(0,2).map(v=> `${v.san} ${v.confirmed?'✓':'✗'} ${v.riskLevel}`).join(' • ')} {omegaLog.confirmer.disagreement && <><br/><small>{omegaLog.confirmer.disagreement}</small></>}</div>
                  <div className="log-item"><b>♔ Player:</b> Executes <b>{omegaLog.player.move?.san}</b> via {omegaLog.player.source} • conf {Math.round(omegaLog.player.confidence*100)}% • {omegaLog.player.reasoning}</div>
                  <div className="log-item"><small>Synchronized: {omegaLog.synchronized?'YES':'NO'} • Agreement: {omegaLog.agreement} • Total {omegaLog.totalTimeMs}ms</small></div>
                </>
              )}
              {omegaLog && omegaLog.simple && (
                <div className="log-item"><b>{omegaLog.level}:</b> Plays {omegaLog.move} • eval {omegaLog.score} • depth {omegaLog.depth}</div>
              )}
              {omegaLog && omegaLog.stage && <div className="log-item">{omegaLog.text}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Center board */}
      <div className="board-wrap">
        <div className={`board-frame theme-${settings.theme}`}>
          <Board
            chess={chessRef.current}
            selected={selected}
            legalHints={legalHints}
            lastMove={lastMove}
            isCheck={check}
            flipped={settings.boardFlipped}
            showCoords={settings.showCoords}
            showHints={settings.showHints}
            onSquareClick={onSquareClick}
            animFrom={lastMove?.from}
          />
          <div className="row" style={{justifyContent:'space-between', marginTop:12, fontSize:12, color:'var(--muted)'}}>
            <span>Turn: <b style={{color: turn==='w'?'#f1f5f9':'#f59e0b'}}>{turn==='w'?'White':'Black'}</b> {check && <span style={{color:'#ef4444'}}>• CHECK!</span>}</span>
            <span className="hide-mobile">{level.name} • Elo {level.elo}</span>
            <span>{fen.split(' ')[0].length>20 ? '' : fen.split(' ')[0]}</span>
          </div>
        </div>
        <div className="row mobile-only" style={{justifyContent:'center'}}>
          <button className="btn btn-ghost btn-small" onClick={hint}>💡 Hint</button>
          <button className="btn btn-ghost btn-small" disabled={!canUndo} onClick={undo}>↩ Undo</button>
        </div>
      </div>

      {/* Right panel */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Analysis</span>
          <span className="muted" style={{fontSize:12}}>{fen.split(' ').slice(0,2).join(' ')}</span>
        </div>
        <div className="col" style={{fontSize:13, lineHeight:1.6}}>
          <div><b>Status:</b> {check ? <span style={{color:'#ef4444'}}>Check</span> : 'Normal'} {gameOver ? `• ${gameResultText}` : ''}</div>
          <div><b>FEN:</b> <span style={{fontFamily:'JetBrains Mono', fontSize:11, wordBreak:'break-all'}}>{fen}</span></div>
          <div><b>PGN:</b> <span style={{fontFamily:'JetBrains Mono', fontSize:11}}>{chessRef.current.pgn() || '—'}</span></div>
        </div>
        <div className="divider" />
        <div>
          <div className="panel-title" style={{marginBottom:8}}>Position Tips</div>
          <ul className="muted" style={{margin:0, paddingLeft:18, fontSize:13, lineHeight:1.6}}>
            <li>Control the center with pawns & knights</li>
            <li>Castle early to protect your king</li>
            <li>Don't move the same piece twice in opening</li>
            <li>Look for checks, captures, and threats</li>
          </ul>
        </div>
        <div className="divider" />
        <div className="row">
          <button className="btn btn-ghost btn-small" onClick={async()=>{
            const c=chessRef.current;
            const pgn=c.pgn();
            navigator.clipboard?.writeText(pgn);
          }}>Copy PGN</button>
          <button className="btn btn-ghost btn-small" onClick={async()=>{
            const f=chessRef.current.fen();
            navigator.clipboard?.writeText(f);
          }}>Copy FEN</button>
        </div>
        <div className="col" style={{marginTop:8}}>
          <label className="row" style={{justifyContent:'space-between', fontSize:13}}><span>Show coordinates</span><div className={`switch ${settings.showCoords?'on':''}`} onClick={()=> setSettings(s=>{const ns={...s, showCoords:!s.showCoords}; saveSettings(ns); return ns;})}></div></label>
          <label className="row" style={{justifyContent:'space-between', fontSize:13}}><span>Legal hints</span><div className={`switch ${settings.showHints?'on':''}`} onClick={()=> setSettings(s=>{const ns={...s, showHints:!s.showHints}; saveSettings(ns); return ns;})}></div></label>
          <label className="row" style={{justifyContent:'space-between', fontSize:13}}><span>Sound</span><div className={`switch ${settings.sound?'on':''}`} onClick={()=> setSettings(s=>{const ns={...s, sound:!s.sound}; saveSettings(ns); return ns;})}></div></label>
        </div>
      </div>

      {promotion && (
        <PromotionModal color={promotion.color} onChoose={(piece)=>{
          const {from,to}=promotion;
          setPromotion(null);
          handleMove(from,to,piece);
        }} onCancel={()=> setPromotion(null)} />
      )}
    </div>
  );
}
