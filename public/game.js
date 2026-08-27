const COLS=10, ROWS=20, S=30, colors=['','#30c8ff','#3f51ff','#ff9d2e','#ffe23d','#51d66d','#bd5cff','#ff4e66'];
const shapes=[[[1,1,1,1]],[[2,0,0],[2,2,2]],[[0,0,3],[3,3,3]],[[4,4],[4,4]],[[0,5,5],[5,5,0]],[[0,6,0],[6,6,6]],[[7,7,0],[0,7,7]]];
const boardEl=document.querySelector('#board'),ctx=boardEl.getContext('2d'),nextCtx=document.querySelector('#next').getContext('2d');ctx.scale(S,S);nextCtx.scale(20,20);
let board, piece, next, score, lines, running=false, paused=false, gameMessage='PRESS START', last=0, drop=0, socket, room='', peerRoom, sendPeerState, playerName='', lastSync=0;
const peerPlayers=new Map();
const defaults={left:'ArrowLeft',right:'ArrowRight',down:'ArrowDown',rotate:'ArrowUp',hardDrop:' '};
function loadKeys(){try{return JSON.parse(localStorage.getItem('tetris-keys')||'{}');}catch{return {};}}
let keys={...defaults,...loadKeys()};
const keyLabel=(key)=>key===' ' ? 'Space' : key;
function paintBindings(){document.querySelectorAll('#bindings input').forEach(input=>input.value=keyLabel(keys[input.dataset.action]));}
function saveKeys(){localStorage.setItem('tetris-keys',JSON.stringify(keys));paintBindings();}
const empty=()=>Array.from({length:ROWS},()=>Array(COLS).fill(0));
const newPiece=()=>({m:shapes[Math.floor(Math.random()*shapes.length)].map(r=>[...r]),x:3,y:0});
function reset(){board=empty();piece=newPiece();next=newPiece();score=0;lines=0;running=true;paused=false;gameMessage='';last=performance.now();drop=0;ui();}
function initialize(){board=empty();piece=newPiece();next=newPiece();score=0;lines=0;running=false;paused=false;gameMessage='PRESS START';ui();}
function collide(p,dx=0,dy=0,m=p.m){return m.some((r,y)=>r.some((v,x)=>v&&(board[y+p.y+dy]?.[x+p.x+dx]??1)));}
function drawMatrix(m,off,c=ctx){m.forEach((r,y)=>r.forEach((v,x)=>{if(v){c.fillStyle=colors[v];c.fillRect(x+off.x,y+off.y,1,1);c.fillStyle='rgba(255,255,255,.25)';c.fillRect(x+off.x,y+off.y,.13,1);}}));}
function draw(){ctx.fillStyle='#020817';ctx.fillRect(0,0,COLS,ROWS);drawMatrix(board,{x:0,y:0});if(running)drawMatrix(piece.m,{x:piece.x,y:piece.y});nextCtx.fillStyle='#020817';nextCtx.fillRect(0,0,6,5);drawMatrix(next.m,{x:1,y:1},nextCtx);}
function merge(){piece.m.forEach((r,y)=>r.forEach((v,x)=>{if(v)board[y+piece.y][x+piece.x]=v;}));let n=0;board=board.filter(r=>{if(r.every(Boolean)){n++;return false}return true});while(board.length<ROWS)board.unshift(Array(COLS).fill(0));if(n){lines+=n;score+=[0,100,300,500,800][n];}piece=next;piece.x=3;piece.y=0;next=newPiece();if(collide(piece)){running=false;gameMessage='GAME OVER';}ui();}
function down(){if(!running||paused)return;if(!collide(piece,0,1))piece.y++;else merge();drop=0;}
function rotate(){const m=piece.m[0].map((_,i)=>piece.m.map(r=>r[i]).reverse());if(!collide(piece,0,0,m))piece.m=m;}
function ui(){document.querySelector('#score').textContent=String(score).padStart(6,'0');document.querySelector('#lines').textContent=String(lines).padStart(2,'0');const pauseButton=document.querySelector('#pause');pauseButton.textContent=paused?'RESUME':'PAUSE';pauseButton.disabled=!running;pauseButton.setAttribute('aria-pressed',String(paused));const startButton=document.querySelector('#start');startButton.textContent=running?'RESTART':gameMessage==='GAME OVER'?'PLAY AGAIN':'START';const status=document.querySelector('#gameStatus');status.textContent=paused?'PAUSED':gameMessage;status.classList.toggle('hidden',running&&!paused);}
function tick(t){const delta=t-last;last=t;if(running&&!paused){drop+=delta;if(drop>Math.max(120,800-lines*4))down();}draw();if(t-lastSync>100){if(socket&&room)socket.emit('state',{board,score});if(sendPeerState)sendPeerState({name:playerName,board,score});lastSync=t;}requestAnimationFrame(tick)}
document.addEventListener('keydown',e=>{const action=Object.entries(keys).find(([,key])=>key===e.key)?.[0];if(action)e.preventDefault();if(!running||!action)return;if(action==='left'&&!collide(piece,-1))piece.x--;if(action==='right'&&!collide(piece,1))piece.x++;if(action==='down')down();if(action==='rotate')rotate();if(action==='hardDrop'){while(!collide(piece,0,1))piece.y++;down();}});
document.querySelector('#start').addEventListener('click',reset);document.querySelector('#pause').addEventListener('click',()=>{if(running){paused=!paused;ui();}});
document.querySelector('#settings').onclick=()=>document.querySelector('#settingsPanel').classList.toggle('hidden');
document.querySelectorAll('#bindings input').forEach(input=>input.addEventListener('keydown',e=>{e.preventDefault();e.stopPropagation();if(['Tab','Shift','Control','Alt','Meta'].includes(e.key))return;keys[input.dataset.action]=e.key;saveKeys();input.blur();}));
document.querySelector('#resetKeys').onclick=()=>{keys={...defaults};saveKeys();};paintBindings();
async function connectMultiplayer(){
  const status=document.querySelector('#roomStatus');
  try{
    if(typeof window.io!=='function'){const library=window.loadSocketLibrary?await window.loadSocketLibrary():await import('/socket.io/socket.io.esm.min.js');window.io=library.io;}
  }catch{status.textContent='Multiplayer server unavailable — solo play still works.';return false;}
  if(!socket){socket=window.io();socket.on('room',showPlayers);socket.on('connect_error',()=>status.textContent='Multiplayer server is offline — solo play still works.');}
  return true;
}
async function connectPeerRoom(){
  const status=document.querySelector('#roomStatus');
  status.textContent=`Connecting to room ${room}…`;
  try{
    const library=window.loadPeerLibrary ? await window.loadPeerLibrary() : await import('https://esm.run/trystero@0.25.0');
    if(peerRoom)peerRoom.leave();
    peerPlayers.clear();
    peerPlayers.set('you',{id:'you',name:playerName,board,score});
    peerRoom=library.joinRoom({appId:'julianattemptscoding-tetris-online-v1'},room);
    const stateAction=peerRoom.makeAction('board-state');
    stateAction.onMessage=(data,{peerId})=>{if(data&&Array.isArray(data.board)){peerPlayers.set(peerId,{id:peerId,name:String(data.name||'Player').slice(0,16),board:data.board,score:Number(data.score)||0});showPlayers([...peerPlayers.values()]);}};
    peerRoom.onPeerJoin=peerId=>stateAction.send({name:playerName,board,score},{target:peerId});
    peerRoom.onPeerLeave=peerId=>{peerPlayers.delete(peerId);showPlayers([...peerPlayers.values()]);};
    sendPeerState=data=>{peerPlayers.set('you',{id:'you',...data});showPlayers([...peerPlayers.values()]);stateAction.send(data);};
    showPlayers([...peerPlayers.values()]);
    status.textContent=`Room ${room} — peer-to-peer multiplayer ready. Share this code.`;
  }catch(error){console.error(error);status.textContent='Could not start online multiplayer — solo play still works.';}
}
document.querySelector('#join').onclick=async()=>{room=document.querySelector('#room').value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8)||'TETRIS';playerName=document.querySelector('#name').value||'Player';const hosted=location.hostname.endsWith('github.io')||location.protocol==='file:';if(hosted){await connectPeerRoom();return;}if(!await connectMultiplayer())return;socket.emit('join',{room,name:playerName});document.querySelector('#roomStatus').textContent=`Room ${room} — share this code with friends.`;};
function mini(p){const c=document.createElement('canvas'),x=c.getContext('2d');c.className='mini';c.width=80;c.height=160;x.scale(8,8);x.fillStyle='#020817';x.fillRect(0,0,10,20);if(p.board)drawMatrix(p.board,{x:0,y:0},x);return c;}
function showPlayers(players){const host=document.querySelector('#players');host.replaceChildren(...players.map(p=>{const d=document.createElement('div');d.className='player';d.textContent=`${p.name} — ${p.score}`;d.append(mini(p));return d;}));}
initialize();requestAnimationFrame(tick);
