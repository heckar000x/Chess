import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Chess } from 'chess.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
// Allow embedding in Arena preview iframe
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', 'frame-ancestors *');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  next();
});

// Simple file DB for persistence (fallback from sqlite)
const DB_PATH = path.join(__dirname, 'db.json');
function loadDB(){
  try{
    if(fs.existsSync(DB_PATH)){
      return JSON.parse(fs.readFileSync(DB_PATH,'utf8'));
    }
  }catch{}
  return { players:[], games:[], rooms:{} };
}
function saveDB(db){
  try{ fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); }catch(e){ console.error('saveDB',e); }
}
let db = loadDB();

// Serve dist if exists (production)
const distPath = path.join(__dirname, '../dist');
if(fs.existsSync(distPath)){
  app.use(express.static(distPath));
}

// API
app.get('/api/health', (req,res)=> res.json({ ok:true, time: Date.now(), players: db.players.length, games: db.games.length }));

app.get('/api/leaderboard', (req,res)=>{
  const leaders = [...db.players].sort((a,b)=> b.rating - a.rating).slice(0,20);
  // If empty, provide seed
  if(leaders.length===0){
    res.json({ leaders: [
      { username:'OmegaSlayer', rating:2412, wins:342, losses:51, title:'Grandmaster' },
      { username:'LegionPrime', rating:2320, wins:298, losses:62, title:'Master' },
      { username:'KnightRider', rating:2195, wins:210, losses:44, title:'Expert' },
    ]});
  } else {
    res.json({ leaders: leaders.map(p=> ({ username:p.username, rating:p.rating, wins:p.wins||0, losses:p.losses||0, draws:p.draws||0, title: titleForRating(p.rating)})) });
  }
});

app.get('/api/profile/:username', (req,res)=>{
  const p = db.players.find(x=> x.username===req.params.username);
  if(!p) return res.status(404).json({ error:'not found'});
  res.json(p);
});

app.post('/api/profile', (req,res)=>{
  const { username, rating } = req.body;
  if(!username) return res.status(400).json({error:'username required'});
  let p = db.players.find(x=> x.username===username);
  if(!p){
    p = { id: 'p_'+Math.random().toString(36).slice(2,9), username, rating: rating||1200, wins:0, losses:0, draws:0, bestRating: rating||1200, createdAt: Date.now() };
    db.players.push(p);
  }
  saveDB(db);
  res.json(p);
});

function titleForRating(r){
  if(r>=2400) return 'Grandmaster';
  if(r>=2200) return 'Master';
  if(r>=2000) return 'Expert';
  if(r>=1800) return 'Advanced';
  if(r>=1500) return 'Intermediate';
  return 'Casual';
}

function eloDelta(playerRating, opponentRating, score){
  const K=32;
  const expected = 1/(1+Math.pow(10,(opponentRating-playerRating)/400));
  return Math.round(K*(score-expected));
}

// History: we persist games
app.get('/api/games', (req,res)=> res.json(db.games.slice(0,50)));

// In-memory room & matchmaking state
const rooms = new Map(); // roomId -> { id, fen, chess, players: [{socketId, username, rating, color}], history, clocks, status, createdAt }
const waitingQueue = []; // { socketId, username, rating, socket }
const socketRooms = new Map(); // socketId -> roomId

function genRoomId(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id=''; for(let i=0;i<6;i++) id+= chars[Math.floor(Math.random()*chars.length)];
  return id;
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingTimeout: 20000,
  pingInterval: 25000
});

io.on('connection', (socket)=>{
  console.log('connect', socket.id);

  socket.on('createRoom', ({ username, rating })=>{
    const roomId = genRoomId();
    const chess = new Chess();
    const room = {
      id: roomId,
      fen: chess.fen(),
      chess,
      players: [{ socketId: socket.id, username: username||'Player1', rating: rating||1200, color:'w' }],
      history: [],
      clocks: { w: 600, b:600 },
      status: 'waiting',
      createdAt: Date.now(),
      type:'private'
    };
    rooms.set(roomId, room);
    socketRooms.set(socket.id, roomId);
    socket.join(roomId);
    socket.emit('roomCreated', { roomId, color:'w', fen: chess.fen() });
    console.log('room created', roomId, 'by', username);
  });

  socket.on('joinRoom', ({ roomId, username, rating })=>{
    const room = rooms.get(roomId);
    if(!room){
      socket.emit('error', { message:'Room not found: '+roomId });
      return;
    }
    if(room.players.length>=2){
      socket.emit('error', { message:'Room full' });
      return;
    }
    if(room.players.some(p=> p.socketId===socket.id)){
      socket.emit('error', { message:'Already in room'});
      return;
    }
    const color = room.players[0].color==='w' ? 'b' : 'w';
    const player = { socketId: socket.id, username: username||'Player2', rating: rating||1200, color };
    room.players.push(player);
    room.status='playing';
    socket.join(roomId);
    socketRooms.set(socket.id, roomId);

    // Notify both
    const opponentForNew = room.players.find(p=> p.socketId!==socket.id);
    const opponentForOld = player;

    io.to(roomId).emit('opponentJoined', { opponent: player, fen: room.fen });
    // also gameStart
    io.to(room.players[0].socketId).emit('gameStart', { roomId, fen: room.fen, players: room.players, yourColor: room.players[0].color, opponent: room.players[1] });
    io.to(player.socketId).emit('gameStart', { roomId, fen: room.fen, players: room.players, yourColor: color, opponent: opponentForNew });

    // Ensure game DB entry
    console.log('player joined', roomId, username, color);
  });

  socket.on('quickMatch', ({ username, rating })=>{
    // Add to queue, try match
    const existingIdx = waitingQueue.findIndex(q=> q.socketId===socket.id);
    if(existingIdx!==-1) waitingQueue.splice(existingIdx,1);
    waitingQueue.push({ socketId: socket.id, username: username||'Player', rating: rating||1200, socket });
    socket.emit('matchmakingUpdate', { status:'searching' });
    tryMatch();
  });

  socket.on('casualMatch', ({ username, rating })=>{
    waitingQueue.push({ socketId: socket.id, username: username||'Player', rating: rating||1200, socket, casual:true });
    socket.emit('matchmakingUpdate', { status:'searching' });
    tryMatch();
  });

  function tryMatch(){
    if(waitingQueue.length<2) return;
    // sort by rating proximity? simple FIFO with rating window
    // Try to pair closest rating
    waitingQueue.sort((a,b)=> a.rating - b.rating);
    for(let i=0;i<waitingQueue.length-1;i++){
      const a = waitingQueue[i];
      const b = waitingQueue[i+1];
      if(Math.abs(a.rating - b.rating) <= 300 || waitingQueue.length>4){
        // match
        waitingQueue.splice(i,2);
        const roomId = genRoomId();
        const chess = new Chess();
        // randomize colors
        const aColor = Math.random()<0.5?'w':'b';
        const bColor = aColor==='w'?'b':'w';
        const room = {
          id: roomId,
          fen: chess.fen(),
          chess,
          players: [
            { socketId: a.socketId, username: a.username, rating: a.rating, color: aColor },
            { socketId: b.socketId, username: b.username, rating: b.rating, color: bColor }
          ],
          history:[],
          clocks:{w:600,b:600},
          status:'playing',
          createdAt: Date.now(),
          type: a.casual||b.casual ? 'casual':'ranked'
        };
        rooms.set(roomId, room);
        socketRooms.set(a.socketId, roomId);
        socketRooms.set(b.socketId, roomId);
        a.socket.join(roomId);
        b.socket.join(roomId);
        io.to(a.socketId).emit('gameStart', { roomId, fen: chess.fen(), players: room.players, yourColor: aColor, opponent: room.players.find(p=>p.socketId===b.socketId) });
        io.to(b.socketId).emit('gameStart', { roomId, fen: chess.fen(), players: room.players, yourColor: bColor, opponent: room.players.find(p=>p.socketId===a.socketId) });
        console.log('matched', a.username, 'vs', b.username, 'room', roomId);
        break;
      }
    }
  }

  socket.on('cancelSearch', ()=>{
    const idx = waitingQueue.findIndex(q=> q.socketId===socket.id);
    if(idx!==-1) waitingQueue.splice(idx,1);
    socket.emit('matchmakingUpdate', { status:'idle' });
  });

  socket.on('move', ({ roomId, from, to, promotion })=>{
    const room = rooms.get(roomId);
    if(!room){
      socket.emit('error', { message:'Room not found' });
      return;
    }
    const player = room.players.find(p=> p.socketId===socket.id);
    if(!player){
      socket.emit('error', { message:'Not in this room'});
      return;
    }
    if(room.chess.turn()!==player.color){
      socket.emit('error', { message:'Not your turn'});
      return;
    }
    // Validate move
    const chess = room.chess;
    let move=null;
    try{
      move = chess.move({ from, to, promotion: promotion||'q' });
    }catch(e){
      socket.emit('error', { message:'Invalid move: '+e.message });
      return;
    }
    if(!move){
      socket.emit('error', { message:'Illegal move' });
      return;
    }
    room.fen = chess.fen();
    room.history.push(move.san);
    // Broadcast authoritative
    io.to(roomId).emit('move', { from: move.from, to: move.to, promotion: move.promotion, san: move.san, fen: room.fen, turn: chess.turn(), by: player.username });

    // Check game over
    if(chess.isGameOver()){
      let result='*', reason='';
      if(chess.isCheckmate()){ result = chess.turn()==='w'?'0-1':'1-0'; reason='checkmate'; }
      else if(chess.isStalemate()){ result='1/2-1/2'; reason='stalemate'; }
      else if(chess.isThreefoldRepetition()){ result='1/2-1/2'; reason='threefold repetition'; }
      else if(chess.isInsufficientMaterial()){ result='1/2-1/2'; reason='insufficient material'; }
      else if(chess.isDraw()){ result='1/2-1/2'; reason='draw'; }
      const half = parseInt(chess.fen().split(' ')[4],10);
      if(half>=100 && !reason){ result='1/2-1/2'; reason='fifty-move rule'; }

      room.status='finished';
      io.to(roomId).emit('gameOver', { result, reason, fen: room.fen, history: room.history });

      // Rating update if ranked
      if(room.type==='ranked' && room.players.length===2){
        const p1 = room.players[0], p2 = room.players[1];
        let score1 = result==='1/2-1/2'?0.5 : (result==='1-0' ? (p1.color==='w'?1:0) : (p1.color==='w'?0:1));
        let score2 = 1 - score1;
        if(result==='1/2-1/2'){ score1=0.5; score2=0.5; }
        // find or create player records
        for(let pl of room.players){
          let rec = db.players.find(x=> x.username===pl.username);
          if(!rec){
            rec = { id:'p_'+Math.random().toString(36).slice(2,9), username:pl.username, rating: pl.rating, wins:0, losses:0, draws:0, bestRating: pl.rating, createdAt: Date.now() };
            db.players.push(rec);
          }
          // delta
          const opp = room.players.find(x=> x.socketId!==pl.socketId);
          const oppRec = db.players.find(x=> x.username===opp.username);
          const oppRating = oppRec? oppRec.rating : opp.rating;
          const sc = pl.socketId===p1.socketId? score1: score2;
          const delta = eloDelta(rec.rating, oppRating, sc);
          rec.rating += delta;
          rec.bestRating = Math.max(rec.bestRating, rec.rating);
          if(sc===1) rec.wins=(rec.wins||0)+1;
          else if(sc===0) rec.losses=(rec.losses||0)+1;
          else rec.draws=(rec.draws||0)+1;
        }
        db.games.push({ roomId, players: room.players.map(p=> ({username:p.username, rating:p.rating, color:p.color})), result, reason, history: room.history, fen: room.fen, date: Date.now(), type: room.type });
        saveDB(db);
      } else {
        db.games.push({ roomId, players: room.players.map(p=> ({username:p.username, color:p.color})), result, reason, history: room.history, fen: room.fen, date: Date.now(), type: room.type||'private' });
        saveDB(db);
      }
    }
  });

  socket.on('chat', ({ roomId, text })=>{
    const room = rooms.get(roomId);
    if(!room) return;
    const player = room.players.find(p=> p.socketId===socket.id);
    if(!player) return;
    const sanitized = String(text||'').slice(0,120).replace(/</g,'');
    io.to(roomId).emit('chat', { from: player.username, text: sanitized, at: Date.now() });
  });

  socket.on('resign', ({ roomId })=>{
    const room = rooms.get(roomId);
    if(!room) return;
    const player = room.players.find(p=> p.socketId===socket.id);
    if(!player) return;
    const result = player.color==='w' ? '0-1' : '1-0';
    room.status='finished';
    io.to(roomId).emit('gameOver', { result, reason: `${player.username} resigned`, fen: room.fen });
    // record
    db.games.push({ roomId, players: room.players.map(p=>({username:p.username,color:p.color})), result, reason:'resign', history: room.history, fen: room.fen, date: Date.now() });
    saveDB(db);
  });

  socket.on('offerDraw', ({ roomId })=>{
    const room = rooms.get(roomId);
    if(!room) return;
    const player = room.players.find(p=> p.socketId===socket.id);
    if(!player) return;
    // For simplicity auto-accept if both offer? We'll broadcast offer
    socket.to(roomId).emit('drawOffer', { from: player.username });
    // Auto accept for demo after 1 second if not rejected? But we will require other side to accept via same event
    // Simplified: if second offer, draw
    room.drawOffers = room.drawOffers || new Set();
    room.drawOffers.add(player.socketId);
    if(room.drawOffers.size>=2){
      room.status='finished';
      io.to(roomId).emit('gameOver', { result:'1/2-1/2', reason:'draw by agreement', fen: room.fen });
      db.games.push({ roomId, players: room.players.map(p=>({username:p.username,color:p.color})), result:'1/2-1/2', reason:'draw', history: room.history, fen: room.fen, date: Date.now() });
      saveDB(db);
    }
  });

  socket.on('disconnect', ()=>{
    console.log('disconnect', socket.id);
    // remove from queue
    const qIdx = waitingQueue.findIndex(q=> q.socketId===socket.id);
    if(qIdx!==-1) waitingQueue.splice(qIdx,1);
    const roomId = socketRooms.get(socket.id);
    if(roomId){
      const room = rooms.get(roomId);
      if(room){
        // notify other player
        socket.to(roomId).emit('opponentDisconnected', { at: Date.now() });
        // Keep room for reconnection for 60s
        setTimeout(()=>{
          // if room still waiting and only one player left, keep?
          // If game was playing and player disconnected, award win? We'll wait 60s then declare abandon
          const r = rooms.get(roomId);
          if(r && r.status==='playing'){
            // Check if disconnected socket's player still not reconnected
            const stillGone = !io.sockets.sockets.get(socket.id);
            // For demo, not auto win; just close
          }
        }, 60000);
      }
      socketRooms.delete(socket.id);
    }
  });
});

// Fallback for SPA
app.get('*', (req,res)=>{
  if(fs.existsSync(path.join(distPath,'index.html'))){
    res.sendFile(path.join(distPath,'index.html'));
  } else {
    res.status(404).send('Not found — run npm run build for client. Server API is at /api/*');
  }
});

server.listen(PORT, '0.0.0.0', ()=>{
  console.log(`CHESS LEGION server listening on http://0.0.0.0:${PORT}`);
  if(fs.existsSync(distPath)) console.log('Serving client from', distPath);
  else console.log('No client build found — run npm run build');
});
