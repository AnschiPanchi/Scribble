const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['BRUSH_SKIN', 'AVATAR', 'PROFILE_BORDER'], required: true },
  price: { type: Number, required: true },
  rarity: { type: String, enum: ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'], default: 'COMMON' },
  imageUrl: String,
  effectSettings: Object // gradients, neon intensity, etc.
});

module.exports = mongoose.model('Item', itemSchema);
