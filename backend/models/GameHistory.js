const mongoose = require('mongoose');

const gameHistorySchema = new mongoose.Schema({
  roomId: String,
  players: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    score: Number,
    rank: Number
  }],
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  strokes: [{
    type: Object // Storing the full stroke array for the "Stroke Replay System"
  }],
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('GameHistory', gameHistorySchema);
