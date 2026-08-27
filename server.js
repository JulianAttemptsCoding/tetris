const path = require('path');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const server = app.listen(process.env.PORT || 3000, '0.0.0.0', () =>
  console.log(`Tetris is ready on http://localhost:${server.address().port}`)
);
const io = new Server(server);
app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();
const clean = (room) => room.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
function broadcast(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  io.to(roomId).emit('room', [...room.players.values()]);
}
io.on('connection', (socket) => {
  socket.on('join', ({ room, name }) => {
    const id = clean(room) || 'TETRIS';
    socket.leave([...socket.rooms].filter((r) => r !== socket.id));
    if (!rooms.has(id)) rooms.set(id, { players: new Map() });
    const game = rooms.get(id);
    game.players.set(socket.id, { id: socket.id, name: String(name || 'Player').slice(0, 16), board: null, score: 0 });
    socket.join(id); socket.data.room = id; broadcast(id);
  });
  socket.on('state', ({ board, score }) => {
    const game = rooms.get(socket.data.room); const player = game?.players.get(socket.id);
    if (!player || !Array.isArray(board)) return;
    player.board = board; player.score = Number(score) || 0; broadcast(socket.data.room);
  });
  socket.on('disconnect', () => {
    const id = socket.data.room; const game = rooms.get(id);
    if (!game) return; game.players.delete(socket.id);
    if (game.players.size) broadcast(id); else rooms.delete(id);
  });
});
