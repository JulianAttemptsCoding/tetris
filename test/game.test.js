const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

function loadGame() {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public', 'game.js'), 'utf8');
  const dom = new JSDOM(html, { url: 'https://julianattemptscoding.github.io/tetris-online/', runScripts: 'outside-only' });
  const { window } = dom;
  window.HTMLCanvasElement.prototype.getContext = () => ({ scale() {}, fillRect() {}, fillStyle: '' });
  window.requestAnimationFrame = callback => { window.nextFrame = callback; return 1; };
  window.eval(game);
  return window;
}

test('game initializes without a multiplayer server', () => {
  const window = loadGame();
  assert.equal(window.document.querySelector('#pause').textContent, 'PAUSE');
  assert.equal(window.document.querySelector('#score').textContent, '000000');
  assert.equal(typeof window.nextFrame, 'function');
});

test('pause, resume, and restart controls work', () => {
  const window = loadGame();
  const pause = window.document.querySelector('#pause');
  pause.click();
  assert.equal(pause.textContent, 'RESUME');
  assert.equal(pause.getAttribute('aria-pressed'), 'true');
  pause.click();
  assert.equal(pause.textContent, 'PAUSE');
  pause.click();
  window.document.querySelector('#start').click();
  assert.equal(pause.textContent, 'PAUSE');
  assert.equal(pause.getAttribute('aria-pressed'), 'false');
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

test('solo mode remains usable when Socket.IO is unavailable', () => {
  const window = loadGame();
  window.document.querySelector('#join').click();
  assert.match(window.document.querySelector('#roomStatus').textContent, /unavailable/);
  window.document.querySelector('#start').click();
  assert.equal(window.document.querySelector('#score').textContent, '000000');
});
