import React, { useState, useEffect } from 'react';
import { MainMenu } from './components/MainMenu.jsx';
import { DifficultySelect } from './components/DifficultySelect.jsx';
import { GameScreen } from './components/GameScreen.jsx';
import { Puzzles } from './components/Puzzles.jsx';
import { Openings } from './components/Openings.jsx';
import { Profile } from './components/Profile.jsx';
import { Leaderboard } from './components/Leaderboard.jsx';
import { Analysis } from './components/Analysis.jsx';
import { OnlineLobby } from './components/OnlineLobby.jsx';
import { loadProfile, saveProfile } from './utils/storage.js';
import { sfxClick } from './utils/sound.js';

export default function App(){
  const [route, setRoute] = useState('menu'); // menu, difficulty, game-ai, game-local, game-practice, puzzles, openings, profile, leaderboard, analysis, online, private
  const [levelId, setLevelId] = useState(5);
  const [profile, setProfile] = useState(()=> loadProfile());
  const [toast, setToast] = useState(null);

  // Check URL for room join
  useEffect(()=>{
    const params = new URLSearchParams(location.search);
    const room = params.get('room');
    if(room) setRoute('online');
  },[]);

  function navigate(r){
    sfxClick();
    setRoute(r);
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function showToast(msg){
    setToast(msg);
    setTimeout(()=> setToast(null), 2200);
  }

  let content = null;
  if(route==='menu') content = <MainMenu onNavigate={(dest)=>{
      if(dest==='difficulty') navigate('difficulty');
      else if(dest==='online') navigate('online');
      else if(dest==='private') navigate('online');
      else if(dest==='local') navigate('game-local');
      else if(dest==='practice') navigate('game-practice');
      else if(dest==='puzzles') navigate('puzzles');
      else if(dest==='openings') navigate('openings');
      else if(dest==='analysis') navigate('analysis');
      else if(dest==='leaderboard') navigate('leaderboard');
      else if(dest==='profile') navigate('profile');
      else showToast('Coming soon: '+dest);
    }} profile={profile} />;
  else if(route==='difficulty') content = <DifficultySelect currentLevel={levelId} onBack={()=> navigate('menu')} onSelect={(id)=>{ setLevelId(id); navigate('game-ai'); }} />;
  else if(route==='game-ai') content = <GameScreen mode="ai" levelId={levelId} onExit={()=> navigate('menu')} />;
  else if(route==='game-local') content = <GameScreen mode="local" onExit={()=> navigate('menu')} />;
  else if(route==='game-practice') content = <GameScreen mode="practice" levelId={levelId} onExit={()=> navigate('menu')} />;
  else if(route==='puzzles') content = <Puzzles onBack={()=> navigate('menu')} />;
  else if(route==='openings') content = <Openings onBack={()=> navigate('menu')} />;
  else if(route==='profile') content = <Profile onBack={()=> navigate('menu')} />;
  else if(route==='leaderboard') content = <Leaderboard onBack={()=> navigate('menu')} />;
  else if(route==='analysis') content = <Analysis onBack={()=> navigate('menu')} />;
  else if(route==='online') content = <OnlineLobby onBack={()=> navigate('menu')} />;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" onClick={()=> navigate('menu')} style={{cursor:'pointer'}}>
          <div className="brand-mark">CL</div>
          <div>
            <div className="brand-title">CHESS <span>LEGION</span></div>
            <div className="brand-sub">The Four Minds Arena</div>
          </div>
        </div>
        <div className="top-actions">
          <button className="icon-btn" title="Profile" onClick={()=> navigate('profile')}>{profile.avatar}</button>
          <button className="icon-btn" title="Leaderboard" onClick={()=> navigate('leaderboard')}>🏆</button>
          <button className="icon-btn" title="Analysis" onClick={()=> navigate('analysis')}>📊</button>
          <div className="hide-mobile" style={{display:'flex', gap:8, marginLeft:8}}>
            <span className="diff-elo" style={{background:'#0f172a'}}>{profile.rating} Elo</span>
          </div>
        </div>
      </header>

      <main className="main">
        {content}
      </main>

      <footer style={{borderTop:'1px solid #1e293b', padding:'18px 16px', textAlign:'center', color:'#64748b', fontSize:12, lineHeight:1.6}}>
        <div style={{maxWidth:800, margin:'0 auto'}}>
          <b style={{color:'#94a3b8', letterSpacing:'.06em'}}>CHESS LEGION — The Four Minds Arena</b> • Offline AI works without internet • Online server validates every move<br/>
          <span>Chess rules verified with chess.js • Search: Negamax + α-β + quiescence • PWA installable • Made for mobile & desktop</span>
        </div>
      </footer>

      {toast && (
        <div className="toast-wrap">
          <div className="toast">◈ {toast}</div>
        </div>
      )}
    </div>
  );
}
