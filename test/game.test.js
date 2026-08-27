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
  window.nextFrame(window.performance.now() + 20);
  const movedPiece = window.canvasCalls.filter(call => pieceColors.has(call.fillStyle) && call.w === 1);
  assert.ok(Math.min(...movedPiece.map(call => call.y)) > firstY, 'piece should move after Start');
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
