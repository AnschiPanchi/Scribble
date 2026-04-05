const { getWords } = require('../utils/wordBank');

// Server-side Game State Storage (in a real app, use Redis)
const rooms = new Map();

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('joinRoom', ({ roomId, user }) => {
      socket.join(roomId);
      
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          players: [],
          gameState: 'LOBBY',
          currentWord: '',
          drawerIndex: -1,
          round: 1,
          timer: 0,
          timerInterval: null
        });
      }

      const room = rooms.get(roomId);
      const player = { ...user, socketId: socket.id, score: 0 };
      room.players.push(player);

      io.to(roomId).emit('updatePlayers', room.players);
      socket.emit('updateGameState', room.gameState);

      // Dev logic: Start game if 1 player for testing
      if (room.players.length === 1 && room.gameState === 'LOBBY') {
        startGame(roomId, io);
      }
    });

    socket.on('drawStroke', (payload) => {
      socket.to(payload.roomId).emit('drawStroke', payload.strokeData);
    });

    socket.on('clearCanvas', (roomId) => {
      socket.to(roomId).emit('clearCanvas');
    });

    socket.on('submitGuess', ({ roomId, user, guess }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const isCorrect = guess.trim().toLowerCase() === room.currentWord.toLowerCase();

      if (isCorrect && room.gameState === 'DRAWING') {
        // Point scoring logic
        const player = room.players.find(p => p.email === user.email);
        if (player) {
          player.score += Math.floor(100 + (room.timer * 2));
          io.to(roomId).emit('updatePlayers', room.players);
          io.to(roomId).emit('chatMessage', { user: { username: 'SERVER' }, message: `${user.username} guessed the word!` });
        }
      } else {
        io.to(roomId).emit('chatMessage', { user, message: guess });
      }
    });

    socket.on('disconnect', () => {
      // Find room user was in and remove them
      rooms.forEach((room, roomId) => {
        const index = room.players.findIndex(p => p.socketId === socket.id);
        if (index !== -1) {
          room.players.splice(index, 1);
          io.to(roomId).emit('updatePlayers', room.players);
          if (room.players.length === 0) {
            clearInterval(room.timerInterval);
            rooms.delete(roomId);
          }
        }
      });
    });
  });
};

const startGame = (roomId, io) => {
  const room = rooms.get(roomId);
  room.gameState = 'STARTING';
  io.to(roomId).emit('updateGameState', room.gameState);

  setTimeout(() => startRound(roomId, io), 3000);
};

const startRound = (roomId, io) => {
  const room = rooms.get(roomId);
  room.gameState = 'WORD_SELECTION';
  room.drawerIndex = (room.drawerIndex + 1) % room.players.length;
  const drawer = room.players[room.drawerIndex];

  const wordOptions = getWords(3);
  io.to(roomId).emit('updateGameState', { 
    state: 'WORD_SELECTION', 
    drawer: drawer.username,
    options: wordOptions 
  });

  // For dev automation: automatically pick first word after 5s or if drawer picks
  setTimeout(() => {
     if (room.gameState === 'WORD_SELECTION') {
        room.currentWord = wordOptions[0];
        startDrawingPhase(roomId, io);
     }
  }, 10000);
};

const startDrawingPhase = (roomId, io) => {
  const room = rooms.get(roomId);
  room.gameState = 'DRAWING';
  room.timer = 60;
  
  io.to(roomId).emit('updateGameState', { 
    state: 'DRAWING', 
    word: room.currentWord 
  });

  room.timerInterval = setInterval(() => {
    room.timer--;
    io.to(roomId).emit('updateTimer', room.timer);
    if (room.timer <= 0) {
        clearInterval(room.timerInterval);
        endRound(roomId, io);
    }
  }, 1000);
};

const endRound = (roomId, io) => {
  const room = rooms.get(roomId);
  room.gameState = 'ROUND_END';
  io.to(roomId).emit('updateGameState', room.gameState);

  setTimeout(() => {
    if (room.round < 5) {
      room.round++;
      startRound(roomId, io);
    } else {
      room.gameState = 'LEADERBOARD';
      io.to(roomId).emit('updateGameState', room.gameState);
    }
  }, 5000);
};
