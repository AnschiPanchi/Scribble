import { createSlice } from '@reduxjs/toolkit';

const gameSlice = createSlice({
  name: 'game',
  initialState: {
    roomId: null,
    players: [],
    gameState: 'LOBBY', // LOBBY, STARTING, WORD_SELECTION, DRAWING, ROUND_END, LEADERBOARD
    currentWord: '',
    drawerId: null,
    timer: 0,
    chat: [],
  },
  reducers: {
    setRoom: (state, action) => {
      state.roomId = action.payload;
    },
    setGameState: (state, action) => {
      state.gameState = action.payload;
    },
    updatePlayers: (state, action) => {
      state.players = action.payload;
    },
    addChatMessage: (state, action) => {
      state.chat.push(action.payload);
    },
  },
});

export const { setRoom, setGameState, updatePlayers, addChatMessage } = gameSlice.actions;
export default gameSlice.reducer;
