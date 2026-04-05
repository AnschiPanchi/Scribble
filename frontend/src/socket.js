import { io } from 'socket.io-client';

const PROD_URL = "https://scribble-bakd.onrender.com";
// Dynamic detect: If we're on a local network/IP or localhost, use port 5000 on THAT host
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname.includes('127.0.0.1') || 
                window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/);

const URL = import.meta.env.VITE_BACKEND_URL || (isLocal ? `http://${window.location.hostname}:5000` : PROD_URL);

console.log(`[Socket] 🛰️ Tactical Signal Link: ${URL}`);

export const socket = io(URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1000
});
