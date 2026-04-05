# Scribble-X: Full-Stack Multiplayer AI Drawing Platform

Scribble-X is a high-end, gamified multiplayer drawing arena built with the MERN stack, enhanced by real-time WebSockets and AI-driven sketch recognition.

## 🚀 Architecture Highlights

### 1. Professional Security Handshake
- **Auth Strategy:** Hybrid JWT system with 15-min Access Tokens and 7-day Refresh Tokens stored in `httpOnly` cookies.
- **Session Persistence:** MongoDB-based session tracking for "Logout from all devices" and concurrent session security.
- **Social Integration:** Google OAuth 2.0 implementation.

### 2. High-Performance Real-Time Engine
- **WebSockets:** Powered by Socket.io with dedicated namespace/room logic.
- **Throttled Sync:** Drawing data (coordinates, pressure, color, tool) is broadcast with high-fidelity for a 60fps local-latency experience.
- **Game State Machine:** Automated server-side transitions: `LOBBY` -> `WORD_SELECTION` -> `DRAWING` -> `ROUND_END` -> `LEADERBOARD`.

### 3. Resume-Grade Feature Set
- **AI Recognition:** Integrated **TensorFlow.js** (Quick, Draw! model) for live sketch validation and hint provision.
- **Stroke Replay System:** Match strokes are captured with timestamps and persistent in MongoDB for post-game playback.
- **Game Economy:** Virtual 'Ink-Coins' earned via performance, redeemable in the Customization Shop for unique brush skins and avatars.

## 🛠 Technical Stack
- **Frontend:** React.js, Redux Toolkit, Tailwind CSS, Framer Motion, Socket.io-client, TensorFlow.js.
- **Backend:** Node.js, Express.js, MongoDB, Socket.io.

## 📂 Project Structure
- `/backend`: Express server, Socket logic, Mongoose models, and Auth controllers.
- `/frontend`: React application, Redux store, high-fidelity Canvas component, and AI utilities.
