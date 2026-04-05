import { createSlice } from '@reduxjs/toolkit';

const gameSlice = createSlice({
  name: 'game',
  initialState: {
    roomId: null,
    players: [],
    gameState: 'LOBBY',   // LOBBY | STARTING | CHOOSING | DRAWING | REVEAL | LEADERBOARD
    currentWord: '',
    wordMask: '',
    wordLength: 0,
    difficulty: '',
    drawerUsername: '',
    drawerEmail: '',
    timer: 0,
    round: 1,
    maxRounds: 5,
    chat: [],
    correctGuessers: [],  // emails of players who guessed correctly this round
    leaderboard: [],
    winner: '',
  },
  reducers: {
    setRoom: (state, action) => { state.roomId = action.payload; },
    setGameState: (state, action) => {
      const d = action.payload;
      if (typeof d === 'string') {
        state.gameState = d;
      } else {
        state.gameState = d.state ?? state.gameState;
        if (d.word != null) state.currentWord = d.word;
        if (d.wordMask != null) state.wordMask = d.wordMask;
        if (d.wordLength != null) state.wordLength = d.wordLength;
        if (d.difficulty != null) state.difficulty = d.difficulty;
        if (d.drawer != null) state.drawerUsername = d.drawer;
        if (d.drawerId != null) state.drawerEmail = d.drawerId;
        if (d.round != null) state.round = d.round;
        if (d.maxRounds != null) state.maxRounds = d.maxRounds;
        if (d.players != null) state.leaderboard = d.players;
        if (d.winner != null) state.winner = d.winner;
        if (d.timer != null) state.timer = d.timer;
      }
    },
    updatePlayers: (state, action) => { state.players = action.payload; },
    addChatMessage: (state, action) => {
      state.chat.push(action.payload);
      if (state.chat.length > 200) state.chat.shift();
    },
    syncTimer: (state, action) => { state.timer = action.payload; },
    playerGuessed: (state, action) => {
      if (!state.correctGuessers.includes(action.payload.email)) {
        state.correctGuessers.push(action.payload.email);
      }
    },
    clearGuessers: (state) => { state.correctGuessers = []; },
    resetGame: () => ({
      roomId: null, players: [], gameState: 'LOBBY',
      currentWord: '', wordMask: '', wordLength: 0, difficulty: '',
      drawerUsername: '', drawerEmail: '', timer: 0, round: 1, maxRounds: 5,
      chat: [], correctGuessers: [], leaderboard: [], winner: '',
    }),
  },
});

export const {
  setRoom, setGameState, updatePlayers, addChatMessage,
  syncTimer, playerGuessed, clearGuessers, resetGame,
} = gameSlice.actions;
export default gameSlice.reducer;
