const express = require('express');
const dns = require('dns');
const cors = require('cors');

// Fix for MongoDB connection issues in Node 17+
dns.setDefaultResultOrder('ipv4first');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Tactical Restriction: Origin not allowed by CORS Policy'));
    }
  },
  credentials: true
}));
app.use(cookieParser());

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/shop', require('./routes/shopRoutes'));

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Socket CORS: Origin not allowed'));
      }
    },
    credentials: true,
    methods: ["GET", "POST"]
  }
});

require('./socket/index')(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
