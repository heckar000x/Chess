import React from 'react';

export function MainMenu({ onNavigate, profile }){
  return (
    <>
      <div className="hero">
        <div>
          <div className="hero-badge">◈ Cross-Platform • PWA • Online & Offline</div>
          <h1>CHESS <em>LEGION</em><br/>THE FOUR MINDS ARENA</h1>
          <p>
            A complete professional chess experience. Play online against global opponents or offline against the legendary <b>Four Minds Omega</b> — a synchronized team of four specialized AIs that predict, calculate, verify and execute as one.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={()=> onNavigate('difficulty')}>⚔ Play vs Legion</button>
            <button className="btn btn-ghost" onClick={()=> onNavigate('online')}>🌐 Play Online</button>
            <button className="btn btn-ghost" onClick={()=> onNavigate('local')}>👥 Local 2-Player</button>
          </div>
          <div className="row" style={{marginTop:12, fontSize:12, color:'#94a3b8', gap:16}}>
            <span>♔ Ranked Elo • ♕ Puzzles • ♖ Analysis • ♗ Openings</span>
            <span className="hide-mobile">Commander: <b style={{color:'#f1f5f9'}}>{profile.username}</b> • {profile.rating} Elo</span>
          </div>
        </div>
        <div className="hero-card">
          <h3>Ω Omega Protocol — Four Minds Synchronized</h3>
          <div className="omega-mini">
            <div className="mind">
              <div className="mind-head"><i>🔮</i> PREDICTOR</div>
              <p>Scouts candidate moves & forecasts opponent replies 3 moves deep.</p>
            </div>
            <div className="mind">
              <div className="mind-head"><i>🧮</i> CALCULATOR</div>
              <p>Deep search with α-β, TT, quiescence. Evaluates material & position.</p>
            </div>
            <div className="mind">
              <div className="mind-head"><i>✅</i> CONFIRMER</div>
              <p>Adversarial verification — hunts blunders, hanging pieces, mates.</p>
            </div>
            <div className="mind">
              <div className="mind-head"><i>♔</i> PLAYER</div>
              <p>Final arbiter. Resolves disagreement & executes only validated move.</p>
            </div>
          </div>
          <div style={{marginTop:12, display:'flex', gap:8}}>
            <button className="btn btn-primary btn-small" style={{flex:1}} onClick={()=> onNavigate('difficulty')}>Challenge Omega →</button>
            <button className="btn btn-ghost btn-small" onClick={()=> onNavigate('analysis')}>How it works</button>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <div className="section-title">Game Modes</div>
          <span className="muted" style={{fontSize:12}}>Tap a card to start</span>
        </div>
        <div className="grid-modes">
          <div className="mode-card" onClick={()=> onNavigate('difficulty')}>
            <div className="mode-icon">🤖</div>
            <h3>Play vs AI <span className="badge-new">10 Levels</span></h3>
            <p>From Beginner to Four Minds Omega. Each level genuinely changes search depth, time & blunder rate.</p>
            <div className="mode-meta"><span>● Adaptive AI</span><span>•</span><span>Offline</span></div>
          </div>
          <div className="mode-card" onClick={()=> onNavigate('online')}>
            <div className="mode-icon">🌐</div>
            <h3>Online Multiplayer</h3>
            <p>Real-time ranked & casual matches. Server-validated moves, Elo, reconnection & rematches.</p>
            <div className="mode-meta"><span>● Live sockets</span><span>•</span><span>Ranked</span></div>
          </div>
          <div className="mode-card" onClick={()=> onNavigate('private')}>
            <div className="mode-icon">🔗</div>
            <h3>Private Room</h3>
            <p>Create a code, share a link, invite a friend. Perfect for clubs and battles with friends.</p>
            <div className="mode-meta"><span>● Room code</span><span>•</span><span>Share link</span></div>
          </div>
          <div className="mode-card" onClick={()=> onNavigate('local')}>
            <div className="mode-icon">👥</div>
            <h3>Local Multiplayer</h3>
            <p>Two players, one device. Pass-and-play with full rules, clocks & move history.</p>
            <div className="mode-meta"><span>● Couch play</span><span>•</span><span>Touch + Mouse</span></div>
          </div>
          <div className="mode-card" onClick={()=> onNavigate('practice')}>
            <div className="mode-icon">🎓</div>
            <h3>Practice Mode</h3>
            <p>Undo, hints, legal-move overlay, position analysis & unlimited retries. No pressure.</p>
            <div className="mode-meta"><span>● Hints</span><span>•</span><span>Undo</span></div>
          </div>
          <div className="mode-card" onClick={()=> onNavigate('puzzles')}>
            <div className="mode-icon">🧩</div>
            <h3>Tactical Puzzles</h3>
            <p>Mate in 1-3, forks, pins, skewers & sacrifices. Progressive difficulty with solutions.</p>
            <div className="mode-meta"><span>● 200+ puzzles</span><span>•</span><span>Training</span></div>
          </div>
          <div className="mode-card" onClick={()=> onNavigate('openings')}>
            <div className="mode-icon">📖</div>
            <h3>Opening Explorer</h3>
            <p>Study Ruy Lopez, Sicilian, Queen's Gambit & more with board visualization.</p>
            <div className="mode-meta"><span>● 10 openings</span><span>•</span><span>Interactive</span></div>
          </div>
          <div className="mode-card" onClick={()=> onNavigate('analysis')}>
            <div className="mode-icon">📊</div>
            <h3>Game Analysis</h3>
            <p>Review your games move-by-move with engine evaluation graph & best-move suggestions.</p>
            <div className="mode-meta"><span>● Eval graph</span><span>•</span><span>PGN/FEN</span></div>
          </div>
          <div className="mode-card" onClick={()=> onNavigate('leaderboard')}>
            <div className="mode-icon">🏆</div>
            <h3>Leaderboard</h3>
            <p>Global Elo rankings, win/loss records & personal progression.</p>
            <div className="mode-meta"><span>● Elo</span><span>•</span><span>Seasons</span></div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="panel" style={{flexDirection:'row', flexWrap:'wrap', gap:14, alignItems:'center', justifyContent:'space-between'}}>
          <div>
            <div style={{fontWeight:800}}>Install as App • Works Offline</div>
            <div className="muted" style={{fontSize:13}}>Add to Home Screen for full-screen, installable PWA. AI works 100% offline.</div>
          </div>
          <button className="btn btn-ghost btn-small" onClick={()=>{
            if(navigator.share) navigator.share({title:'Chess Legion', text:'Play Chess Legion — Four Minds Arena', url: location.href});
            else alert('Copy link: '+location.href);
          }}>Share Legion ↗</button>
        </div>
      </div>
    </>
  );
}
