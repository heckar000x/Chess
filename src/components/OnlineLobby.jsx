import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { Chess } from 'chess.js';
import { Board } from './Board.jsx';
import { PromotionModal } from './PromotionModal.jsx';
import { loadProfile } from '../utils/storage.js';
import { sfxMove, sfxCapture, sfxCheck } from '../utils/sound.js';

export function OnlineLobby({ onBack, mode='lobby' }){
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [profile] = useState(()=> loadProfile());
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [status, setStatus] = useState('idle'); // idle, searching, waiting, playing
  const [game, setGame] = useState(null); // {fen, turn, history, players, color}
  const [myColor, setMyColor] = useState(null);
  const [selected, setSelected] = useState(null);
  const [hints, setHints] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [chat, setChat] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chessRef = useRef(new Chess());
  const [opponent, setOpponent] = useState(null);
  const [clocks, setClocks] = useState({w:600,b:600});
  const [promotion, setPromotion] = useState(null);

  useEffect(()=>{
    const s = io({ autoConnect:true });
    s.on('connect', ()=> setConnected(true));
    s.on('disconnect', ()=> setConnected(false));
    s.on('roomCreated', ({roomId, color})=>{
      setRoomCode(roomId); setMyColor(color); setStatus('waiting');
    });
    s.on('gameStart', ({roomId, fen, players, yourColor, opponent: opp})=>{
      setRoomCode(roomId); setMyColor(yourColor||myColor); setOpponent(opp);
      chessRef.current = new Chess(fen); setGame({fen, players, roomId}); setStatus('playing');
      setClocks({w:600,b:600});
    });
    s.on('opponentJoined', ({opponent: opp, fen})=>{
      setOpponent(opp); setStatus('playing');
      if(fen){ chessRef.current=new Chess(fen); setGame(g=> ({...g, fen})); }
    });
    s.on('move', ({from,to,promotion, fen, san, turn})=>{
      // server authoritative
      try{ chessRef.current.load(fen); }catch{ chessRef.current = new Chess(fen); }
      setGame(g=> ({...g, fen}));
      setLastMove({from,to});
      // sound
      const c = chessRef.current;
      if(c.isCheck()) sfxCheck(); else if(san && san.includes('x')) sfxCapture(); else sfxMove();
      setSelected(null); setHints([]);
    });
    s.on('chat', ({from, text, at})=> setChat(c=> [...c, {from,text,at}]));
    s.on('gameOver', ({result, reason})=>{ setStatus('over'); setGame(g=> ({...g, result, reason})); });
    s.on('error', ({message})=> alert(message));
    s.on('matchmakingUpdate', ({status: st})=> setStatus(st));
    s.on('waiting', ()=> setStatus('waiting'));

    setSocket(s);
    return ()=> s.disconnect();
  },[]);

  // clock tick for online
  useEffect(()=>{
    if(status!=='playing') return;
    const id=setInterval(()=>{
      setClocks(prev=>{
        const turn = chessRef.current.turn();
        const next={...prev, [turn]: Math.max(0, prev[turn]-1)};
        return next;
      });
    },1000);
    return ()=> clearInterval(id);
  },[status]);

  function createRoom(){
    if(!socket) return;
    socket.emit('createRoom', { username: profile.username, rating: profile.rating });
  }
  function joinRoom(){
    if(!socket || !joinCode) return;
    socket.emit('joinRoom', { roomId: joinCode.toUpperCase(), username: profile.username, rating: profile.rating });
  }
  function quickMatch(){
    setStatus('searching');
    socket.emit('quickMatch', { username: profile.username, rating: profile.rating });
  }
  function cancelSearch(){
    socket.emit('cancelSearch');
    setStatus('idle');
  }
  function sendMove(from,to,promo='q'){
    socket.emit('move', { roomId: roomCode, from, to, promotion: promo });
  }
  function sendChat(){
    if(!chatInput.trim()) return;
    socket.emit('chat', { roomId: roomCode, text: chatInput.slice(0,120) });
    setChatInput('');
  }
  function resign(){
    socket.emit('resign', { roomId: roomCode });
  }
  function offerDraw(){
    socket.emit('offerDraw', { roomId: roomCode });
  }

  function onSquareClick(sq, forcedTo=null){
    if(status!=='playing') return;
    const c = chessRef.current;
    if(c.turn()!==myColor) return;
    if(forcedTo){
      handleMove(sq, forcedTo);
      return;
    }
    if(!selected){
      const piece=c.get(sq);
      if(!piece || piece.color!==myColor) return;
      setSelected(sq);
      setHints(c.moves({square:sq, verbose:true}));
    } else {
      if(sq===selected){ setSelected(null); setHints([]); return; }
      const mv=hints.find(m=> m.to===sq);
      if(mv) handleMove(selected, sq, mv.promotion);
      else {
        const piece=c.get(sq);
        if(piece && piece.color===myColor){ setSelected(sq); setHints(c.moves({square:sq, verbose:true}));}
        else { setSelected(null); setHints([]); }
      }
    }
  }
  function handleMove(from,to,promo){
    const c=chessRef.current;
    const piece=c.get(from);
    const needPromo = piece?.type==='p' && ((piece.color==='w'&& to[1]==='8')|| (piece.color==='b'&&to[1]==='1'));
    if(needPromo && !promo){ setPromotion({from,to}); return; }
    sendMove(from,to,promo||'q');
  }

  const isMyTurn = game && chessRef.current.turn()===myColor;

  if(status==='playing' && game){
    return (
      <div className="game-layout">
        <div className="panel">
          <div className="row" style={{justifyContent:'space-between'}}>
            <button className="btn btn-ghost btn-small" onClick={onBack}>← Menu</button>
            <span className="diff-elo">Room {roomCode}</span>
          </div>
          <div className="player-row" style={{opacity: !isMyTurn?1:0.7, borderColor: !isMyTurn?'var(--accent)':undefined}}>
            <div className="avatar">{opponent? opponent.username.slice(0,2).toUpperCase() : '??'}</div>
            <div>
              <div style={{fontWeight:800}}>{opponent? opponent.username : 'Opponent'} {opponent? `• ${opponent.rating}`:''}</div>
              <div className="muted" style={{fontSize:12}}>{myColor==='w'?'Black':'White'} • {opponent? 'Online':'Waiting...'}</div>
            </div>
            <div className="clock">{Math.floor(clocks[myColor==='w'?'b':'w']/60)}:{String(clocks[myColor==='w'?'b':'w']%60).padStart(2,'0')}</div>
          </div>
          <div className="player-row active" style={{opacity: isMyTurn?1:0.7}}>
            <div className="avatar" style={{background:'linear-gradient(135deg,#fef3c7,#f59e0b)', color:'#0f172a'}}>{profile.avatar}</div>
            <div>
              <div style={{fontWeight:800}}>{profile.username} (You)</div>
              <div className="muted" style={{fontSize:12}}>{myColor==='w'?'White':'Black'} • {profile.rating} Elo {isMyTurn?'• Your turn':''}</div>
            </div>
            <div className="clock">{Math.floor(clocks[myColor]/60)}:{String(clocks[myColor]%60).padStart(2,'0')}</div>
          </div>

          <div className="row">
            <button className="btn btn-ghost btn-small" onClick={offerDraw}>½ Offer Draw</button>
            <button className="btn btn-ghost btn-small" onClick={resign} style={{color:'#f87171', borderColor:'#7f1d1d'}}>🏳 Resign</button>
          </div>
          {game.result && <div className="panel" style={{background:'rgba(245,158,11,.12)', borderColor:'rgba(245,158,11,.3)', textAlign:'center'}}><b>{game.result}</b><br/><span className="muted" style={{fontSize:12}}>{game.reason}</span></div>}

          <div className="divider" />
          <div className="panel-title">Chat</div>
          <div style={{maxHeight:160, overflow:'auto', display:'grid', gap:6, marginTop:8}}>
            {chat.map((c,i)=> <div key={i} style={{fontSize:12, padding:'6px 8px', borderRadius:8, background: c.from===profile.username?'rgba(245,158,11,.12)':'var(--panel-2)', border:'1px solid var(--border)'}}><b>{c.from}:</b> {c.text}</div>)}
            {chat.length===0 && <div className="muted" style={{fontSize:12, textAlign:'center', padding:10}}>No messages yet. Say gl hf!</div>}
          </div>
          <div className="row" style={{marginTop:8}}>
            <input value={chatInput} onChange={e=> setChatInput(e.target.value)} onKeyDown={e=> e.key==='Enter' && sendChat()} placeholder="Message..." style={{flex:1, padding:'8px 10px', borderRadius:10, border:'1px solid var(--border)', background:'#0f172a', color:'var(--text)'}} />
            <button className="btn btn-primary btn-small" onClick={sendChat}>Send</button>
          </div>
          <div className="row" style={{marginTop:8, flexWrap:'wrap', gap:6}}>
            {['gl hf','nice move','oops','well played','rematch?'].map(q=>(
              <button key={q} className="btn btn-ghost" style={{padding:'6px 10px', fontSize:12, borderRadius:999}} onClick={()=> {setChatInput(q);}}>{q}</button>
            ))}
          </div>
        </div>

        <div className="board-wrap">
          <div className="board-frame">
            <Board chess={chessRef.current} selected={selected} legalHints={hints} lastMove={lastMove} isCheck={chessRef.current.isCheck()} flipped={myColor==='b'} onSquareClick={onSquareClick} />
            <div className="row" style={{justifyContent:'space-between', marginTop:10, fontSize:12, color:'var(--muted)'}}>
              <span>Turn: <b style={{color:isMyTurn?'var(--accent)':'#94a3b8'}}>{chessRef.current.turn()==='w'?'White':'Black'}</b> {isMyTurn?'• Your move':"• Opponent's move"}</span>
              <span>{chessRef.current.fen().slice(0,28)}…</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">Room Info</div>
          <div style={{fontSize:12, lineHeight:1.6, color:'var(--muted)'}}>
            Share this code with a friend:<br/>
            <span style={{fontSize:18, fontWeight:800, color:'var(--accent)', letterSpacing:'.14em'}}>{roomCode}</span><br/>
            <span style={{fontFamily:'JetBrains Mono', fontSize:11, wordBreak:'break-all'}}>{location.origin + '?room=' + roomCode}</span>
          </div>
          <button className="btn btn-ghost btn-small" onClick={()=> navigator.clipboard.writeText(location.origin + '?room=' + roomCode)}>Copy Link</button>
          <div className="divider" />
          <div className="panel-title">Move History</div>
          <div className="move-list" style={{maxHeight:200}}>
            {(()=>{
              const hist=chessRef.current.history();
              return hist.length===0? <div className="muted" style={{gridColumn:'1/-1', textAlign:'center', padding:10}}>Game start</div> : Array.from({length: Math.ceil(hist.length/2)}).map((_,i)=>(
                <React.Fragment key={i}>
                  <div className="idx">{i+1}</div>
                  <div className="mv">{hist[i*2]||''}</div>
                  <div className="mv">{hist[i*2+1]||''}</div>
                </React.Fragment>
              ));
            })()}
          </div>
        </div>

        {promotion && <PromotionModal color={myColor} onChoose={(pc)=>{ const {from,to}=promotion; setPromotion(null); sendMove(from,to,pc);}} onCancel={()=> setPromotion(null)} />}
      </div>
    );
  }

  // Lobby UI
  return (
    <div>
      <div className="row" style={{marginBottom:14}}>
        <button className="btn btn-ghost btn-small" onClick={onBack}>← Menu</button>
        <h2 className="cinzel" style={{margin:'0 0 0 12px'}}>Online Arena</h2>
        <span className="muted" style={{marginLeft:'auto', fontSize:12, display:'flex', alignItems:'center', gap:6}}><span style={{width:8,height:8, borderRadius:999, background: connected?'#10b981':'#ef4444', display:'inline-block'}}></span>{connected?'Connected':'Connecting…'}</span>
      </div>

      <div className="grid-modes" style={{gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))'}}>
        <div className="mode-card" style={{cursor:'default'}}>
          <div className="mode-icon">⚡</div>
          <h3>Quick Match</h3>
          <p>Ranked matchmaking. Finds an opponent near your Elo.</p>
          {status==='searching' ? (
            <>
              <div className="think-bar"><i style={{width:'60%', animation:'pulse 1s infinite'}}></i></div>
              <div className="muted" style={{fontSize:12}}>Searching… Elo {profile.rating} ±200</div>
              <button className="btn btn-ghost btn-small" onClick={cancelSearch}>Cancel</button>
            </>
          ) : (
            <button className="btn btn-primary" disabled={!connected} onClick={quickMatch}>Find Opponent →</button>
          )}
        </div>

        <div className="mode-card" style={{cursor:'default'}}>
          <div className="mode-icon">👑</div>
          <h3>Ranked Match</h3>
          <p>Elo-rated. Win/loss affects your global leaderboard standing.</p>
          <button className="btn btn-ghost" disabled={!connected} onClick={quickMatch}>Play Ranked</button>
        </div>

        <div className="mode-card" style={{cursor:'default'}}>
          <div className="mode-icon">☕</div>
          <h3>Casual Match</h3>
          <p>Unrated friendly. Practice without pressure.</p>
          <button className="btn btn-ghost" disabled={!connected} onClick={()=>{ socket.emit('casualMatch', {username:profile.username}); setStatus('searching');}}>Play Casual</button>
        </div>
      </div>

      <div className="section">
        <div className="panel" style={{flexDirection:'row', flexWrap:'wrap', gap:16, alignItems:'center'}}>
          <div style={{flex:1, minWidth:240}}>
            <h3 style={{margin:'0 0 6px'}}>Create Private Room</h3>
            <p className="muted" style={{fontSize:13, margin:0}}>Get a code & shareable link. Room is server-authoritative, clocks synced.</p>
          </div>
          <button className="btn btn-primary" disabled={!connected || status==='waiting'} onClick={createRoom}>Create Room</button>
          {roomCode && (
            <div style={{background:'#0f172a', border:'1px solid var(--border)', borderRadius:12, padding:'10px 14px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap'}}>
              <span style={{fontWeight:800, letterSpacing:'.12em', color:'var(--accent)'}}>{roomCode}</span>
              <span className="muted" style={{fontSize:11, fontFamily:'JetBrains Mono'}}>{location.origin}?room={roomCode}</span>
              <button className="btn btn-ghost btn-small" onClick={()=> navigator.clipboard.writeText(location.origin+ '?room='+roomCode)}>Copy</button>
              {status==='waiting' && <span className="muted" style={{fontSize:12}}>Waiting for opponent…</span>}
            </div>
          )}
        </div>

        <div className="panel" style={{flexDirection:'row', flexWrap:'wrap', gap:12, alignItems:'center'}}>
          <div style={{flex:1, minWidth:240}}>
            <h3 style={{margin:'0 0 6px'}}>Join Private Room</h3>
            <p className="muted" style={{fontSize:13, margin:0}}>Enter a code from a friend to join their room.</p>
          </div>
          <input value={joinCode} onChange={e=> setJoinCode(e.target.value.toUpperCase())} placeholder="ABCD12" style={{padding:'10px 12px', borderRadius:10, border:'1px solid var(--border)', background:'#0f172a', color:'var(--text)', letterSpacing:'.12em', fontWeight:700, width:140, textTransform:'uppercase'}} />
          <button className="btn btn-primary" disabled={!joinCode || !connected} onClick={joinRoom}>Join →</button>
        </div>
      </div>

      {roomCode && status==='waiting' && (
        <div className="panel" style={{textAlign:'center', background:'rgba(245,158,11,.08)', borderColor:'rgba(245,158,11,.25)'}}>
          <div style={{fontWeight:800}}>Waiting for opponent to join…</div>
          <div className="muted" style={{fontSize:13}}>Share the code <b style={{color:'var(--accent)'}}>{roomCode}</b> — game will start automatically.</div>
        </div>
      )}
    </div>
  );
}
