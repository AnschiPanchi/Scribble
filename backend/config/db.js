const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/scribble-x', {
      serverSelectionTimeoutMS: 5000,
      family: 4 // Use IPv4 to avoid common Node.js connectivity issues
    });
    console.log(`\x1b[32m✔ Tactical DB Online: ${conn.connection.host}\x1b[0m`);
  } catch (err) {
    console.error(`\x1b[31m✘ Comms Failure: DB Connection Refused\x1b[0m`);
    console.error(`\x1b[31m  Error Details: ${err.message}\x1b[0m`);
    console.log('\x1b[33m⚠ Running in DISCONNECTED mode (Local sessions only)\x1b[0m');
  }
};

module.exports = connectDB;
