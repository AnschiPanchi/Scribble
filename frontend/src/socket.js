import { io } from 'socket.io-client';

const PROD_URL = "https://scribble-bakd.onrender.com";
const LOCAL_URL = "http://localhost:5000";

const URL = import.meta.env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' ? LOCAL_URL : PROD_URL);

console.log(`[Socket] Connecting to: ${URL}`);

export const socket = io(URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ['websocket', 'polling']
});
