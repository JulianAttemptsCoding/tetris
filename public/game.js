const COLS=10, ROWS=20, S=30, colors=['','#30c8ff','#3f51ff','#ff9d2e','#ffe23d','#51d66d','#bd5cff','#ff4e66'];
const shapes=[[[1,1,1,1]],[[2,0,0],[2,2,2]],[[0,0,3],[3,3,3]],[[4,4],[4,4]],[[0,5,5],[5,5,0]],[[0,6,0],[6,6,6]],[[7,7,0],[0,7,7]]];
const boardEl=document.querySelector('#board'),ctx=boardEl.getContext('2d'),nextCtx=document.querySelector('#next').getContext('2d');ctx.scale(S,S);nextCtx.scale(20,20);
let board, piece, next, score, lines, running=false, paused=false, last=0, drop=0, socket, room='';
const empty=()=>Array.from({length:ROWS},()=>Array(COLS).fill(0));
const newPiece=()=>({m:shapes[Math.floor(Math.random()*shapes.length)].map(r=>[...r]),x:3,y:0});
function reset(){board=empty();piece=newPiece();next=newPiece();score=0;lines=0;running=true;paused=false;last=0;drop=0;ui();}
function collide(p,dx=0,dy=0,m=p.m){return m.some((r,y)=>r.some((v,x)=>v&&(board[y+p.y+dy]?.[x+p.x+dx]??1)));}
function drawMatrix(m,off,c=ctx){m.forEach((r,y)=>r.forEach((v,x)=>{if(v){c.fillStyle=colors[v];c.fillRect(x+off.x,y+off.y,1,1);c.fillStyle='rgba(255,255,255,.25)';c.fillRect(x+off.x,y+off.y,.13,1);}}));}
function draw(){ctx.fillStyle='#020817';ctx.fillRect(0,0,COLS,ROWS);drawMatrix(board,{x:0,y:0});if(running)drawMatrix(piece,{x:piece.x,y:piece.y});nextCtx.fillStyle='#020817';nextCtx.fillRect(0,0,6,5);drawMatrix(next.m,{x:1,y:1},nextCtx);}
function merge(){piece.m.forEach((r,y)=>r.forEach((v,x)=>{if(v)board[y+piece.y][x+piece.x]=v;}));let n=0;board=board.filter(r=>{if(r.every(Boolean)){n++;return false}return true});while(board.length<ROWS)board.unshift(Array(COLS).fill(0));if(n){lines+=n;score+=[0,100,300,500,800][n];}piece=next;piece.x=3;piece.y=0;next=newPiece();if(collide(piece))running=false;ui();}
function down(){if(!running||paused)return;if(!collide(piece,0,1))piece.y++;else merge();drop=0;}
function rotate(){const m=piece.m[0].map((_,i)=>piece.m.map(r=>r[i]).reverse());if(!collide(piece,0,0,m))piece.m=m;}
function ui(){document.querySelector('#score').textContent=String(score).padStart(6,'0');document.querySelector('#lines').textContent=String(lines).padStart(2,'0');document.querySelector('#pause').textContent=paused?'RESUME':'PAUSE';}
function tick(t){const delta=t-last;last=t;if(running&&!paused){drop+=delta;if(drop>Math.max(120,800-lines*4))down();}draw();if(socket&&room)socket.emit('state',{board,score});requestAnimationFrame(tick)}
document.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' ','x','X'].includes(e.key))e.preventDefault();if(!running)return;if(e.key==='ArrowLeft'&&!collide(piece,-1))piece.x--;if(e.key==='ArrowRight'&&!collide(piece,1))piece.x++;if(e.key==='ArrowDown')down();if(e.key==='ArrowUp'||e.key==='x'||e.key==='X')rotate();if(e.key===' '){while(!collide(piece,0,1))piece.y++;down();}});
document.querySelector('#start').onclick=reset;document.querySelector('#pause').onclick=()=>{if(running){paused=!paused;ui();}};
document.querySelector('#join').onclick=()=>{room=document.querySelector('#room').value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8)||'TETRIS';const name=document.querySelector('#name').value||'Player';socket??=io();socket.emit('join',{room,name});document.querySelector('#roomStatus').textContent=`Room ${room} — share this code with friends.`;};
function mini(p){const c=document.createElement('canvas'),x=c.getContext('2d');c.className='mini';c.width=80;c.height=160;x.scale(8,8);x.fillStyle='#020817';x.fillRect(0,0,10,20);if(p.board)drawMatrix(p.board,{x:0,y:0},x);return c;}
socket??=io();socket.on('room',players=>{const host=document.querySelector('#players');host.replaceChildren(...players.map(p=>{const d=document.createElement('div');d.className='player';d.textContent=`${p.name} — ${p.score}`;d.append(mini(p));return d;}));});
reset();requestAnimationFrame(tick);
