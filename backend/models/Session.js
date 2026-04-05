const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  deviceInfo: {
    type: String
  },
  ipAddress: {
    type: String
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Auto-expire sessions after 7 days (assuming a 7d refresh token)
sessionSchema.index({ lastActive: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('Session', sessionSchema);
