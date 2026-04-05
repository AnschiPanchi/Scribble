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
  Trophy, Medal, Share2, Loader2, Play
} from 'lucide-react';
import { soundManager } from '../utils/soundManager';

const LobbyOverlay = ({ players, maxPlayers, roomId }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const count = players?.length || 0;
  const max = maxPlayers || 8;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-[150] flex items-center justify-center bg-[#09090b]/98 backdrop-blur-3xl rounded-[2rem] p-6 text-center"
    >
      <div className="w-full max-w-sm">
         <div className="mb-8">
            <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl border border-indigo-500/20 flex items-center justify-center mx-auto mb-6 relative">
               <Loader2 className="text-indigo-500 animate-spin" size={32} />
               <div className="absolute inset-0 rounded-3xl border-2 border-indigo-500 animate-ping opacity-20" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-tighter text-white">Awaiting <span className="text-indigo-500 text-3xl">Operatives</span></h2>
            <p className="text-[10px] font-black text-zinc-500 tracking-[0.3em] uppercase mt-2">Frequency scan in progress...</p>
         </div>
         <div className="bg-[#111114] p-5 rounded-2xl border border-[#27272a] mb-8">
            <div className="flex justify-between items-center mb-4">
               <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Protocol Status</span>
               <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] rounded-full border border-indigo-500/20 font-black">{count} / {max}</span>
            </div>
            <div className="w-full bg-[#09090b] h-2 rounded-full overflow-hidden border border-zinc-800">
               <motion.div animate={{ width: `${(count / max) * 100}%` }} className="h-full bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
            </div>
            <p className="text-[9px] font-black text-zinc-500 mt-4 uppercase italic">Need {Math.max((roomId?.startsWith('test-') ? 1 : 2) - count, 0)} more to initialize</p>
         </div>
         <div className="flex flex-col gap-3">
            <button onClick={handleCopy} className={`w-full py-4 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${copied ? 'bg-emerald-600 text-white' : 'bg-[#18181b] border border-[#27272a] text-zinc-400 hover:text-white'}`}>
               {copied ? <Star size={14} fill="white" /> : <Share2 size={14} />} {copied ? 'Frequency Copied!' : 'Broadcast Invite Link'}
            </button>
            <p className="text-[9px] font-black text-zinc-700 h-4 uppercase tracking-widest">CHANNEL: {roomId}</p>
         </div>
      </div>
    </motion.div>
  );
};

const WordChooser = ({ options, onSelect, countdown }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
    className="absolute inset-0 z-[100] flex items-center justify-center bg-[#09090b]/98 backdrop-blur-xl rounded-2xl border-2 border-indigo-500/20"
  >
    <div className="w-full max-w-lg p-8 text-center">
      <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-6 animate-pulse">🎯 CHOOSE YOUR PROTOCOL — {countdown}s</p>
      <div className="grid grid-cols-1 gap-4">
        {options.map((wordObj, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(wordObj)}
            className="py-5 px-8 bg-[#18181b] border border-zinc-700/50 rounded-2xl text-xl font-black uppercase text-white shadow-lg transition-all"
          >{wordObj.word || wordObj}</motion.button>
        ))}
      </div>
    </div>
  </motion.div>
);

const ResultOverlay = ({ players, onHub }) => {
  const sorted = [...players].sort((a, b) => b.score - a.score).slice(0, 5);
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-[200] flex items-center justify-center bg-[#09090b]/95 backdrop-blur-xl p-4 lg:p-10"
    >
      <div className="w-full max-w-sm lg:max-w-md bg-[#111114] border-2 border-indigo-500/30 rounded-[2rem] p-5 lg:p-8 shadow-[0_0_80px_rgba(79,70,229,0.15)] relative overflow-hidden flex flex-col max-h-[90vh]">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
         <div className="text-center mb-6">
            <Trophy className="text-amber-500 mx-auto mb-2" size={32} />
            <h2 className="text-2xl lg:text-3xl font-black italic uppercase tracking-tighter text-white">Match <span className="text-indigo-500">Summary</span></h2>
            <p className="text-[9px] font-black text-zinc-600 tracking-[0.2em] uppercase mt-1">Extraction Complete</p>
         </div>
         <div className="flex-1 overflow-y-auto space-y-2 mb-6 scrollbar-hide py-2">
            {sorted.map((p, i) => (
              <motion.div 
                key={i} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-3 p-3 rounded-xl border ${i === 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-[#18181b] border-zinc-900'}`}
              >
                  <div className={`w-6 h-6 rounded bg-zinc-900 flex items-center justify-center font-black text-[10px] ${i === 0 ? 'text-amber-500' : 'text-zinc-500'}`}>
                    {i === 0 ? <Medal size={14} /> : i + 1}
                  </div>
                  <span className={`flex-1 font-black uppercase text-[11px] tracking-widest ${i === 0 ? 'text-white' : 'text-zinc-400'}`}>{p.username}</span>
                  <span className="font-mono font-black text-indigo-400 text-[11px]">{p.score} PTS</span>
              </motion.div>
            ))}
         </div>
         <div className="flex flex-col gap-2 shrink-0">
            <button onClick={onHub} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
               <LayoutDashboard size={14} /> Hub
            </button>
         </div>
      </div>
    </motion.div>
  );
};

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

  const [actualRoomId, setActualRoomId] = useState(roomId);
  const actualRoomIdRef = useRef(roomId);
  const [roomSettings, setRoomSettings] = useState({});

  useEffect(() => { actualRoomIdRef.current = actualRoomId; }, [actualRoomId]);

  const isDrawer = user?.email === drawerEmail;
  const iAmCorrect = correctGuessers.includes(user?.email);
  const isIntense = timer > 0 && timer <= 15;

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
    
    console.log(`[Uplink] Deploying to Arena: ${roomId}`);
    let active = true;

    const joinHandler = () => {
      if (!active) return;
      console.log(`[Uplink] Transmitting credentials for: ${roomId}`);
      socket.emit('joinRoom', { roomId, user, settings: urlSettings });
      dispatch(setRoom(roomId));
    };

    if (!socket.connected) socket.connect();
    if (socket.connected) joinHandler();
    socket.on('connect', joinHandler);

    const onUpdatePlayers = (data) => { 
        console.log(`[Feed] Units count: ${data?.length}`);
        dispatch(updatePlayers(data)); 
    };
    const onRoomSettings = (data) => {
       console.log(`[Uplink] Channel Established: ${data.roomId}`);
       setActualRoomId(data.roomId);
       dispatch(setRoom(data.roomId));
       setRoomSettings(data);
       
       // Canonical URL enforcement (fixes casing issues and match-lobby redirects)
       const currentPath = window.location.pathname;
       const expectedPath = `/arena/${data.roomId}`;
       if (currentPath.toLowerCase() !== expectedPath.toLowerCase() || (roomId === 'match-lobby' && data.roomId !== 'match-lobby')) {
         navigate(`${expectedPath}${window.location.search}`, { replace: true });
       }
    };
    const onUpdateGameState = (data) => {
      const newState = typeof data === 'string' ? data : data.state;
      try {
        if (newState === 'STARTING') soundManager.gameStart?.();
        else if (newState === 'CHOOSING') soundManager.roundStart?.();
        else if (newState === 'REVEAL')      soundManager.roundReveal?.();
        else if (newState === 'LEADERBOARD') soundManager.gameWinner?.();
      } catch (err) { }
      dispatch(setGameState(data));
      if (newState === 'CHOOSING' || newState === 'STARTING') dispatch(clearGuessers());
    };
    const onSyncTime = (t) => dispatch(syncTimer(t));
    const onStartCountdown = (n) => setCountdown(n);
    const onChatMessage = (m) => {
      try {
        if (m.isSystem && m.systemType === 'CORRECT') soundManager.correctGuess?.();
        else if (m.isSystem && m.systemType === 'CLOSE') soundManager.closeGuess?.();
      } catch (e) {}
      dispatch(addChatMessage(m));
    };
    const onPlayerGuessed = (d) => { try { if (d.email !== user?.email) soundManager.otherGuess?.(); } catch (e) {} dispatch(playerGuessed(d)); };
    const onChooseWord = ({ options }) => { setWordOptions(options); setChoosingCountdown(15); };
    const onClearCanvas = () => { window.dispatchEvent(new CustomEvent('clearCanvas')); };

    socket.on('updatePlayers', onUpdatePlayers);
    socket.on('roomSettings', onRoomSettings);
    socket.on('updateGameState', onUpdateGameState);
    socket.on('syncTime', onSyncTime);
    socket.on('startCountdown', onStartCountdown);
    socket.on('chatMessage', onChatMessage);
    socket.on('playerGuessed', onPlayerGuessed);
    socket.on('canvasCatchUp', (s) => window.dispatchEvent(new CustomEvent('canvasCatchUp', { detail: s })));
    socket.on('chooseWord', onChooseWord);
    socket.on('clearCanvas', onClearCanvas);
    socket.on('gameReward', (data) => {
      dispatch(updateUser({ coins: data.total }));
      setRewardData(data); setShowRewardOverlay(true);
      try { if (!isMuted) soundManager.success?.(); } catch (e) {}
      setTimeout(() => setShowRewardOverlay(false), 8000);
    });

    return () => {
      active = false;
      socket.off('connect', joinHandler);
      socket.off('updatePlayers', onUpdatePlayers);
      socket.off('roomSettings', onRoomSettings);
      socket.off('updateGameState', onUpdateGameState);
      socket.off('syncTime', onSyncTime);
      socket.off('startCountdown', onStartCountdown);
      socket.off('chatMessage', onChatMessage);
      socket.off('playerGuessed', onPlayerGuessed);
      socket.off('chooseWord', onChooseWord);
      socket.off('clearCanvas', onClearCanvas);
      socket.off('gameReward');
    };
  }, [user, roomId, dispatch]);

  // Master Unmount Signal: Only fires when leaving the ARENA entirely
  useEffect(() => {
     return () => {
        console.log(`[Uplink] Severing link to: ${actualRoomIdRef.current}`);
        socket.emit('leaveRoom', actualRoomIdRef.current);
        dispatch(resetGame()); 
     };
  }, [dispatch]); // Empty deps so it only runs on unmount

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

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

  const handleSelectWord = useCallback((wordObj) => { 
    console.log(`[Uplink] Selection finalized: ${wordObj.word || wordObj} in ${actualRoomId}`);
    socket.emit('selectWord', { roomId: actualRoomId, wordObj }); 
    setWordOptions([]); 
  }, [actualRoomId]);

  const handleLeaveRoom = () => { if (window.confirm("⚠️ ABANDON DEPLOYMENT?")) navigate('/'); };
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || isDrawer) return;
    socket.emit('submitGuess', { roomId: actualRoomId, user, guess: message });
    setMessage('');
  };

  const getWordDisplay = () => {
    if (isDrawer || gameState === 'REVEAL' || gameState === 'LEADERBOARD') return currentWord || '...';
    if (gameState !== 'DRAWING') return '';
    return wordMask || Array(wordLength).fill('_').join(' ');
  };

  return (
    <div className="min-h-screen lg:h-screen bg-[#09090b] text-[#fafafa] flex flex-col font-sans relative overflow-hidden tracking-tighter">
      {/* Rewards Overlay */}
      <AnimatePresence>
        {showRewardOverlay && rewardData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50, x: '-50%' }} animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, scale: 0.9, y: 50, x: '-50%' }}
            style={{ left: '50%' }}
            className="fixed bottom-10 z-[300] w-[90%] max-w-xs bg-[#18181b]/98 border-2 border-emerald-500/50 rounded-[2.5rem] p-6 shadow-2xl"
          >
            <div className="text-center">
              <Star className="text-emerald-400 mx-auto mb-3" size={32} fill="#10b981" />
              <h3 className="text-xl font-black italic uppercase">MISSION SUCCESS</h3>
              <div className="bg-[#09090b] p-3 rounded-2xl border border-zinc-800 my-4">
                <span className="text-emerald-400 text-2xl font-black">+{rewardData.coins}</span>
              </div>
              <button onClick={() => setShowRewardOverlay(false)} className="w-full py-3 bg-emerald-600 rounded-xl text-[10px] font-black uppercase">Acknowledge</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row flex-1 gap-2 lg:gap-4 p-2 lg:p-4 h-full overflow-hidden min-h-0">
        
        {/* Operators Sidebar */}
        <div className="flex flex-col lg:w-72 shrink-0 h-auto lg:h-full lg:bg-[#111114] lg:rounded-3xl lg:border lg:border-[#27272a] overflow-hidden">
           <div className="flex p-4 items-center justify-between border-b border-[#27272a]">
              <div className="flex items-center gap-2">
                 <Users size={14} className="text-indigo-400" />
                 <h2 className="text-[10px] font-black tracking-[0.2em] text-[#a1a1aa] uppercase">Operators</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-zinc-600">{round}/{maxRounds}</span>
                <button onClick={handleLeaveRoom} className="lg:hidden text-rose-500"><LogOut size={16} /></button>
              </div>
           </div>

           <div className="hidden lg:flex flex-1 flex-col overflow-y-auto space-y-2 p-4 scrollbar-hide">
              {players?.map(p => <PlayerCard key={p.socketId} p={p} isMe={p.email === user?.email} isThisDrawer={p.email === drawerEmail} guessed={correctGuessers.includes(p.email)} />)}
           </div>

           <div className="lg:hidden flex gap-2 overflow-x-auto scrollbar-hide p-2 bg-[#18181b]/50 rounded-xl border border-zinc-800/30">
              {players?.map(p => {
                 const isMe = p.email === user?.email;
                 const guessed = correctGuessers.includes(p.email);
                 return (
                   <div key={p.socketId} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border shrink-0 ${isMe ? 'bg-indigo-500/20 border-indigo-500/40' : guessed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[#18181b] border-zinc-800'}`}>
                      <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center font-black text-[9px] text-zinc-400">{p.username?.charAt(0)}</div>
                      <span className="text-[10px] font-black uppercase text-zinc-400">{p.username}</span>
                   </div>
                 )
              })}
           </div>

           <div className="hidden lg:flex flex-col gap-2 p-4 border-t border-[#27272a] mt-auto">
             <button onClick={() => navigate('/')} className="w-full p-3 bg-[#18181b] border border-[#27272a] rounded-xl flex items-center justify-center gap-2 text-[#71717a] hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"><LayoutDashboard size={14} /> Hub</button>
             <button onClick={handleLeaveRoom} className="w-full p-3 bg-[#18181b] border border-rose-500/20 rounded-xl text-rose-500 hover:bg-rose-500/10 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"><LogOut size={14} /> Leave</button>
           </div>
        </div>

        {/* Global Arena */}
        <div className="flex-1 flex flex-col gap-2 min-w-0 h-full overflow-hidden relative">
           <div className={`p-4 bg-[#111114] border-2 rounded-2xl flex items-center justify-between shrink-0 shadow-2xl ${isIntense ? 'border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.1)]' : 'border-[#27272a]'}`}>
              <div className="relative">
                 <p className="text-[8px] font-black text-[#52525b] uppercase tracking-[0.3em] mb-1 italic">MISSION PARAMETER</p>
                 <span className="text-xl lg:text-4xl font-black tracking-[0.4em] uppercase text-white font-mono break-all drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{gameState === 'STARTING' ? `SYNC ${countdown}` : getWordDisplay()}</span>
              </div>
              <div className={`w-14 h-14 lg:w-20 lg:h-20 rounded-2xl border-4 flex items-center justify-center transition-all ${isIntense ? 'border-rose-500 bg-rose-500/10 animate-pulse' : 'border-[#27272a] bg-[#09090b]'}`}>
                 <span className={`text-xl lg:text-3xl font-mono font-black ${isIntense ? 'text-rose-500' : 'text-white'}`}>{timer}</span>
              </div>
           </div>

           <div className="flex-1 relative bg-[#09090b] rounded-3xl overflow-hidden border-2 border-[#27272a] min-h-[360px] lg:min-h-0 shadow-inner">
              <AnimatePresence>
                {gameState === 'LOBBY' && <LobbyOverlay players={players} maxPlayers={roomSettings.maxPlayers} roomId={actualRoomId} />}
                {gameState === 'LEADERBOARD' && <ResultOverlay players={players} onHub={() => navigate('/')} />}
              </AnimatePresence>
              {wordOptions.length > 0 && isDrawer && <WordChooser options={wordOptions} onSelect={handleSelectWord} countdown={choosingCountdown} />}
              <Canvas roomId={actualRoomId} user={user} isDrawer={isDrawer} gameState={gameState} />
           </div>
        </div>

        {/* Tactical Feed */}
        <div className="flex w-full lg:w-80 flex-col bg-[#111114] border border-[#27272a] rounded-3xl shadow-2xl h-[180px] lg:h-full shrink-0 overflow-hidden relative">
           <div className="hidden lg:flex p-4 border-b border-[#27272a] items-center gap-2 bg-[#18181b]">
              <MessageSquare size={14} className="text-indigo-400" />
              <h3 className="text-[10px] font-black uppercase text-[#a1a1aa] tracking-[0.2em]">Data Feed</h3>
           </div>
           
           <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {chat?.map((m, i) => {
                  const isSys = m.isSystem;
                  const type = m.systemType;
                  return (
                    <motion.div 
                      key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} 
                      className={`text-[10px] lg:text-xs p-3 rounded-2xl border leading-relaxed ${
                        isSys && type === 'CORRECT' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold scale-105' :
                        isSys && type === 'GUESS' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 font-black italic' :
                        isSys && type === 'WARN' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                        isSys ? 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 text-center text-[9px] uppercase tracking-widest' :
                        'bg-[#1e1e24] border-zinc-800/50 text-zinc-300'
                    }`}>
                      {!isSys && <span className="font-black text-indigo-400 mr-2 uppercase tracking-tighter shadow-sm">{m.user?.username || m.user}:</span>}
                      {m.message}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
              <div ref={chatEndRef} />
           </div>
           
           <form onSubmit={handleSendMessage} className="p-3 bg-[#18181b] border-t border-[#27272a] shrink-0">
              <div className="flex gap-2">
                 <input 
                    type="text" value={message} onChange={e => setMessage(e.target.value)} 
                    placeholder={isDrawer ? "Observe & Draw..." : "TRANSMIT DATA..."} 
                    disabled={iAmCorrect || isDrawer || gameState === 'LEADERBOARD'} 
                    className="flex-1 bg-[#09090b] border-2 border-zinc-800 hover:border-zinc-700 rounded-2xl px-5 py-2.5 text-[10px] font-black uppercase focus:outline-none focus:border-indigo-500/50 transition-all tracking-[0.1em]" 
                 />
                 <motion.button whileTap={{ scale: 0.9 }} type="submit" className="p-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl lg:hidden text-white shadow-lg"><Zap size={16} /></motion.button>
              </div>
           </form>
        </div>
      </div>
    </div>
  );
};

const PlayerCard = ({ p, isMe, isThisDrawer, guessed }) => (
  <motion.div whileHover={{ x: 5 }} className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${isMe ? 'bg-indigo-600/10 border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.1)]' : guessed ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-[#18181b] border-[#27272a]'}`}>
    <div className={`relative w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${isMe ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-zinc-800 text-zinc-500'}`}>
       {p.username?.charAt(0).toUpperCase()}
       {isThisDrawer && <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-[#111114]" />}
    </div>
    <div className="flex-1 min-w-0">
       <p className={`text-xs font-black truncate uppercase ${guessed ? 'text-emerald-400' : 'text-zinc-300'}`}>{p.username}</p>
       <div className="w-full bg-[#09090b] h-1.5 rounded-full mt-1.5 overflow-hidden border border-zinc-800/30">
          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((p.score / 5000) * 100, 100)}%` }} transition={{ duration: 1 }} className={`h-full ${guessed ? 'bg-emerald-500' : 'bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.5)]'}`} />
       </div>
    </div>
    <span className="text-[10px] font-mono text-indigo-400 font-bold bg-[#09090b] px-2 py-1 rounded-lg border border-indigo-500/20">{p.score}</span>
  </motion.div>
);

export default Game;
