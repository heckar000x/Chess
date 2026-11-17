/**
 * Local storage helpers
 */
const PREFIX = 'chess_legion_';

export function save(key, val){
  try{ localStorage.setItem(PREFIX+key, JSON.stringify(val)); }catch{}
}
export function load(key, fallback=null){
  try{
    const v = localStorage.getItem(PREFIX+key);
    return v ? JSON.parse(v) : fallback;
  }catch{ return fallback; }
}
export function remove(key){
  try{ localStorage.removeItem(PREFIX+key); }catch{}
}

export function saveProfile(profile){
  save('profile', profile);
}
export function loadProfile(){
  return load('profile', {
    id: 'local_' + Math.random().toString(36).slice(2,8),
    username: 'Legion Commander',
    avatar: '♔',
    rating: 1200,
    wins: 0, losses:0, draws:0,
    gamesPlayed:0,
    bestRating:1200,
    favoriteMode:'AI',
    createdAt: Date.now()
  });
}
export function saveGame(game){ 
  const games = load('games', []);
  games.unshift(game);
  save('games', games.slice(0,50));
}
export function loadGames(){ return load('games', []); }
export function saveSettings(s){ save('settings', s); }
export function loadSettings(){
  return load('settings', {
    theme:'classic',
    showCoords:true,
    showHints:true,
    showLastMove:true,
    sound:true,
    boardFlipped:false,
    animations:true
  });
}
export function eloChange(playerRating, opponentRating, score){
  // score: 1 win, 0.5 draw, 0 loss
  const K=32;
  const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating)/400));
  return Math.round(K * (score - expected));
}
