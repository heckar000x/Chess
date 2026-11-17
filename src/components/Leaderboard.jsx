import React, { useEffect, useState } from 'react';
import { loadProfile } from '../utils/storage.js';

export function Leaderboard({ onBack }){
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const me = loadProfile();

  useEffect(()=>{
    // Try fetch from server, fallback to mock
    fetch('/api/leaderboard').then(r=> r.json()).then(data=>{
      if(data && data.leaders) setLeaders(data.leaders);
      else throw new Error('no data');
      setLoading(false);
    }).catch(()=>{
      // mock leaderboard
      const mock = [
        { username:'OmegaSlayer', rating:2412, wins:342, losses:51, title:'Grandmaster' },
        { username:'LegionPrime', rating:2320, wins:298, losses:62, title:'Master' },
        { username:'KnightRider', rating:2195, wins:210, losses:44, title:'Expert' },
        { username:'QueenGambit', rating:2077, wins:189, losses:55, title:'Expert' },
        { username: me.username, rating: me.rating, wins: me.wins, losses: me.losses, title:'You', isMe:true },
        { username:'PawnStorm', rating:1820, wins:145, losses:78, title:'Advanced' },
        { username:'BishopPair', rating:1711, wins:120, losses:90, title:'Advanced' },
        { username:'RookRoll', rating:1550, wins:98, losses:102, title:'Intermediate' },
        { username:'NoviceNoMore', rating:1320, wins:66, losses:88, title:'Casual' },
      ].sort((a,b)=> b.rating - a.rating);
      setLeaders(mock);
      setLoading(false);
    });
  },[]);

  return (
    <div>
      <div className="row" style={{marginBottom:14}}>
        <button className="btn btn-ghost btn-small" onClick={onBack}>← Menu</button>
        <h2 className="cinzel" style={{margin:'0 0 0 12px'}}>Global Leaderboard</h2>
        <span className="muted" style={{marginLeft:'auto', fontSize:12}}>Elo • Updated live</span>
      </div>

      {loading ? <div className="panel">Loading…</div> : (
        <div className="panel" style={{padding:0, overflow:'hidden'}}>
          <table className="table">
            <thead><tr><th>#</th><th>Player</th><th>Rating</th><th>W-L</th><th>Title</th></tr></thead>
            <tbody>
              {leaders.map((p,i)=>(
                <tr key={i} style={p.isMe?{outline:'2px solid var(--accent)', outlineOffset:-2, borderRadius:12}:undefined}>
                  <td>#{i+1} {i===0?'👑':''}</td>
                  <td style={{fontWeight:800, display:'flex', alignItems:'center', gap:8}}>
                    <span className="avatar" style={{width:28,height:28, fontSize:12}}>{p.username.slice(0,2).toUpperCase()}</span>
                    {p.username} {p.isMe && <span style={{background:'var(--accent)', color:'#0f172a', padding:'2px 6px', borderRadius:999, fontSize:11}}>YOU</span>}
                  </td>
                  <td><b>{p.rating}</b></td>
                  <td>{p.wins}-{p.losses}</td>
                  <td><span className="kbd">{p.title}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="panel" style={{marginTop:14, flexDirection:'row', flexWrap:'wrap', gap:12}}>
        <div><b>How ranking works:</b> <span className="muted">Elo K=32. Win vs stronger opponent = more points. Only ranked online & Omega victories affect global board; local games affect your personal rating.</span></div>
      </div>
    </div>
  );
}
