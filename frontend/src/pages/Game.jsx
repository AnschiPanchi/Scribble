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
  Zap, Eye, Star, Copy, Hash, Clock, Volume2, VolumeX, X, Users, LogOut,
} from 'lucide-react';
import { soundManager } from '../utils/soundManager';

const WordChooser = ({ options, onSelect, countdown }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
    className="absolute inset-0 z-[100] flex items-center justify-center bg-[#09090b]/95 backdrop-blur-md rounded-2xl"
  >
    <div className="w-full max-w-lg p-6 text-center">
      <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">TARGET SELECTION — {countdown}s</p>
      <div className="grid grid-cols-1 gap-3">
        {options.map((wordObj, i) => (
          <button
            key={i}
            onClick={() => onSelect(wordObj)}
            className="py-4 px-6 bg-[#18181b] border border-[#27272a] rounded-xl text-lg font-black uppercase text-white hover:bg-amber-500 hover:text-black transition-all"
          >{wordObj.word || wordObj}</button>
        ))}
      </div>
    </div>
  </motion.div>
);

const Game = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const {
    players, gameState, currentWord, wordLength, wordMask,
    timer, drawerEmail, chat, correctGuessers, maxRounds, round
  } = useSelector((state) => state.game);

  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [wordOptions, setWordOptions] = useState([]);
  const [choosingCountdown, setChoosingCountdown] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const chatEndRef = useRef(null);
  const choosingTimerRef = useRef(null);

  const isDrawer = user?.email === drawerEmail;
  const isSolo = players.length === 1 && gameState !== 'LOBBY';
  const iAmCorrect = correctGuessers.includes(user?.email);
  const isIntense = timer > 0 && timer <= 15;

  const [roomConfig, setRoomConfig] = useState({ maxRounds: 5, drawTime: 80, maxPlayers: 8, wordCount: 3, difficulty: 'MIXED' });
  const [rewardData, setRewardData] = useState(null);
  const [showRewardOverlay, setShowRewardOverlay] = useState(false);
  const [searchParams] = useSearchParams();

  const urlSettings = {
    maxRounds: searchParams.get('maxRounds'),
    drawTime: searchParams.get('drawTime'),
    maxPlayers: searchParams.get('maxPlayers'),
    wordCount: searchParams.get('wordCount'),
    difficulty: searchParams.get('difficulty'),
  };
  Object.keys(urlSettings).forEach(k => urlSettings[k] === null && delete urlSettings[k]);

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
      if (newState === 'STARTING' && prevGameState === 'LOBBY') soundManager.gameStart();
      else if (newState === 'CHOOSING' && prevGameState !== 'CHOOSING') soundManager.roundStart();
      else if (newState === 'REVEAL') soundManager.roundReveal();
      else if (newState === 'LEADERBOARD') soundManager.gameWinner();
      prevGameState = newState;
      dispatch(setGameState(data));
      if (newState === 'CHOOSING' || newState === 'STARTING') dispatch(clearGuessers());
    };
    const onSyncTime = (t) => dispatch(syncTimer(t));
    const onStartCountdown = (n) => setCountdown(n);
    const onChatMessage = (m) => {
      if (m.isSystem && m.systemType === 'CORRECT') soundManager.correctGuess();
      else if (m.isSystem && m.systemType === 'CLOSE') soundManager.closeGuess();
      dispatch(addChatMessage(m));
    };
    const onPlayerGuessed = (d) => { if (d.email !== user?.email) soundManager.otherGuess(); dispatch(playerGuessed(d)); };
    const onRoomSettings = (c) => setRoomConfig(c);
    const onRoomFull = ({ message }) => { alert(message); window.history.back(); soundManager.error(); };
    const onCanvasCatchUp = (s) => { window.dispatchEvent(new CustomEvent('canvasCatchUp', { detail: s })); };
    const onChooseWord = ({ options }) => { setWordOptions(options); setChoosingCountdown(15); };
    const onClearCanvas = () => { window.dispatchEvent(new CustomEvent('clearCanvas')); };

    socket.on('updatePlayers', onUpdatePlayers);
    socket.on('updateGameState', onUpdateGameState);
    socket.on('syncTime', onSyncTime);
    socket.on('startCountdown', onStartCountdown);
    socket.on('chatMessage', onChatMessage);
    socket.on('playerGuessed', onPlayerGuessed);
    socket.on('canvasCatchUp', onCanvasCatchUp);
    socket.on('chooseWord', onChooseWord);
    socket.on('clearCanvas', onClearCanvas);
    socket.on('roomSettings', onRoomSettings);
    socket.on('roomFull', onRoomFull);
    socket.on('gameReward', (data) => {
      dispatch(updateUser({ coins: data.total }));
      setRewardData(data); setShowRewardOverlay(true);
      if (!isMuted) soundManager.success();
      setTimeout(() => setShowRewardOverlay(false), 8000);
    });

    return () => {
      active = false;
      socket.off('connect', joinOnConnect);
      socket.off('updatePlayers', onUpdatePlayers);
      socket.off('updateGameState', onUpdateGameState);
      socket.off('syncTime', onSyncTime);
      socket.off('startCountdown', onStartCountdown);
      socket.off('chatMessage', onChatMessage);
      socket.off('playerGuessed', onPlayerGuessed);
      socket.off('canvasCatchUp', onCanvasCatchUp);
      socket.off('chooseWord', onChooseWord);
      socket.off('clearCanvas', onClearCanvas);
      socket.off('roomSettings', onRoomSettings);
      socket.off('roomFull', onRoomFull);
      socket.off('gameReward');
      dispatch(resetGame());
    };
  }, [user, dispatch, roomId]);

  useEffect(() => { if (gameState === 'DRAWING' && timer > 0 && timer <= 10) soundManager.timerTick(); }, [timer, gameState]);

  useEffect(() => {
    if (wordOptions.length > 0) {
      choosingTimerRef.current = setInterval(() => {
        setChoosingCountdown(c => {
          if (c <= 1) { clearInterval(choosingTimerRef.current); setWordOptions([]); return 0; }
          return c - 1;
        });
      }, 1000);
    } else { clearInterval(choosingTimerRef.current); }
    return () => clearInterval(choosingTimerRef.current);
  }, [wordOptions]);

  const handleSelectWord = useCallback((wordObj) => { socket.emit('selectWord', { roomId, wordObj }); setWordOptions([]); }, [roomId]);
  
  const handleLeaveRoom = () => {
     if (window.confirm("⚠️ EXTRACT NOW?\nYour score will be logged but you will exit the current deployment.")) {
        navigate('/');
     }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    socket.emit('submitGuess', { roomId, user, guess: message });
    setMessage('');
  };

  const getWordDisplay = () => {
    if (isDrawer || gameState === 'REVEAL' || gameState === 'LEADERBOARD') return currentWord || '...';
    if (gameState !== 'DRAWING') return '';
    return wordMask || Array(wordLength).fill('_').join(' ');
  };

  return (
    <div className="min-h-screen lg:h-screen bg-[#09090b] text-[#fafafa] flex flex-col font-sans tracking-tight">
      {/* Rewards Overlay */}
      <AnimatePresence>
        {showRewardOverlay && rewardData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50, x: '-50%' }} animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, scale: 0.9, y: 50, x: '-50%' }}
            style={{ left: '50%' }}
            className="fixed bottom-6 z-[999] w-[92%] max-w-sm bg-[#18181b]/95 backdrop-blur-xl border border-indigo-500/50 rounded-3xl p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <Zap className="text-amber-500" size={24} />
              <h3 className="font-black italic uppercase italic">Tactical Earnings</h3>
            </div>
            <div className="flex justify-between p-3 bg-[#09090b] rounded-xl border border-[#27272a] mb-4">
               <span className="text-[10px] uppercase font-black text-[#71717a]">Reward Received</span>
               <span className="text-emerald-400 font-black">+{rewardData.coins} IC</span>
            </div>
            <button onClick={() => setShowRewardOverlay(false)} className="w-full py-3 bg-indigo-600 rounded-xl text-[10px] font-black uppercase">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row flex-1 gap-3 lg:gap-6 p-3 lg:p-6 h-full overflow-hidden min-h-0">
        
        {/* Unit Info (Scroll horizontal on mobile, vertical sidebar on desktop) */}
        <div className="flex flex-col lg:w-72 shrink-0 h-auto lg:h-full">
           <div className="flex items-center justify-between p-3 bg-[#18181b] lg:bg-transparent rounded-xl border border-[#27272a] lg:border-none mb-2 lg:mb-0">
              <div className="flex items-center gap-2">
                 <Users size={14} className="text-indigo-400" />
                 <h2 className="text-[10px] font-black uppercase tracking-widest text-[#a1a1aa]">Operators</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-[#3f3f46]">{round}/{maxRounds}</span>
                <button onClick={handleLeaveRoom} className="lg:hidden text-rose-500 hover:text-rose-400 transition-colors">
                   <LogOut size={16} />
                </button>
              </div>
           </div>
           
           {/* Desktop Vertical List */}
           <div className="hidden lg:flex flex-1 flex-col overflow-y-auto space-y-2 py-4 scrollbar-hide">
              {players.map(p => {
                 const isMe = p.email === user?.email;
                 const isThisDrawer = p.email === drawerEmail;
                 const guessed = correctGuessers.includes(p.email);
                 return <PlayerCard key={p.socketId} p={p} isMe={isMe} isThisDrawer={isThisDrawer} guessed={guessed} />
              })}
           </div>

           {/* Mobile Horizontal Strip */}
           <div className="lg:hidden flex gap-2 overflow-x-auto scrollbar-hide pb-2 shrink-0">
              {players.map(p => {
                 const isMe = p.email === user?.email;
                 const isThisDrawer = p.email === drawerEmail;
                 const guessed = correctGuessers.includes(p.email);
                 return (
                   <div key={p.socketId} className={`flex items-center gap-2 px-3 py-2 rounded-xl border shrink-0 ${isMe ? 'bg-indigo-500/10 border-indigo-500/20' : guessed ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-[#18181b] border-[#27272a]'}`}>
                      <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center font-black text-[10px] text-zinc-400">{p.username?.charAt(0)}</div>
                      <span className="text-[10px] font-black uppercase text-[#a1a1aa]">{p.username}</span>
                   </div>
                 )
              })}
           </div>

           {/* Desktop Footer Only */}
           <div className="hidden lg:flex flex-col gap-2 p-4 border-t border-[#27272a] mt-auto">
             <button onClick={() => navigate('/')} className="w-full p-3 bg-[#18181b] border border-[#27272a] rounded-xl flex items-center justify-center gap-2 text-[#71717a] hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">
               <LayoutDashboard size={14} /> Hub
             </button>
             <button onClick={handleLeaveRoom} className="w-full p-3 bg-[#18181b] border border-rose-500/20 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest">
               <LogOut size={14} /> Leave Arena
             </button>
           </div>
        </div>

        {/* Tactical Arena */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 h-full overflow-hidden">
           <div className={`p-4 bg-[#18181b] border rounded-2xl flex items-center justify-between shrink-0 ${isIntense ? 'border-rose-500/40 shadow-inner' : 'border-[#27272a]'}`}>
              <div>
                 <p className="text-[9px] font-black text-[#52525b] uppercase tracking-widest mb-1">{isDrawer ? 'Word to Draw' : 'Objective'}</p>
                 <span className="text-xl lg:text-3xl font-black tracking-widest uppercase text-white font-mono">{gameState === 'STARTING' ? `PREPARING ${countdown}` : getWordDisplay()}</span>
              </div>
              <div className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center ${isIntense ? 'border-rose-500' : 'border-[#27272a]'}`}>
                 <span className="text-xl font-mono font-black text-white">{timer}</span>
              </div>
           </div>

           <div className="flex-1 relative bg-white rounded-2xl overflow-hidden border border-[#27272a] aspect-[4/3] lg:aspect-auto">
              {wordOptions.length > 0 && isDrawer && <WordChooser options={wordOptions} onSelect={handleSelectWord} countdown={choosingCountdown} />}
              <Canvas roomId={roomId} user={user} isDrawer={isDrawer} gameState={gameState} />
           </div>
        </div>

        {/* Comms Panel */}
        <div className="flex w-full lg:w-80 flex-col bg-[#111114] border border-[#27272a] rounded-2xl lg:rounded-3xl shadow-xl h-[280px] lg:h-full shrink-0">
           <div className="hidden lg:flex p-4 border-b border-[#27272a] items-center gap-2">
              <MessageSquare size={14} className="text-indigo-400" />
              <h3 className="text-[10px] font-black uppercase text-[#a1a1aa]">Comms</h3>
           </div>
           <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
              <AnimatePresence mode="popLayout">
                {chat.map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`text-[10px] lg:text-xs p-2 rounded-xl border ${m.isSystem ? 'bg-[#18181b] border-indigo-500/10 text-indigo-100 text-center italic' : 'bg-[#1e1e24] border-[#27272a] text-zinc-300'}`}>
                    {!m.isSystem && <span className="font-black text-indigo-400 mr-2 uppercase">{m.user?.username || m.user}:</span>}
                    {m.message}
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={chatEndRef} />
           </div>
           <form onSubmit={handleSendMessage} className="p-3 bg-[#18181b] border-t border-[#27272a] shrink-0">
              <div className="flex gap-2">
                 <input type="text" value={message} onChange={e => setMessage(e.target.value)} placeholder="ENTER GUESS..." disabled={iAmCorrect || gameState !== 'DRAWING'} className="flex-1 bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-2 text-[10px] font-black uppercase focus:outline-none focus:border-indigo-500/40" />
                 <button type="submit" className="p-3 bg-indigo-600 rounded-xl lg:hidden"><Zap size={14} /></button>
              </div>
           </form>
        </div>
      </div>
    </div>
  );
};

const PlayerCard = ({ p, isMe, isThisDrawer, guessed }) => (
  <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isMe ? 'bg-indigo-500/10 border-indigo-500/20' : guessed ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-[#18181b] border-[#27272a]'}`}>
    <div className={`w-8 h-8 rounded bg-zinc-800 flex items-center justify-center font-black text-xs ${isMe ? 'text-indigo-400' : 'text-zinc-500'}`}>
       {p.username?.charAt(0).toUpperCase()}
       {isThisDrawer && <div className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-full" />}
    </div>
    <div className="flex-1 min-w-0">
       <p className={`text-xs font-black truncate uppercase ${guessed ? 'text-emerald-400' : 'text-zinc-300'}`}>{p.username}</p>
       <div className="w-full bg-zinc-900 h-1 rounded-full mt-1 overflow-hidden">
          <motion.div animate={{ width: `${Math.min((p.score / 5000) * 100, 100)}%` }} className="h-full bg-indigo-500" />
       </div>
    </div>
    <span className="text-[10px] font-mono text-indigo-400">{p.score}</span>
  </div>
);

export default Game;
