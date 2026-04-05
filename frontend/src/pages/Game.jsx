import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { setGameState, updatePlayers, addChatMessage, setRoom } from '../store/slices/gameSlice';
import { socket } from '../socket';
import Canvas from '../components/Canvas';
import { motion, AnimatePresence } from 'framer-motion';

const Game = () => {
    const { user } = useSelector((state) => state.auth);
    const { gameState, players, chat } = useSelector((state) => state.game);
    const dispatch = useDispatch();
    const [message, setMessage] = useState('');
    const [timer, setTimer] = useState(0);
    const [currentWord, setCurrentWord] = useState('');
    const [drawer, setDrawer] = useState('');

    useEffect(() => {
        socket.connect();
        socket.emit('joinRoom', { roomId: 'dev-arena', user });
        dispatch(setRoom('dev-arena'));

        socket.on('updatePlayers', (data) => dispatch(updatePlayers(data)));
        socket.on('updateGameState', (data) => {
            if (typeof data === 'string') {
                dispatch(setGameState(data));
            } else {
                dispatch(setGameState(data.state));
                if (data.word) setCurrentWord(data.word);
                if (data.drawer) setDrawer(data.drawer);
            }
        });
        socket.on('updateTimer', (t) => setTimer(t));
        socket.on('chatMessage', (msg) => dispatch(addChatMessage(msg)));

        return () => {
            socket.off('updatePlayers');
            socket.off('updateGameState');
            socket.off('updateTimer');
            socket.off('chatMessage');
            socket.disconnect();
        };
    }, [user, dispatch]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (message.trim()) {
            socket.emit('submitGuess', { roomId: 'dev-arena', user, guess: message });
            setMessage('');
        }
    };


    return (
        <div className="flex h-screen bg-[#0f172a] overflow-hidden text-slate-200">
            {/* Sidebar - Players */}
            <div className="w-72 bg-[#1a2236] border-r border-white/5 flex flex-col">
                <div className="p-6 border-b border-white/5">
                    <h2 className="text-xl font-black tracking-tighter text-blue-400">ARENA-X</h2>
                    <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Live Players</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {players.map((p, i) => (
                        <motion.div 
                            key={p.socketId}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className={`flex items-center space-x-3 p-3 rounded-xl border transition-all ${p.email === user.email ? 'bg-blue-600/10 border-blue-500/20' : 'bg-white/5 border-white/5'}`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-lg ${p.email === user.email ? 'bg-blue-500' : 'bg-slate-700'}`}>
                                {p.username?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-white leading-none">{p.username}</p>
                                    {p.username === drawer && <span className="text-[9px] bg-amber-500/20 text-amber-500 px-1 rounded border border-amber-500/20 font-black">DRAWER</span>}
                                </div>
                                <p className="text-[10px] text-blue-400 font-mono tracking-tighter mt-1 uppercase">SCORE: {p.score.toLocaleString()}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
                <div className="p-4 border-t border-white/5">
                    <button 
                        onClick={() => dispatch(logout())}
                        className="w-full py-2 text-xs font-bold text-slate-500 hover:text-rose-400 transition-colors uppercase tracking-widest"
                    >
                        Escape Arena
                    </button>
                </div>
            </div>

            {/* Main Area - Canvas */}
            <main className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#0f172a] p-8">
                <div className="mb-6 flex items-center justify-between w-full max-w-4xl px-4">
                    <div className="flex items-center space-x-6">
                        <div className="px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-bold tracking-widest">
                            {gameState}
                        </div>
                        <div className="text-4xl font-black text-white tracking-[0.4em] uppercase">
                            {user.username === drawer ? currentWord : currentWord.split('').map(char => (char === ' ' ? ' ' : '_')).join('')}
                        </div>
                    </div>
                    <div className={`text-2xl font-black font-mono px-4 py-2 rounded-lg border transition-all ${timer <= 10 ? 'text-rose-500 bg-rose-500/10 border-rose-500/20 animate-pulse' : 'text-blue-400 bg-blue-500/10 border-blue-500/20'}`}>
                        0:{timer < 10 ? `0${timer}` : timer}
                    </div>
                </div>
                
                <Canvas roomId="dev-arena" />
            </main>

            {/* Right Sidebar - Chat */}
            <div className="w-80 bg-[#1a2236] border-l border-white/5 flex flex-col">
                <div className="p-6 border-b border-white/5 font-black text-xs uppercase tracking-widest text-slate-500">
                    Battle Feed
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm scrollbar-hide flex flex-col-reverse">
                    <div className="space-y-3">
                        {chat.map((msg, i) => (
                            <div key={i} className={`p-2 rounded-lg border transition-all ${msg.user.username === 'SERVER' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10 text-center text-xs font-bold' : 'bg-white/5 border-white/5'}`}>
                                <span className={`font-black uppercase text-[10px] mr-2 ${msg.user.username === 'SERVER' ? 'hidden' : 'text-blue-400'}`}>{msg.user.username}:</span>
                                <span className={msg.user.username === 'SERVER' ? '' : 'text-slate-300'}>{msg.message}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <form onSubmit={handleSendMessage} className="p-4 bg-[#0f172a]/50 border-t border-white/5">
                    <input 
                        type="text" 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={user.username === drawer ? "You are drawing..." : "Strike with a guess..."}
                        disabled={user.username === drawer}
                        className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50 text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    />
                </form>
            </div>

        </div>
    );
};

export default Game;
