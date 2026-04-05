const User = require('../models/User');
const { createWordDeck, popWords } = require('../utils/wordBank');

// In-memory room store (use Redis in production)
const rooms = new Map();

// ─── Levenshtein Distance for Fuzzy Matching ─────────────────────────────────
const levenshtein = (a, b) => {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
};

// ─── Room Factory ─────────────────────────────────────────────────────────────
const createRoom = (settings = {}) => ({
  players: [],
  gameState: 'LOBBY',       // LOBBY | STARTING | CHOOSING | DRAWING | REVEAL | LEADERBOARD
  currentWord: '',
  currentWordObj: null,
  drawerIndex: -1,
  round: 1,
  maxRounds:      Math.min(Math.max(parseInt(settings.maxRounds) || 5, 1), 10),
  timer: 0,
  totalRoundTime: Math.min(Math.max(parseInt(settings.drawTime)  || 80, 15), 300),
  maxPlayers:     Math.min(Math.max(parseInt(settings.maxPlayers) || 8, 2), 12),
  difficulty:     ['EASY','MEDIUM','HARD','MIXED'].includes((settings.difficulty||'').toUpperCase()) ? settings.difficulty.toUpperCase() : 'MIXED',
  wordCount:      Math.min(Math.max(parseInt(settings.wordCount) || 3, 1), 5),
  timerInterval: null,
  choosingTimeout: null,
  wordDeck: [],
  discardPile: [],
  wordOptions: [],
  strokeHistory: [],
  correctGuessers: [],
  afkTimer: null,
  lastDrawerActivity: null,
});

// ─── Score Calculator ─────────────────────────────────────────────────────────
const calcScore = (timeRemaining, totalTime, guessOrder, baseScore) => {
  const timebonus = Math.floor((timeRemaining / totalTime) * 300);
  return baseScore + timebonus;
};

// ─── Emit System Message ──────────────────────────────────────────────────────
const systemMsg = (io, roomId, message, type = 'INFO') => {
  io.to(roomId).emit('chatMessage', {
    user: { username: 'SYSTEM', type },
    message,
    isSystem: true,
    systemType: type,
  });
};

// ─── Cleanup Room Timers ──────────────────────────────────────────────────────
const clearRoomTimers = (room) => {
  clearInterval(room.timerInterval);
  clearTimeout(room.choosingTimeout);
  clearTimeout(room.afkTimer);
  room.timerInterval = null;
  room.choosingTimeout = null;
  room.afkTimer = null;
};

// ─── State Machine ────────────────────────────────────────────────────────────
const startGame = (roomId, io) => {
  const room = rooms.get(roomId);
  if (!room) return;
  
  // Initialize word deck with difficulty filter
  room.wordDeck = createWordDeck(room.difficulty);
  room.gameState = 'STARTING';
  room.round = 1;
  room.drawerIndex = -1;
  room.players.forEach(p => { p.score = 0; p.hasGuessed = false; p.isSpectator = false; p.missedRounds = 0; });

  io.to(roomId).emit('updateGameState', { state: 'STARTING', countdown: 5 });
  io.to(roomId).emit('updatePlayers', room.players);

  let countdown = 5;
  const countdownInterval = setInterval(() => {
    countdown--;
    io.to(roomId).emit('startCountdown', countdown);
    if (countdown <= 0) {
      clearInterval(countdownInterval);
      startRound(roomId, io);
    }
  }, 1000);
};

const startRound = (roomId, io) => {
  const room = rooms.get(roomId);
  if (!room || room.players.length === 0) return;

  clearRoomTimers(room);

  room.strokeHistory = [];
  room.correctGuessers = [];
  room.players.forEach(p => { p.hasGuessed = false; });

  // Refill deck if exhausted — re-shuffle discard pile
  if (room.wordDeck.length < 3) {
    const discard = [...room.discardPile];
    room.discardPile = [];
    // Fisher-Yates re-shuffle inline
    for (let i = discard.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [discard[i], discard[j]] = [discard[j], discard[i]];
    }
    room.wordDeck = discard;
  }

  room.drawerIndex = (room.drawerIndex + 1) % room.players.length;
  const drawer = room.players[room.drawerIndex];

  // Pop words based on room wordCount setting
  room.wordOptions = popWords(room.wordDeck, room.wordCount);
  room.discardPile.push(...room.wordOptions);

  room.gameState = 'CHOOSING';

  // 1. Broadcast CHOOSING state to ALL players first
  io.to(roomId).emit('updateGameState', {
    state: 'CHOOSING',
    drawer: drawer.username,
    drawerId: drawer.email,
    wordLength: null,
  });
  io.to(roomId).emit('updatePlayers', room.players);
  io.to(roomId).emit('clearCanvas');
  systemMsg(io, roomId, `${drawer.username} is choosing a word...`, 'INFO');

  // 2. Send private word options to drawer AFTER state update settles
  setTimeout(() => {
    const drawerSocket = io.sockets.sockets.get(drawer.socketId);
    if (drawerSocket) {
      drawerSocket.emit('chooseWord', {
        options: room.wordOptions,
        drawer: drawer.username,
      });
    } else {
      // Drawer disconnected - auto-pick first word
      console.warn(`[WARN] Drawer socket gone, auto-picking word`);
      startDrawingPhase(roomId, io, room.wordOptions[0]);
    }
  }, 300);

  // Auto-pick if drawer doesn't choose in 15s
  room.choosingTimeout = setTimeout(() => {
    if (room.gameState === 'CHOOSING') {
      startDrawingPhase(roomId, io, room.wordOptions[0]);
    }
  }, 15000);
};

const startDrawingPhase = (roomId, io, wordObj) => {
  const room = rooms.get(roomId);
  if (!room) return;

  clearTimeout(room.choosingTimeout);
  room.choosingTimeout = null;

  room.currentWordObj = wordObj;
  room.currentWord = wordObj.word;
  room.gameState = 'DRAWING';
  room.timer = room.totalRoundTime;
  room.lastDrawerActivity = Date.now();

  const drawer = room.players[room.drawerIndex];
  if (!drawer) {
    console.log(`⚠ Skip DRAWING in ${roomId}: drawer undefined at index ${room.drawerIndex}`);
    return startChoosingPhase(io, roomId, room);
  }

  // Broadcast to the WHOLE room — include drawerEmail so client decides what to show
  // This avoids the stale-socket-ID race condition entirely
  io.to(roomId).emit('updateGameState', {
    state: 'DRAWING',
    word: room.currentWord,                            // clients hide this unless they're the drawer
    wordMask: room.currentWord.replace(/[^ ]/g, '_'),  // fallback mask for guessers
    wordLength: room.currentWord.length,
    difficulty: wordObj.difficulty,
    drawer: drawer.username,
    drawerId: drawer.email,                            // client uses this to check isDrawer
  });

  console.log(`[DRAWING] Room ${roomId} | Word: ${room.currentWord} | Drawer: ${drawer.username}`);

  // Countdown ticker
  room.timerInterval = setInterval(() => {
    room.timer--;
    io.to(roomId).emit('syncTime', room.timer);

    // AFK Detection: drawer inactive 15s → skip
    if (Date.now() - room.lastDrawerActivity > 15000 && room.gameState === 'DRAWING') {
      clearRoomTimers(room);
      systemMsg(io, roomId, `${drawer.username} went AFK! Skipping round...`, 'WARN');
      revealRound(roomId, io);
      return;
    }

    if (room.timer <= 0) {
      clearRoomTimers(room);
      revealRound(roomId, io);
    }
  }, 1000);
};

const revealRound = (roomId, io) => {
  const room = rooms.get(roomId);
  if (!room) return;

  clearRoomTimers(room);
  room.gameState = 'REVEAL';

  // Calculate drawer bonus
  const drawer = room.players[room.drawerIndex];
  if (room.correctGuessers.length > 0) {
    const totalGuessPoints = room.correctGuessers.reduce((sum, g) => sum + g.earned, 0);
    const drawerBonus = Math.floor((totalGuessPoints / room.players.length) * 0.5);
    drawer.score += drawerBonus;
    if (drawerBonus > 0) {
      const drawerSocket = io.sockets.sockets.get(drawer.socketId);
      if (drawerSocket) {
        drawerSocket.emit('chatMessage', {
          user: { username: 'SYSTEM', type: 'BONUS' },
          message: `Drawer Bonus! +${drawerBonus} pts for inspiring ${room.correctGuessers.length} guessers!`,
          isSystem: true, systemType: 'BONUS', private: true,
        });
      }
    }
  }

  // Track missed rounds for inactivity
  room.players.forEach(p => {
    if (p.email !== drawer.email && !p.hasGuessed) {
      p.missedRounds = (p.missedRounds || 0) + 1;
      if (p.missedRounds >= 2) {
        p.isSpectator = true;
        const ps = io.sockets.sockets.get(p.socketId);
        if (ps) ps.emit('movedToSpectator', { reason: 'AFK: Missed 2+ rounds' });
        systemMsg(io, roomId, `${p.username} moved to Spectator for inactivity.`, 'WARN');
      }
    } else if (p.hasGuessed) {
      p.missedRounds = 0;
    }
  });

  io.to(roomId).emit('updateGameState', {
    state: 'REVEAL',
    word: room.currentWord,
    difficulty: room.currentWordObj?.difficulty,
  });
  io.to(roomId).emit('updatePlayers', room.players);
  systemMsg(io, roomId, `The word was: ${room.currentWord}`, 'REVEAL');

  setTimeout(() => {
    if (room.round < room.maxRounds) {
      room.round++;
      startRound(roomId, io);
    } else {
      endGame(roomId, io);
    }
  }, 5000);
};

const endGame = (roomId, io) => {
  const room = rooms.get(roomId);
  if (!room) return;

  room.gameState = 'LEADERBOARD';
  const sorted = [...room.players].sort((a, b) => b.score - a.score);

  io.to(roomId).emit('updateGameState', {
    state: 'LEADERBOARD',
    players: sorted,
    winner: sorted[0]?.username,
  });

  // 💰 Reward players with Ink-Coins (IC)
  room.players.forEach(p => {
    if (!p.isSpectator && !roomId.startsWith('test-')) {
      const scoreReward = Math.floor(p.score / 4);
      const reward = Math.max(scoreReward, 25);

      setTimeout(async () => {
        try {
          const u = await User.findOneAndUpdate(
            { email: p.email },
            { $inc: { coins: reward } },
            { new: true }
          );
          if (u) {
            console.log(`\x1b[32m💰 Operator ${p.username} rewarded +${reward} IC (Total: ${u.coins})\x1b[0m`);
            const socketInstance = io.sockets.sockets.get(p.socketId);
            if (socketInstance) {
              // Popup event
              socketInstance.emit('gameReward', { 
                coins: reward, 
                total: u.coins,
                message: p.score > 0 ? "Match Performance Reward" : "Participation Bonus"
              });
              // Chat confirmation (Private to user)
              socketInstance.emit('chatMessage', {
                user: { username: 'SYSTEM', type: 'DATA' },
                message: `💰 Mission Reward: +${reward} IC credited to your ledger.`,
                isSystem: true, systemType: 'BONUS', private: true,
              });
            }
          }
        } catch (err) {
          console.error(`Reward failure for ${p.username}:`, err.message);
        }
      }, 250); 
    }
  });

  systemMsg(io, roomId, `🏆 ${sorted[0]?.username} wins with ${sorted[0]?.score} pts!`, 'WIN');

  // Cleanup room after 30s
  setTimeout(() => {
    clearRoomTimers(room);
    rooms.delete(roomId);
  }, 30000);
};

// ─── Socket Handler ───────────────────────────────────────────────────────────
module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`\x1b[36m⚡ Socket Connected: ${socket.id}\x1b[0m`);

    // ── Join Room ────────────────────────────────────────────────────────────
    socket.on('joinRoom', ({ roomId: requestRoomId, user, settings }) => {
      if (!user || !user.email) return;
      let roomId = requestRoomId;

      // Public Matchmaking — find open match- room or generate unique if no available
      if (requestRoomId.startsWith('match-')) {
        const available = Array.from(rooms.entries()).find(([id, r]) =>
          id.startsWith('match-') && 
          id !== 'match-lobby' && // prefer unique rooms
          r.players.length < r.maxPlayers && 
          r.gameState === 'LOBBY'
        );
        
        if (available) {
          roomId = available[0];
        } else if (requestRoomId === 'match-lobby') {
          // No available rooms: create a brand new unique match room
          roomId = `match-${Math.random().toString(36).substring(2, 8)}`;
        }
      }

      // Cross-room deduplication (removes from other rooms before entering new one)
      rooms.forEach((r, rId) => {
        if (rId === roomId) return;
        const idx = r.players.findIndex(p => p.email === user.email);
        if (idx !== -1) {
          const old = r.players[idx];
          const oldSock = io.sockets.sockets.get(old.socketId);
          if (oldSock) { oldSock.leave(rId); }
          r.players.splice(idx, 1);
          io.to(rId).emit('updatePlayers', r.players);
          console.log(`\x1b[33m⚡ Moved ${user.email} from room ${rId} → ${roomId}\x1b[0m`);
        }
      });

      // Create room if needed (first player's settings apply)
      if (!rooms.has(roomId)) {
        rooms.set(roomId, createRoom(settings || {}));
        console.log(`\x1b[35m🏠 Room Created: ${roomId} (via ${requestRoomId})\x1b[0m`);
      }

      const room = rooms.get(roomId);

      // Reject if room is full and player is not reconnecting
      const existingCheck = room.players.findIndex(p => p.email === user.email);
      if (existingCheck === -1 && room.players.length >= room.maxPlayers) {
        socket.emit('roomFull', { message: `Room is full (${room.maxPlayers} players max).` });
        return;
      }

      // Late-joiner: send current canvas state
      if (room.gameState === 'DRAWING' && room.strokeHistory.length > 0) {
        socket.emit('canvasCatchUp', room.strokeHistory);
      }

      socket.join(roomId);

      // Always send room settings to joining player
      socket.emit('roomSettings', {
        maxRounds:  room.maxRounds,
        drawTime:   room.totalRoundTime,
        maxPlayers: room.maxPlayers,
        difficulty: room.difficulty,
        wordCount:  room.wordCount,
        roomId,
      });

      // If player already in this room (reconnect), just update socket ID
      const existingIdx = room.players.findIndex(p => p.email === user.email);
      if (existingIdx !== -1) {
        room.players[existingIdx].socketId = socket.id;
        io.to(roomId).emit('updatePlayers', room.players);

        // Restore full game state for reconnecting player
        const drawer = room.players[room.drawerIndex];
        const statePayload = {
          state: room.gameState,
          round: room.round,
          maxRounds: room.maxRounds,
          timer: room.timer,
          drawer: drawer?.username,
          drawerId: drawer?.email,
        };
        if (room.gameState === 'DRAWING' || room.gameState === 'REVEAL') {
          statePayload.word = room.currentWord;
          statePayload.wordMask = room.currentWord?.replace(/[^ ]/g, '_');
          statePayload.wordLength = room.currentWord?.length;
          statePayload.difficulty = room.currentWordObj?.difficulty;
        }
        socket.emit('updateGameState', statePayload);

        if (room.gameState === 'DRAWING' && room.strokeHistory.length > 0) {
          socket.emit('canvasCatchUp', room.strokeHistory);
        }
        // Re-send word options if drawer reconnects mid-CHOOSING
        if (room.gameState === 'CHOOSING' && drawer?.email === user.email && room.wordOptions.length > 0) {
          socket.emit('chooseWord', { options: room.wordOptions, drawer: drawer.username });
        }
        console.log(`\x1b[32m🔄 Reconnected: ${user.username} → ${roomId}\x1b[0m`);
        return;
      }

      const player = {
        ...user,
        socketId: socket.id,
        score: 0,
        hasGuessed: false,
        isSpectator: false,
        missedRounds: 0,
      };
      room.players.push(player);

      io.to(roomId).emit('updatePlayers', room.players);
      socket.emit('updateGameState', {
        state: room.gameState,
        round: room.round,
        maxRounds: room.maxRounds,
        timer: room.timer,
      });

      systemMsg(io, roomId, `${user.username} joined the arena.`, 'JOIN');

      // Check to start game
      const minPlayers = roomId.startsWith('test-') ? 1 : 2;
      if (room.players.length >= minPlayers && room.gameState === 'LOBBY') {
        startGame(roomId, io);
      }
      
      console.log(`\x1b[32m✅ ${user.username} joined ${roomId} [${room.players.length}/${room.maxPlayers}]\x1b[0m`);
    });

    // ── Word Selection ────────────────────────────────────────────────────────
    socket.on('selectWord', ({ roomId, wordObj }) => {
      const room = rooms.get(roomId);
      if (!room || room.gameState !== 'CHOOSING') return;
      const drawer = room.players[room.drawerIndex];
      if (drawer?.socketId !== socket.id) return;

      clearTimeout(room.choosingTimeout);
      startDrawingPhase(roomId, io, wordObj);
    });

    // ── Draw Stroke ───────────────────────────────────────────────────────────
    socket.on('drawStroke', (payload) => {
      const room = rooms.get(payload.roomId);
      if (!room) return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (!player) return;

      // AFK Reset if drawer is drawing
      const drawer = room.players[room.drawerIndex];
      if (drawer?.socketId === socket.id) {
        room.lastDrawerActivity = Date.now();
      }

      // Log stroke for late-joiners & replay
      if (room.gameState === 'DRAWING') {
        room.strokeHistory.push({ ...payload.strokeData, gear: player?.activeGear });
      }

      socket.to(payload.roomId).emit('drawStroke', {
        ...payload.strokeData,
        gear: player?.activeGear,
      });
    });

    // ── Clear Canvas ──────────────────────────────────────────────────────────
    socket.on('clearCanvas', (roomId) => {
      const room = rooms.get(roomId);
      if (!room) return;
      room.strokeHistory = [];
      socket.to(roomId).emit('clearCanvas');
    });

    // ── Submit Guess ──────────────────────────────────────────────────────────
    socket.on('submitGuess', ({ roomId, user, guess }) => {
      const room = rooms.get(roomId);
      if (!room || room.gameState !== 'DRAWING') return;

      const player = room.players.find(p => p.email === user.email);
      if (!player || player.hasGuessed) return;

      const drawer = room.players[room.drawerIndex];
      const isSolo = roomId.startsWith('test-');

      // In solo mode: fall through to guess logic even for the drawer
      if (!isSolo && player.email === drawer?.email) {
        // Multiplayer: block drawer from revealing the word
        if (guess.toLowerCase().includes(room.currentWord.toLowerCase())) {
          socket.emit('chatMessage', {
            user: { username: 'SYSTEM', type: 'WARN' },
            message: '⛔ Cannot reveal the target word!',
            isSystem: true, systemType: 'WARN', private: true,
          });
          return;
        }
        // Drawer chats normally in multiplayer
        io.to(roomId).emit('chatMessage', { user, message: guess });
        return;
      }

      const normalGuess = guess.trim().toLowerCase();
      const normalWord = room.currentWord.toLowerCase();

      // Fuzzy Matching (Levenshtein)
      const dist = levenshtein(normalGuess, normalWord);
      if (dist === 1) {
        socket.emit('chatMessage', {
          user: { username: 'SYSTEM', type: 'CLOSE' },
          message: `🎯 So close! One character off!`,
          isSystem: true, systemType: 'CLOSE', private: true,
        });
        io.to(roomId).emit('chatMessage', { user, message: guess });
        return;
      }

      // Exact Match
      if (normalGuess === normalWord) {
        player.hasGuessed = true;

        // Scoring: 500/400/300/200 base by guess order
        const bases = [500, 400, 300, 200, 150, 100];
        const baseScore = bases[Math.min(room.correctGuessers.length, bases.length - 1)];
        const earned = calcScore(room.timer, room.totalRoundTime, room.correctGuessers.length, baseScore);
        player.score += earned;
        room.correctGuessers.push({ email: player.email, earned });

        // Private correct message
        socket.emit('chatMessage', {
          user: { username: 'SYSTEM', type: 'CORRECT' },
          message: `✅ Correct! +${earned} pts`,
          isSystem: true, systemType: 'CORRECT', private: true,
        });

        // Broadcast that someone guessed (no word reveal)
        io.to(roomId).emit('chatMessage', {
          user: { username: 'SYSTEM', type: 'GUESS' },
          message: `${user.username} guessed the word! 🎉`,
          isSystem: true, systemType: 'GUESS',
        });

        io.to(roomId).emit('updatePlayers', room.players);
        // Mark player as correct in UI
        io.to(roomId).emit('playerGuessed', { email: player.email });

        // End round if everyone guessed
        const guessers = room.players.filter(p => p.email !== drawer?.email && !p.isSpectator);
        if (room.correctGuessers.length >= guessers.length) {
          clearRoomTimers(room);
          revealRound(roomId, io);
        }
        return;
      }

      // Normal incorrect guess — broadcast to everyone
      io.to(roomId).emit('chatMessage', { user, message: guess });
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`\x1b[31m⚠ Socket Disconnected: ${socket.id}\x1b[0m`);
      rooms.forEach((room, roomId) => {
        const idx = room.players.findIndex(p => p.socketId === socket.id);
        if (idx !== -1) {
          const [removed] = room.players.splice(idx, 1);
          systemMsg(io, roomId, `${removed.username} left the arena.`, 'LEAVE');
          io.to(roomId).emit('updatePlayers', room.players);

          if (room.players.length === 0) {
            clearRoomTimers(room);
            rooms.delete(roomId);
          } else if (room.players.length === 1 && room.gameState !== 'LOBBY') {
            systemMsg(io, roomId, "⚠️ Not enough operatives. Extraction starting...", "WARN");
            clearRoomTimers(room);
            room.gameState = 'LEADERBOARD';
            io.to(roomId).emit('updatePlayers', room.players);
            io.to(roomId).emit('updateGameState', { state: 'LEADERBOARD', winner: room.players[0] });
          }
        }
      });
    });
  });
};
