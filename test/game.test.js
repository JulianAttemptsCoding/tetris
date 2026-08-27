const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

function loadGame(url = 'https://julianattemptscoding.github.io/tetris-online/') {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public', 'game.js'), 'utf8');
  const dom = new JSDOM(html, { url, runScripts: 'outside-only' });
  const { window } = dom;
  window.Math.random = () => 0;
  window.canvasCalls = [];
  window.HTMLCanvasElement.prototype.getContext = function () {
    let fillStyle = '';
    return { scale() {}, get fillStyle(){return fillStyle;}, set fillStyle(value){fillStyle=value;}, fillRect(x,y,w,h){window.canvasCalls.push({canvas:this.canvas,fillStyle,x,y,w,h});}, canvas:this };
  };
  window.requestAnimationFrame = callback => { window.nextFrame = callback; return 1; };
  window.eval(game);
  return window;
}

test('game initializes without a multiplayer server', () => {
  const window = loadGame();
  assert.equal(window.document.querySelector('#pause').textContent, 'PAUSE');
  assert.equal(window.document.querySelector('#pause').disabled, true);
  assert.equal(window.document.querySelector('#start').textContent, 'START');
  assert.equal(window.document.querySelector('#gameStatus').textContent, 'PRESS START');
  assert.equal(window.document.querySelector('#score').textContent, '000000');
  assert.equal(typeof window.nextFrame, 'function');
});

test('pause, resume, and restart controls work', () => {
  const window = loadGame();
  const pause = window.document.querySelector('#pause');
  window.document.querySelector('#start').click();
  assert.equal(window.document.querySelector('#start').textContent, 'RESTART');
  assert.equal(pause.disabled, false);
  assert.equal(window.document.querySelector('#gameStatus').classList.contains('hidden'), true);
  pause.click();
  assert.equal(pause.textContent, 'RESUME');
  assert.equal(window.document.querySelector('#gameStatus').textContent, 'PAUSED');
  assert.equal(pause.getAttribute('aria-pressed'), 'true');
  pause.click();
  assert.equal(pause.textContent, 'PAUSE');
  pause.click();
  window.document.querySelector('#start').click();
  assert.equal(pause.textContent, 'PAUSE');
  assert.equal(pause.getAttribute('aria-pressed'), 'false');
});

test('start renders a falling piece and keyboard moves it', () => {
  const window = loadGame();
  window.document.querySelector('#start').click();
  window.canvasCalls.length = 0;
  window.nextFrame(window.performance.now() + 10);
  const pieceColors = new Set(['#30c8ff','#3f51ff','#ff9d2e','#ffe23d','#51d66d','#bd5cff','#ff4e66']);
  const firstPiece = window.canvasCalls.filter(call => pieceColors.has(call.fillStyle) && call.w === 1);
  assert.ok(firstPiece.length >= 4, 'piece should render after Start');
  const firstY = Math.min(...firstPiece.map(call => call.y));
  window.canvasCalls.length = 0;
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  window.__tetrisTest.frameStep();
  window.__tetrisTest.frameStep();
  window.nextFrame(window.performance.now() + 20);
  const movedPiece = window.canvasCalls.filter(call => pieceColors.has(call.fillStyle) && call.w === 1);
  assert.ok(Math.min(...movedPiece.map(call => call.y)) > firstY, 'piece should move after Start');
});

test('level 0 gravity moves exactly once every 48 frames', () => {
  const window = loadGame();
  window.document.querySelector('#start').click();
  for(let frame=0;frame<47;frame++)window.__tetrisTest.frameStep();
  assert.equal(window.__tetrisTest.snapshot().piece.y, 0);
  window.__tetrisTest.frameStep();
  assert.equal(window.__tetrisTest.snapshot().piece.y, 1);
});

test('NES DAS shifts immediately, waits 16 frames, then repeats', () => {
  const window = loadGame();
  window.document.querySelector('#start').click();
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', {key:'ArrowLeft',bubbles:true}));
  window.__tetrisTest.frameStep();
  assert.equal(window.__tetrisTest.snapshot().piece.x, 2);
  for(let frame=0;frame<15;frame++)window.__tetrisTest.frameStep();
  assert.equal(window.__tetrisTest.snapshot().piece.x, 2);
  window.__tetrisTest.frameStep();
  assert.equal(window.__tetrisTest.snapshot().piece.x, 1);
  for(let frame=0;frame<5;frame++)window.__tetrisTest.frameStep();
  assert.equal(window.__tetrisTest.snapshot().piece.x, 1);
  window.__tetrisTest.frameStep();
  assert.equal(window.__tetrisTest.snapshot().piece.x, 0);
});

test('blocked soft drop locks immediately and spawns the next piece', () => {
  const window = loadGame();
  window.document.querySelector('#start').click();
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', {key:'ArrowDown',bubbles:true}));
  while(window.__tetrisTest.snapshot().placedCount===0)window.__tetrisTest.frameStep();
  const state=window.__tetrisTest.snapshot();
  assert.equal(state.placedCount,1);
  assert.equal(state.piece,null);
  assert.equal(state.entryDelay,10);
  assert.ok(state.board[19].some(Boolean));
  assert.equal(state.score,18);
  for(let frame=0;frame<state.entryDelay;frame++)window.__tetrisTest.frameStep();
  assert.equal(window.__tetrisTest.snapshot().piece.y,0);
});

test('rotations support both directions and do not wall kick', () => {
  const window = loadGame();
  window.document.querySelector('#start').click();
  window.document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'x',bubbles:true}));
  assert.equal(window.__tetrisTest.snapshot().piece.rotation,1);
  for(let press=0;press<6;press++){
    window.document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
    window.__tetrisTest.frameStep();
    window.document.dispatchEvent(new window.KeyboardEvent('keyup',{key:'ArrowLeft',bubbles:true}));
    window.__tetrisTest.frameStep();
  }
  assert.equal(window.__tetrisTest.snapshot().piece.x,-2);
  window.document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'z',bubbles:true}));
  assert.equal(window.__tetrisTest.snapshot().piece.rotation,1);
});

test('hard drop is absent and entry delays match NES height timing', () => {
  const window=loadGame();
  window.document.querySelector('#start').click();
  const before=window.__tetrisTest.snapshot().piece.y;
  window.document.dispatchEvent(new window.KeyboardEvent('keydown',{key:' ',bubbles:true}));
  assert.equal(window.__tetrisTest.snapshot().piece.y,before);
  const delay=window.__tetrisTest.rules.entryDelayFor;
  assert.equal(delay(19,0,0),10);
  assert.equal(delay(15,0,0),12);
  assert.equal(delay(3,0,0),18);
  assert.equal(delay(19,1,0),30);
  assert.equal(delay(19,1,3),27);
});

test('key settings save and reset', () => {
  const window = loadGame();
  const left = window.document.querySelector('[data-action="left"]');
  left.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'a', bubbles: true }));
  assert.equal(left.value, 'a');
  assert.equal(JSON.parse(window.localStorage.getItem('tetris-keys')).left, 'a');
  window.document.querySelector('#resetKeys').click();
  assert.equal(left.value, 'ArrowLeft');
});

test('solo mode remains usable when Socket.IO is unavailable', async () => {
  const window = loadGame('http://localhost:3000/');
  window.loadSocketLibrary = async () => { throw new Error('offline'); };
  window.document.querySelector('#join').click();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.match(window.document.querySelector('#roomStatus').textContent, /unavailable/);
  window.document.querySelector('#start').click();
  assert.equal(window.document.querySelector('#score').textContent, '000000');
  assert.equal(window.document.querySelector('#start').textContent, 'RESTART');
});

test('hosted game creates a free peer-to-peer room', async () => {
  const window = loadGame();
  let sent;
  const action = { send(data) { sent = data; }, onMessage: null };
  window.loadPeerLibrary = async () => ({ joinRoom: () => ({ makeAction: () => action, leave() {} }) });
  window.document.querySelector('#name').value = 'Tester';
  window.document.querySelector('#room').value = 'QA123';
  window.document.querySelector('#join').click();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.match(window.document.querySelector('#roomStatus').textContent, /peer-to-peer multiplayer ready/);
  assert.match(window.document.querySelector('#players').textContent, /Tester/);
  assert.equal(typeof action.onMessage, 'function');
  assert.equal(sent, undefined);
});
