import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { Chess } from 'chess.js';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.render('index'));

const rooms = {};

io.on('connection', (socket) => {

  socket.on('joinRoom', ({ roomId, playerName }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = {
        chess: new Chess(),
        white: null,
        black: null,
        moves: [],
        names: { white: null, black: null }
      };
    }

    const room = rooms[roomId];
    socket.join(roomId);
    socket.roomId = roomId;

    let role = 'spectator';

    if (!room.white) {
      room.white = socket.id;
      room.names.white = playerName;
      role = 'w';
    } else if (!room.black) {
      room.black = socket.id;
      room.names.black = playerName;
      role = 'b';
    }

    socket.emit('playerRole', role);
    socket.emit('boardState', room.chess.fen());
    socket.emit('moveHistory', room.moves);
    io.to(roomId).emit('playerNames', room.names);
  });

  socket.on('move', (move) => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;

    const room = rooms[roomId];
    const color =
      socket.id === room.white ? 'w' :
      socket.id === room.black ? 'b' : null;

    if (!color || room.chess.turn() !== color) return;

    try {
      const result = room.chess.move(move);
      if (!result) return;

      room.moves.push(result.san);
      io.to(roomId).emit('boardState', room.chess.fen());
      io.to(roomId).emit('moveHistory', room.moves);
    } catch {}
  });

  socket.on('disconnect', () => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;

    const room = rooms[roomId];
    if (socket.id === room.white || socket.id === room.black) {
      room.chess.reset();
      room.white = null;
      room.black = null;
      room.moves = [];
      room.names = { white: null, black: null };

      io.to(roomId).emit('gameReset');
      io.to(roomId).emit('boardState', room.chess.fen());
      io.to(roomId).emit('moveHistory', []);
      io.to(roomId).emit('playerNames', room.names);
    }

    const clients = io.sockets.adapter.rooms.get(roomId);
    if (!clients || clients.size === 0) {
      delete rooms[roomId];
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
