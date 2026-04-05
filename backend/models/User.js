const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    // Optional if using Google OAuth
  },
  googleId: {
    type: String
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  coins: {
    type: Number,
    default: 0
  },
  rank: {
    type: Number,
    default: 1
  },
  avatar: {
    type: String,
    default: 'default-avatar.png'
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
