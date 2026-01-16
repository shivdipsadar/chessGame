document.addEventListener('DOMContentLoaded', () => {
  const socket = io();

  const modal = document.getElementById('joinModal');
  const roomInput = document.getElementById('roomInput');
  const nameInput = document.getElementById('nameInput');
  const joinBtn = document.getElementById('joinBtn');

  const boardEl = document.getElementById('board');
  const statusEl = document.getElementById('status');
  const moveListEl = document.getElementById('moveList');
  const whitePlayerEl = document.getElementById('whitePlayer');
  const blackPlayerEl = document.getElementById('blackPlayer');

  let playerRole = null;
  let selectedSquare = null;

  const pieces = {
    p:'♟', r:'♜', n:'♞', b:'♝', q:'♛', k:'♚',
    P:'♙', R:'♖', N:'♘', B:'♗', Q:'♕', K:'♔'
  };

  joinBtn.onclick = () => {
    const roomId = roomInput.value.trim();
    const playerName = nameInput.value.trim();
    if (!roomId || !playerName) return;

    socket.emit('joinRoom', { roomId, playerName });
    modal.classList.add('hidden');
    history.replaceState({}, '', `?room=${roomId}`);
  };

  socket.on('playerRole', role => {
    playerRole = role;
    statusEl.textContent =
      role === 'w' ? 'You are White ♔' :
      role === 'b' ? 'You are Black ♚' :
      'Spectator Mode 👀';
  });

  socket.on('playerNames', names => {
    whitePlayerEl.textContent = `White: ${names.white || '—'}`;
    blackPlayerEl.textContent = `Black: ${names.black || '—'}`;
  });

  socket.on('boardState', fen => renderBoard(fen));
  socket.on('moveHistory', moves => renderHistory(moves));

  socket.on('gameReset', () => {
    statusEl.textContent = 'Game reset. Waiting for players...';
    boardEl.innerHTML = '';
    moveListEl.innerHTML = '';
    selectedSquare = null;
    playerRole = null;
    modal.classList.remove('hidden');
  });

  function renderBoard(fen) {
    boardEl.innerHTML = '';
    let rows = fen.split(' ')[0].split('/');
    if (playerRole === 'b') rows = rows.reverse();

    rows.forEach((row, r) => {
      let c = 0;
      for (let ch of row) {
        if (isNaN(ch)) {
          createSquare(r, c, ch);
          c++;
        } else {
          for (let i = 0; i < ch; i++) {
            createSquare(r, c, null);
            c++;
          }
        }
      }
    });
  }

  function createSquare(r, c, piece) {
    const sq = document.createElement('div');
    sq.className = `square ${(r + c) % 2 ? 'black' : 'white'}`;
    if (piece) sq.textContent = pieces[piece];
    sq.onclick = () => onClick(r, c, piece);
    boardEl.appendChild(sq);
  }

  function onClick(r, c, piece) {
    if (!playerRole || playerRole === 'spectator') return;

    const row = playerRole === 'b' ? 7 - r : r;
    const square = String.fromCharCode(97 + c) + (8 - row);

    if (!selectedSquare) {
      if (!piece) return;
      const isWhite = piece === piece.toUpperCase();
      if (
        (playerRole === 'w' && !isWhite) ||
        (playerRole === 'b' && isWhite)
      ) return;
      selectedSquare = square;
    } else {
      socket.emit('move', { from: selectedSquare, to: square, promotion: 'q' });
      selectedSquare = null;
    }
  }

  function renderHistory(moves) {
    moveListEl.innerHTML = '';
    for (let i = 0; i < moves.length; i += 2) {
      const li = document.createElement('li');
      li.textContent = `${i / 2 + 1}. ${moves[i] || ''} ${moves[i + 1] || ''}`;
      moveListEl.appendChild(li);
    }
  }
});
