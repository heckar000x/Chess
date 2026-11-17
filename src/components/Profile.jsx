import React, { useState } from 'react';
import { loadProfile, saveProfile, loadGames } from '../utils/storage.js';

export function Profile({ onBack }){
  const [profile, setProfile] = useState(()=> loadProfile());
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.username);
  const [avatar, setAvatar] = useState(profile.avatar);
  const games = loadGames();

  function save(){
    const np = { ...profile, username: name || 'Legion Commander', avatar: avatar || '♔' };
    setProfile(np); saveProfile(np); setEditing(false);
  }

  const winRate = profile.gamesPlayed ? Math.round((profile.wins / profile.gamesPlayed)*100) : 0;

  return (
    <div>
      <div className="row" style={{marginBottom:14}}>
        <button className="btn btn-ghost btn-small" onClick={onBack}>← Menu</button>
        <h2 className="cinzel" style={{margin:'0 0 0 12px'}}>Commander Profile</h2>
      </div>

      <div className="game-layout" style={{gridTemplateColumns:'360px 1fr'}}>
        <div className="panel">
          <div style={{display:'flex', gap:14, alignItems:'center'}}>
            <div className="avatar" style={{width:64,height:64, fontSize:28}}>{profile.avatar}</div>
            <div>
              <div style={{fontWeight:800, fontSize:18}}>{profile.username}</div>
              <div className="muted" style={{fontSize:12}}>ID: {profile.id} • Since {new Date(profile.createdAt).toLocaleDateString()}</div>
              <div style={{marginTop:6, display:'flex', gap:6}}>
                <span className="diff-elo">Elo {profile.rating}</span>
                <span className="diff-elo" style={{background:'rgba(245,158,11,.12)', color:'var(--accent)', borderColor:'rgba(245,158,11,.25)'}}>Best {profile.bestRating}</span>
              </div>
            </div>
          </div>

          {!editing ? (
            <button className="btn btn-ghost btn-small" style={{marginTop:12}} onClick={()=> setEditing(true)}>✎ Edit Profile</button>
          ) : (
            <div className="col" style={{marginTop:12, background:'var(--panel-2)', padding:12, borderRadius:12, border:'1px solid var(--border)'}}>
              <label style={{fontSize:12, fontWeight:700}}>Username</label>
              <input value={name} onChange={e=> setName(e.target.value)} placeholder="Your name" style={{padding:'10px 12px', borderRadius:10, border:'1px solid var(--border)', background:'#0f172a', color:'var(--text)'}} />
              <label style={{fontSize:12, fontWeight:700}}>Avatar (emoji or letter)</label>
              <input value={avatar} onChange={e=> setAvatar(e.target.value.slice(0,2))} style={{padding:'10px 12px', borderRadius:10, border:'1px solid var(--border)', background:'#0f172a', color:'var(--text)', width:80}} />
              <div className="row">
                <button className="btn btn-primary btn-small" onClick={save}>Save</button>
                <button className="btn btn-ghost btn-small" onClick={()=> setEditing(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div className="divider" />
          <div className="grid-modes" style={{gridTemplateColumns:'repeat(3,1fr)', gap:8}}>
            <div className="panel" style={{padding:10, textAlign:'center', background:'var(--panel-2)'}}>
              <div style={{fontWeight:800, fontSize:20}}>{profile.wins}</div><div className="muted" style={{fontSize:11}}>WINS</div>
            </div>
            <div className="panel" style={{padding:10, textAlign:'center', background:'var(--panel-2)'}}>
              <div style={{fontWeight:800, fontSize:20}}>{profile.draws}</div><div className="muted" style={{fontSize:11}}>DRAWS</div>
            </div>
            <div className="panel" style={{padding:10, textAlign:'center', background:'var(--panel-2)'}}>
              <div style={{fontWeight:800, fontSize:20}}>{profile.losses}</div><div className="muted" style={{fontSize:11}}>LOSSES</div>
            </div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:13}}>
            <div className="panel" style={{background:'var(--panel-2)', padding:10}}><span className="muted">Games</span><br/><b>{profile.gamesPlayed}</b></div>
            <div className="panel" style={{background:'var(--panel-2)', padding:10}}><span className="muted">Win rate</span><br/><b>{winRate}%</b></div>
            <div className="panel" style={{background:'var(--panel-2)', padding:10}}><span className="muted">Favorite</span><br/><b>{profile.favoriteMode}</b></div>
            <div className="panel" style={{background:'var(--panel-2)', padding:10}}><span className="muted">Rating</span><br/><b>{profile.rating} Elo</b></div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Match History</span>
            <span className="muted" style={{fontSize:12}}>{games.length} games</span>
          </div>
          {games.length===0 ? (
            <div className="muted center" style={{padding:24}}>No games yet — play your first battle!</div>
          ) : (
            <div className="list">
              {games.slice(0,20).map((g,i)=>(
                <li key={i}>
                  <div>
                    <div style={{fontWeight:700}}>{g.mode} • {g.result} <span className="muted" style={{fontWeight:400, fontSize:12}}>{g.levelId?`Lv${g.levelId}`:''}</span></div>
                    <div className="muted" style={{fontSize:12}}>{new Date(g.date).toLocaleString()} • {g.history?.slice(0,4).join(' ')}</div>
                  </div>
                  <span className="kbd">{g.result}</span>
                </li>
              ))}
            </div>
          )}
          <div className="divider" />
          <div className="row">
            <button className="btn btn-ghost btn-small" onClick={()=>{ if(confirm('Clear all local games?')){ localStorage.removeItem('chess_legion_games'); location.reload(); }}}>Clear History</button>
          </div>
        </div>
      </div>
    </div>
  );
}
