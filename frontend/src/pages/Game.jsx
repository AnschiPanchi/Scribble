import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  setGameState, updatePlayers, addChatMessage,
  setRoom, syncTimer, playerGuessed, clearGuessers, resetGame,
} from '../store/slices/gameSlice';
import { updateUser } from '../store/slices/authSlice';
import { socket } from '../socket';
import Canvas from '../components/Canvas';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Paintbrush, LayoutDashboard,
  Zap, Eye, Star, Copy, Hash, Clock, Volume2, VolumeX, X,
} from 'lucide-react';
import { soundManager } from '../utils/soundManager';

// ─── Word Chooser Overlay ─────────────────────────────────────────────────────
const WordChooser = ({ options, onSelect, countdown }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className="absolute inset-0 z-50 flex items-center justify-center bg-[#09090b]/90 backdrop-blur-md rounded-2xl"
  >
    <div className="w-full max-w-lg p-10 text-center">
      <p className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] mb-4">
        🎯 Choose Your Target — {countdown}s
      </p>
      <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-8 text-white">
        Pick a <span className="text-indigo-400">Word</span>
      </h2>
      <div className="flex flex-col gap-4">
        {options.map((opt, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.02, borderColor: '#6366f1' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(opt)}
            className="flex items-center justify-between p-5 bg-[#18181b] border border-[#27272a] rounded-2xl text-left transition-all group"
          >
            <span className="text-xl font-black text-white group-hover:text-indigo-300 transition-colors">
              {opt.word}
            </span>
            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
              opt.difficulty === 'EASY' ? 'bg-emerald-500/20 text-emerald-400' :
              opt.difficulty === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
              'bg-rose-500/20 text-rose-400'
            }`}>
              {opt.difficulty}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  </motion.div>
);

// ─── Leaderboard Overlay ──────────────────────────────────────────────────────
const LeaderboardOverlay = ({ leaderboard, winner, onReturn }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="absolute inset-0 z-50 flex items-center justify-center bg-[#09090b]/95 backdrop-blur-xl rounded-2xl"
  >
    <div className="w-full max-w-md p-10 text-center">
      <div className="mb-8">
        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-amber-400">
          {winner} Wins!
        </h2>
      </div>
      <div className="space-y-3 mb-8">
        {leaderboard.slice(0, 5).map((p, i) => (
          <div key={p.email} className={`flex items-center gap-4 p-4 rounded-xl border ${
            i === 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-[#18181b] border-[#27272a]'
          }`}>
            <span className={`w-8 h-8 flex items-center justify-center rounded-lg font-black text-sm ${
              i === 0 ? 'bg-amber-500 text-black' :
              i === 1 ? 'bg-zinc-400 text-black' :
              i === 2 ? 'bg-orange-600 text-white' : 'bg-[#27272a] text-[#a1a1aa]'
            }`}>{i + 1}</span>
            <span className="flex-1 text-left font-bold">{p.username}</span>
            <span className="font-mono font-black text-indigo-400">{p.score} pts</span>
          </div>
        ))}
      </div>
      <motion.button
        whileHover={{ scale: 1.02 }}
        onClick={onReturn}
        className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all"
      >
        Return to Hub
      </motion.button>
    </div>
  </motion.div>
);

// ─── Reveal Overlay ───────────────────────────────────────────────────────────
const RevealOverlay = ({ word, difficulty }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
  >
    <div className="bg-[#09090b]/80 backdrop-blur-md border border-[#27272a] rounded-3xl px-16 py-10 text-center">
      <p className="text-[10px] font-black text-[#52525b] uppercase tracking-[0.3em] mb-2">The Word Was</p>
      <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white mb-3">{word}</h2>
      <span className={`text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest ${
        difficulty === 'EASY' ? 'bg-emerald-500/20 text-emerald-400' :
        difficulty === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
        'bg-rose-500/20 text-rose-400'
      }`}>{difficulty}</span>
    </div>
  </motion.div>
);

// ─── Main Game Component ──────────────────────────────────────────────────────
const Game = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const { gameState, players, chat, currentWord, wordMask, wordLength, difficulty,
          drawerUsername, drawerEmail, timer, round, maxRounds,
          leaderboard, winner, correctGuessers } = useSelector(s => s.game);
  const dispatch = useDispatch();

  const [message, setMessage] = useState('');
  const [wordOptions, setWordOptions] = useState([]);
  const [choosingCountdown, setChoosingCountdown] = useState(15);
  const chatEndRef = useRef(null);
  const choosingTimerRef = useRef(null);

  const isDrawer = user?.email === drawerEmail;
  const isSolo = roomId?.startsWith('test-');
  const isIntense = timer > 0 && timer < 10;
  const iAmCorrect = correctGuessers.includes(user?.email);
  const [countdown, setCountdown] = useState(5);
  const [isMuted, setIsMuted] = useState(false);
  const [roomConfig, setRoomConfig] = useState({ maxRounds: 5, drawTime: 80, maxPlayers: 8, wordCount: 3, difficulty: 'MIXED' });
  const [rewardData, setRewardData] = useState(null);
  const [showRewardOverlay, setShowRewardOverlay] = useState(false);
  const [searchParams] = useSearchParams();

  // Parse settings from URL (set by the room creator)
  const urlSettings = {
    maxRounds:  parseInt(searchParams.get('maxRounds'))  || undefined,
    drawTime:   parseInt(searchParams.get('drawTime'))   || undefined,
    maxPlayers: parseInt(searchParams.get('maxPlayers')) || undefined,
    wordCount:  parseInt(searchParams.get('wordCount'))  || undefined,
    difficulty: searchParams.get('difficulty')           || undefined,
  };
  // Remove undefined keys
  Object.keys(urlSettings).forEach(k => urlSettings[k] === undefined && delete urlSettings[k]);

  // Auto-scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  useEffect(() => {
    if (!roomId || !user) return;

    let active = true;
    let prevGameState = null;
    let prevPlayerCount = 0;

    const joinOnConnect = () => {
      if (!active) return;
      socket.emit('joinRoom', { roomId, user, settings: urlSettings });
      dispatch(setRoom(roomId));
    };

    if (!socket.connected) socket.connect();
    if (socket.connected) joinOnConnect();
    else socket.once('connect', joinOnConnect);

    const onUpdatePlayers = (data) => {
      if (data.length > prevPlayerCount && prevPlayerCount > 0) soundManager.playerJoin();
      prevPlayerCount = data.length;
      dispatch(updatePlayers(data));
    };
    const onUpdateGameState = (data) => {
      const newState = typeof data === 'string' ? data : data.state;
      // Transition sounds
      if (newState === 'STARTING' && prevGameState === 'LOBBY')  soundManager.gameStart();
      else if (newState === 'CHOOSING' && prevGameState !== 'CHOOSING') soundManager.roundStart();
      else if (newState === 'REVEAL')      soundManager.roundReveal();
      else if (newState === 'LEADERBOARD') soundManager.gameWinner();
      prevGameState = newState;
      dispatch(setGameState(data));
      if (newState === 'CHOOSING' || newState === 'STARTING') dispatch(clearGuessers());
    };
    const onSyncTime = (t) => dispatch(syncTimer(t));
    const onStartCountdown = (n) => setCountdown(n);
    const onChatMessage = (msg) => {
      if (msg.isSystem && msg.systemType === 'CORRECT') soundManager.correctGuess();
      else if (msg.isSystem && msg.systemType === 'CLOSE')  soundManager.closeGuess();
      dispatch(addChatMessage(msg));
    };
    const onPlayerGuessed = (data) => {
      if (data.email !== user?.email) soundManager.otherGuess();
      dispatch(playerGuessed(data));
    };
    const onRoomSettings = (cfg) => setRoomConfig(cfg);
    const onRoomFull = ({ message }) => { alert(message); window.history.back(); soundManager.error(); };
    const onCanvasCatchUp = (strokes) => {
      window.dispatchEvent(new CustomEvent('canvasCatchUp', { detail: strokes }));
    };
    const onChooseWord = ({ options }) => {
      setWordOptions(options);
      setChoosingCountdown(15);
    };
    const onClearCanvas = () => {
      window.dispatchEvent(new CustomEvent('clearCanvas'));
    };

    socket.on('updatePlayers',   onUpdatePlayers);
    socket.on('updateGameState', onUpdateGameState);
    socket.on('syncTime',        onSyncTime);
    socket.on('startCountdown',  onStartCountdown);
    socket.on('chatMessage',     onChatMessage);
    socket.on('playerGuessed',   onPlayerGuessed);
    socket.on('canvasCatchUp',   onCanvasCatchUp);
    socket.on('chooseWord',      onChooseWord);
    socket.on('clearCanvas',     onClearCanvas);
    socket.on('roomSettings',    onRoomSettings);
    socket.on('roomFull',        onRoomFull);
    socket.on('gameReward',      (data) => {
      console.log('💎 REWARD RECEIVED:', data);
      dispatch(updateUser({ coins: data.total }));
      setRewardData(data);
      setShowRewardOverlay(true);
      if (!isMuted) soundManager.success();
      setTimeout(() => setShowRewardOverlay(false), 10000); 
    });

    return () => {
      active = false;
      socket.off('connect',       joinOnConnect);
      socket.off('updatePlayers',   onUpdatePlayers);
      socket.off('updateGameState', onUpdateGameState);
      socket.off('syncTime',        onSyncTime);
      socket.off('startCountdown',  onStartCountdown);
      socket.off('chatMessage',     onChatMessage);
      socket.off('playerGuessed',   onPlayerGuessed);
      socket.off('canvasCatchUp',   onCanvasCatchUp);
      socket.off('chooseWord',      onChooseWord);
      socket.off('clearCanvas',     onClearCanvas);
      socket.off('roomSettings',    onRoomSettings);
      socket.off('roomFull',        onRoomFull);
      socket.off('gameReward');
      dispatch(resetGame());
    };
  }, [user, dispatch, roomId]);

  // Timer warning ticks for last 10 seconds
  useEffect(() => {
    if (gameState === 'DRAWING' && timer > 0 && timer <= 10) {
      soundManager.timerTick();
    }
  }, [timer, gameState]);

  // Choosing countdown
  useEffect(() => {
    if (wordOptions.length > 0) {
      choosingTimerRef.current = setInterval(() => {
        setChoosingCountdown(c => {
          if (c <= 1) {
            clearInterval(choosingTimerRef.current);
            // Server auto-picks, just close overlay
            setWordOptions([]);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } else {
      clearInterval(choosingTimerRef.current);
    }
    return () => clearInterval(choosingTimerRef.current);
  }, [wordOptions]);

  const handleSelectWord = useCallback((wordObj) => {
    socket.emit('selectWord', { roomId, wordObj });
    setWordOptions([]);
  }, [roomId]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    socket.emit('submitGuess', { roomId, user, guess: message });
    setMessage('');
  };

  // Word display logic
  const getWordDisplay = () => {
    if (isDrawer || gameState === 'REVEAL' || gameState === 'LEADERBOARD') return currentWord;
    if (gameState !== 'DRAWING') return '';
    return wordMask || Array(wordLength).fill('_').join(' ');
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-[#fafafa] overflow-hidden select-none font-sans tracking-tight relative">
      
      {/* ─── Mission Rewards Overlay ─────────────────────────────── */}
      <AnimatePresence>
        {showRewardOverlay && rewardData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50, x: '-50%' }} 
            animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }} 
            exit={{ opacity: 0, scale: 0.9, y: 50, x: '-50%' }}
            style={{ left: '50%' }}
            className="fixed bottom-10 z-[999] w-80 bg-[#18181b]/95 backdrop-blur-xl border-2 border-indigo-500/50 rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(79,70,229,0.5)] overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#52525b]">Extraction Complete</span>
              <button onClick={() => setShowRewardOverlay(false)} className="text-[#52525b] hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                <Zap className="text-indigo-400" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter">Earnings <span className="text-indigo-500">Log</span></h3>
                <p className="text-[10px] font-bold text-[#71717a] uppercase tracking-widest">{rewardData.message || 'Network Rewards Credited'}</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between p-4 bg-[#09090b] rounded-2xl border border-[#27272a]">
                <span className="text-xs font-black text-[#52525b] uppercase">Reward</span>
                <span className="text-lg font-mono font-black text-emerald-400">+{rewardData.coins} IC</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#09090b] rounded-2xl border border-[#27272a]">
                <span className="text-xs font-black text-[#52525b] uppercase">New Balance</span>
                <span className="text-lg font-mono font-black text-white">{rewardData.total} IC</span>
              </div>
            </div>

            <button 
              onClick={() => setShowRewardOverlay(false)}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-[0_10px_20px_rgba(79,70,229,0.2)]"
            >Acknowledge Data</button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-1 gap-6 p-6 max-h-screen">

        {/* ── Left Column: Players ──────────────────────────────── */}
        <div className="w-72 flex flex-col gap-3">
          <div className="p-4 flex items-center justify-between border-b border-[#27272a]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse" />
              <h2 className="text-[10px] font-black tracking-[0.2em] text-[#a1a1aa] uppercase">Operators</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-[#3f3f46]">{round}/{maxRounds}</span>
              <span className="text-[10px] font-mono text-[#3f3f46]">{players.length}/{roomConfig.maxPlayers}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
            <AnimatePresence>
              {players.map((p) => {
                const isMe = p.email === user?.email;
                const isThisDrawer = p.email === drawerEmail;
                const guessed = correctGuessers.includes(p.email);
                return (
                  <motion.div
                    key={p.socketId}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isMe ? 'bg-indigo-500/10 border-indigo-500/20' :
                      guessed ? 'bg-emerald-500/10 border-emerald-500/20' :
                      'bg-[#18181b] border-[#27272a]'
                    }`}
                  >
                    <div className={`relative w-9 h-9 rounded-full flex items-center justify-center font-black text-sm ${
                      isMe ? 'bg-indigo-500' : 'bg-zinc-800'
                    }`}>
                      {p.username?.charAt(0).toUpperCase()}
                      {isThisDrawer && (
                        <div className="absolute -top-1 -right-1 p-[3px] bg-amber-500 rounded-full border border-[#09090b]">
                          <Paintbrush size={7} fill="currentColor" />
                        </div>
                      )}
                      {guessed && (
                        <div className="absolute -bottom-1 -right-1 p-[3px] bg-emerald-500 rounded-full border border-[#09090b]">
                          <Star size={7} fill="currentColor" />
                        </div>
                      )}
                      {p.isSpectator && (
                        <div className="absolute -bottom-1 -right-1 p-[3px] bg-zinc-600 rounded-full border border-[#09090b]">
                          <Eye size={7} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${guessed ? 'text-emerald-400' : ''}`}>
                        {p.username}{isMe ? ' (you)' : ''}
                      </p>
                      <div className="w-full bg-zinc-900 h-0.5 rounded-full mt-1 overflow-hidden">
                        <motion.div
                          animate={{ width: `${Math.min((p.score / 3000) * 100, 100)}%` }}
                          className="h-full bg-indigo-500"
                        />
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-black text-indigo-400">{p.score}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <div className="flex gap-2 mt-auto">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/')}
              className="flex-1 p-3 bg-[#18181b] border border-[#27272a] rounded-xl flex items-center justify-center gap-2 text-[#71717a] hover:text-white hover:border-[#3f3f46] transition-all text-xs font-black uppercase tracking-widest"
            >
              <LayoutDashboard size={14} /> Hub
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { const en = soundManager.toggle(); setIsMuted(!en); }}
              className="p-3 bg-[#18181b] border border-[#27272a] rounded-xl text-[#71717a] hover:text-white hover:border-[#3f3f46] transition-all"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </motion.button>
          </div>
        </div>

        {/* ── Center: Drawing Theatre ───────────────────────────── */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">

          {/* Header */}
          <div className={`p-5 bg-[#18181b] border rounded-2xl flex items-center justify-between relative overflow-hidden transition-all duration-300 ${
            isIntense ? 'border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.1)]' : 'border-[#27272a]'
          }`}>
            {isIntense && <div className="absolute inset-0 bg-rose-500/5 animate-pulse" />}

            <div className="relative z-10">
              <p className="text-[9px] font-black text-[#52525b] uppercase tracking-[0.3em] mb-1">
                {isDrawer && !isSolo ? 'Your Word' : isSolo ? 'Solo Mode' : 'Mission Objective'}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black tracking-[0.5em] uppercase text-white font-mono">
                  {gameState === 'STARTING'
                    ? `STARTING ${countdown > 0 ? countdown : ''}...`
                    : getWordDisplay() || (gameState === 'CHOOSING' ? '...' : '---')}
                </span>
                {difficulty && (
                  <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${
                    difficulty === 'EASY' ? 'bg-emerald-500/20 text-emerald-400' :
                    difficulty === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-rose-500/20 text-rose-400'
                  }`}>{difficulty}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 relative z-10">
              {/* Private room code badge */}
              {roomId?.startsWith('private-') && (
                <div
                  className="flex items-center gap-2 px-3 py-2 bg-[#09090b] border border-[#27272a] rounded-lg cursor-pointer hover:border-indigo-500/40 transition-all"
                  onClick={() => navigator.clipboard.writeText(roomId.replace('private-', '').toUpperCase())}
                  title="Click to copy room code"
                >
                  <Hash size={12} className="text-[#52525b]" />
                  <span className="font-mono font-black text-xs text-indigo-300 tracking-widest">
                    {roomId.replace('private-', '').toUpperCase()}
                  </span>
                  <Copy size={10} className="text-[#52525b]" />
                </div>
              )}
              {gameState === 'DRAWING' || gameState === 'CHOOSING' ? (
                <div className={`flex items-center gap-2 px-5 py-3 rounded-xl border transition-all duration-300 font-mono font-black text-2xl ${
                  isIntense
                    ? 'bg-rose-500 border-rose-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse'
                    : 'bg-[#09090b] border-[#27272a] text-[#a1a1aa]'
                }`}>
                  <Clock size={18} />
                  {String(timer).padStart(2, '0')}s
                </div>
              ) : (
                <div className="px-5 py-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 font-black text-xs uppercase tracking-widest">
                  {gameState}
                </div>
              )}
            </div>
          </div>

          {/* Canvas */}
          <div className={`flex-1 relative overflow-hidden rounded-2xl border transition-all duration-500 ${
            isIntense ? 'border-rose-500/30' : 'border-[#27272a]'
          }`}>
            {/* Word chooser overlay (only for drawer) */}
            <AnimatePresence>
              {wordOptions.length > 0 && (
                <WordChooser
                  options={wordOptions}
                  countdown={choosingCountdown}
                  onSelect={handleSelectWord}
                />
              )}
            </AnimatePresence>

            {/* Lobby waiting overlay */}
            <AnimatePresence>
              {gameState === 'LOBBY' && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#09090b]/80 backdrop-blur-sm rounded-2xl"
                >
                  <div className="text-center">
                    <div className="flex gap-2 justify-center mb-6">
                      {[0,1,2].map(i => (
                        <motion.div key={i}
                          animate={{ y: [0,-10,0] }}
                          transition={{ duration: 0.9, delay: i * 0.18, repeat: Infinity }}
                          className="w-3 h-3 rounded-full bg-indigo-500"
                        />
                      ))}
                    </div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-2">
                      Waiting for <span className="text-indigo-400">Players</span>
                    </h3>
                    <p className="text-xs text-[#52525b] mb-6 font-mono">
                      {players.length} / {roomConfig.maxPlayers} operators connected
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {[
                        `⏱ ${roomConfig.drawTime}s draw`,
                        `🔄 ${roomConfig.maxRounds} rounds`,
                        `📖 ${roomConfig.wordCount} words`,
                        `🎯 ${roomConfig.difficulty}`,
                      ].map(tag => (
                        <span key={tag} className="px-3 py-1.5 bg-[#27272a] rounded-full text-[10px] font-black text-[#71717a] uppercase tracking-wider">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>


            <AnimatePresence>
              {gameState === 'REVEAL' && (
                <RevealOverlay word={currentWord} difficulty={difficulty} />
              )}
            </AnimatePresence>

            {/* Leaderboard overlay */}
            <AnimatePresence>
              {gameState === 'LEADERBOARD' && (
                <LeaderboardOverlay
                  leaderboard={leaderboard}
                  winner={winner}
                  onReturn={() => navigate('/')}
                />
              )}
            </AnimatePresence>

            {/* "You guessed!" banner */}
            <AnimatePresence>
              {iAmCorrect && !isDrawer && gameState === 'DRAWING' && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-4 left-0 right-0 z-30 flex justify-center pointer-events-none"
                >
                  <div className="px-6 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-black uppercase tracking-widest backdrop-blur">
                    ✅ You guessed! Waiting for others...
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Canvas roomId={roomId} user={user} isDrawer={isDrawer} gameState={gameState} />
          </div>
        </div>

        {/* ── Right: Chat ───────────────────────────────────────── */}
        <div className="w-80 flex flex-col bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-[#27272a] flex items-center gap-2">
            <MessageSquare size={14} className="text-indigo-400" />
            <h3 className="text-[10px] font-black tracking-[0.2em] text-[#a1a1aa] uppercase">Tactical Comms</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 scrollbar-hide">
            <AnimatePresence initial={false}>
              {chat.map((msg, i) => {
                const typeMeta = {
                  CORRECT: { bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
                  CLOSE: { bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
                  GUESS: { bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
                  REVEAL: { bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' },
                  WIN: { bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
                  WARN: { bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400' },
                  BONUS: { bg: 'bg-purple-500/10 border-purple-500/20 text-purple-400' },
                  INFO: { bg: 'bg-zinc-800/50 border-[#27272a] text-[#71717a]' },
                  JOIN: { bg: 'bg-zinc-800/50 border-[#27272a] text-[#52525b]' },
                  LEAVE: { bg: 'bg-zinc-800/50 border-[#27272a] text-[#52525b]' },
                };
                const isSystem = msg.isSystem;
                const style = typeMeta[msg.systemType] || typeMeta.INFO;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className={`p-2.5 rounded-lg border text-xs ${
                      isSystem
                        ? `${style.bg} text-center font-black`
                        : 'bg-[#27272a]/30 border-[#27272a]/50'
                    }`}
                  >
                    {!isSystem && (
                      <span className="font-black text-[10px] text-indigo-400/80 uppercase tracking-wider block mb-0.5">
                        {msg.user?.username}
                      </span>
                    )}
                    <p className={isSystem ? '' : 'text-[#d1d1d6]'}>{msg.message}</p>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-4 border-t border-[#27272a]">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  isSolo ? 'Draw & guess here (solo mode)...' :
                  isDrawer ? 'You are drawing...' :
                  iAmCorrect ? 'Waiting for round...' :
                  'Type your guess...'
                }
                disabled={(!isSolo && isDrawer) || (iAmCorrect && !isSolo) || gameState !== 'DRAWING'}
                className="flex-1 bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-indigo-500/50 text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              />
              <motion.button
                type="submit"
                whileTap={{ scale: 0.95 }}
                disabled={(!isSolo && isDrawer) || (iAmCorrect && !isSolo) || gameState !== 'DRAWING'}
                className="p-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Zap size={14} />
              </motion.button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Game;
