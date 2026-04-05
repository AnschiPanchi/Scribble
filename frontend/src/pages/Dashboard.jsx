import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout, updateUser } from '../store/slices/authSlice';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ShoppingCart, Play, Plus, LogOut,
  Globe, Lock, X, Zap, Users, Clock, RefreshCw, BookOpen,
  Target, Copy, ChevronRight, User as UserIcon, Camera
} from 'lucide-react';

// ─── Settings option row (like scribble.io) ──────────────────────────────────
const SettingRow = ({ icon, label, options, value, onChange }) => (
  <div className="flex items-center gap-4 py-3 border-b border-[#27272a]/60 last:border-0">
    <div className="flex items-center gap-2 w-36 shrink-0">
      <span className="text-[#52525b]">{icon}</span>
      <span className="text-[10px] font-black text-[#71717a] uppercase tracking-widest">{label}</span>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <motion.button
          key={opt.value}
          whileTap={{ scale: 0.93 }}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border ${
            value === opt.value
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
              : 'bg-[#09090b] text-[#71717a] border-[#27272a] hover:border-[#3f3f46] hover:text-white'
          }`}
        >
          {opt.label}
        </motion.button>
      ))}
    </div>
  </div>
);

const DEFAULT_SETTINGS = {
  maxPlayers: 8,
  drawTime: 80,
  maxRounds: 5,
  wordCount: 3,
  difficulty: 'MIXED',
};

const Dashboard = () => {
    const { user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [showLobbyModal, setShowLobbyModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [selectedMode, setSelectedMode] = useState(null); // 'public' | 'private'
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [roomCode, setRoomCode] = useState('');
    const [showPrivateCode, setShowPrivateCode] = useState(false);
    const [privateCode, setPrivateCode] = useState('');
    const [privateRoomId, setPrivateRoomId] = useState('');

    const [newUsername, setNewUsername] = useState(user?.username || '');
    const [newAvatar, setNewAvatar] = useState(user?.avatar || '');

    const setSetting = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));

    const buildQuery = (s) =>
      `?maxPlayers=${s.maxPlayers}&drawTime=${s.drawTime}&maxRounds=${s.maxRounds}&wordCount=${s.wordCount}&difficulty=${s.difficulty}`;

    const handleLaunch = () => {
      if (!selectedMode) return;
      const qs = buildQuery(settings);
      if (selectedMode === 'public') {
        setShowLobbyModal(false);
        navigate(`/arena/match-lobby${qs}`);
      } else {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const id = `private-${code}`;
        setShowLobbyModal(false);
        setPrivateCode(code);
        setPrivateRoomId(`${id}${qs}`);
        setShowPrivateCode(true);
      }
    };

    const handleJoinWithCode = () => {
      const code = roomCode.trim().toUpperCase();
      if (!code) return;
      navigate(`/arena/private-${code}`);
    };

    const openModal = () => {
      setSelectedMode(null);
      setSettings(DEFAULT_SETTINGS);
      setShowLobbyModal(true);
    };

    const handleUpdateProfile = async () => {
      try {
        const res = await api.put('auth/profile', { username: newUsername, avatar: newAvatar });
        dispatch(updateUser(res.data.user));
        setShowProfileModal(false);
        alert(res.data.message);
      } catch (err) {
        alert(err.response?.data?.error || 'Update failed');
      }
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-[#fafafa] p-6 lg:p-10 font-sans selection:bg-indigo-500/30">

            {/* Header */}
            <header className="max-w-7xl mx-auto flex items-center justify-between mb-12">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black italic text-xl shadow-[0_0_20px_rgba(79,70,229,0.3)]">S</div>
                    <h1 className="text-2xl font-black tracking-[-0.04em] uppercase italic">Scribble<span className="text-indigo-500">X</span></h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-[#18181b] border border-[#27272a] rounded-full px-4 py-2 flex items-center gap-2">
                        <span className="text-amber-400 text-sm">🪙</span>
                        <span className="text-sm font-black font-mono">{user?.coins || 0} IC</span>
                    </div>
                    <button onClick={() => dispatch(logout())} className="p-2 text-[#52525b] hover:text-white transition-colors">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* ─── Private code reveal modal ──────────────────────────────── */}
            <AnimatePresence>
              {showPrivateCode && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#09090b]/80 backdrop-blur-md"
                >
                  <motion.div
                    initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
                    className="w-full max-w-md bg-[#18181b] border border-[#27272a] rounded-[2.5rem] p-10 text-center relative shadow-2xl"
                  >
                    <button onClick={() => setShowPrivateCode(false)} className="absolute top-6 right-6 p-2 text-[#52525b] hover:text-white">
                      <X size={20} />
                    </button>
                    <Lock size={32} className="text-indigo-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-2">Private <span className="text-indigo-500">Hub Created</span></h2>
                    <p className="text-xs text-[#71717a] mb-8">Share this code with your crew. They enter it in the lobby.</p>
                    <div className="flex items-center gap-3 bg-[#09090b] border border-indigo-500/40 rounded-2xl px-6 py-5 mb-2">
                      <span className="flex-1 text-4xl font-black font-mono tracking-[0.4em] text-indigo-300">{privateCode}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(privateCode)}
                        className="p-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all"
                      ><Copy size={16} /></button>
                    </div>
                    <p className="text-[10px] text-[#3f3f46] mb-8 font-mono">Code expires when arena closes.</p>
                    <button
                      onClick={() => { setShowPrivateCode(false); navigate(`/arena/${privateRoomId}`); }}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all"
                    >Enter Arena →</button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── Configure Mission Modal ─────────────────────────────────── */}
            <AnimatePresence>
              {showLobbyModal && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#09090b]/85 backdrop-blur-md"
                >
                  <motion.div
                    initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
                    className="w-full max-w-2xl bg-[#18181b] border border-[#27272a] rounded-[2.5rem] shadow-2xl overflow-hidden"
                  >
                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-8 pt-8 pb-6 border-b border-[#27272a]">
                      <div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter">Configure <span className="text-indigo-500">Mission</span></h2>
                        <p className="text-[10px] text-[#52525b] uppercase tracking-widest font-black mt-1">Select mode + tune settings</p>
                      </div>
                      <button onClick={() => setShowLobbyModal(false)} className="p-2 text-[#52525b] hover:text-white transition-colors">
                        <X size={22} />
                      </button>
                    </div>

                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">

                      {/* Mode Selection */}
                      <div className="grid grid-cols-2 gap-4">
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setSelectedMode('public')}
                          className={`p-6 rounded-2xl border text-left flex flex-col gap-3 transition-all ${
                            selectedMode === 'public'
                              ? 'bg-emerald-500/10 border-emerald-500/40'
                              : 'bg-[#09090b] border-[#27272a] hover:border-emerald-500/30'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedMode === 'public' ? 'bg-emerald-500 text-black' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            <Globe size={20} />
                          </div>
                          <div>
                            <p className="font-black text-sm">Public Arena</p>
                            <p className="text-[10px] text-[#71717a] mt-0.5">Match with global operators</p>
                          </div>
                          {selectedMode === 'public' && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400" />}
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setSelectedMode('private')}
                          className={`p-6 rounded-2xl border text-left flex flex-col gap-3 transition-all relative ${
                            selectedMode === 'private'
                              ? 'bg-rose-500/10 border-rose-500/40'
                              : 'bg-[#09090b] border-[#27272a] hover:border-rose-500/30'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedMode === 'private' ? 'bg-rose-500 text-white' : 'bg-rose-500/10 text-rose-400'}`}>
                            <Lock size={20} />
                          </div>
                          <div>
                            <p className="font-black text-sm">Private Hub</p>
                            <p className="text-[10px] text-[#71717a] mt-0.5">Invite-only with a code</p>
                          </div>
                          {selectedMode === 'private' && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-rose-400" />}
                        </motion.button>
                      </div>

                      {/* Game Settings */}
                      <div className="bg-[#09090b] border border-[#27272a] rounded-2xl px-6 py-2">
                        <p className="text-[9px] font-black text-[#3f3f46] uppercase tracking-[0.25em] pt-4 pb-2">Game Settings</p>

                        <SettingRow
                          icon={<Users size={13} />} label="Players"
                          value={settings.maxPlayers}
                          onChange={v => setSetting('maxPlayers', v)}
                          options={[2,3,4,5,6,8,10,12].map(n => ({ value: n, label: `${n}` }))}
                        />
                        <SettingRow
                          icon={<Clock size={13} />} label="Draw Time"
                          value={settings.drawTime}
                          onChange={v => setSetting('drawTime', v)}
                          options={[30,45,60,80,100,120,150,180].map(n => ({ value: n, label: `${n}s` }))}
                        />
                        <SettingRow
                          icon={<RefreshCw size={13} />} label="Rounds"
                          value={settings.maxRounds}
                          onChange={v => setSetting('maxRounds', v)}
                          options={[1,2,3,4,5,6,7,8,9,10].map(n => ({ value: n, label: `${n}` }))}
                        />
                        <SettingRow
                          icon={<BookOpen size={13} />} label="Word Count"
                          value={settings.wordCount}
                          onChange={v => setSetting('wordCount', v)}
                          options={[1,2,3,4,5].map(n => ({ value: n, label: `${n}` }))}
                        />
                        <SettingRow
                          icon={<Target size={13} />} label="Difficulty"
                          value={settings.difficulty}
                          onChange={v => setSetting('difficulty', v)}
                          options={[
                            { value: 'MIXED',  label: 'Mixed' },
                            { value: 'EASY',   label: 'Easy' },
                            { value: 'MEDIUM', label: 'Medium' },
                            { value: 'HARD',   label: 'Hard' },
                          ]}
                        />
                      </div>

                      {/* Launch button */}
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleLaunch}
                        disabled={!selectedMode}
                        className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all ${
                          selectedMode
                            ? 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_10px_30px_rgba(79,70,229,0.25)]'
                            : 'bg-[#27272a] text-[#52525b] cursor-not-allowed'
                        }`}
                      >
                        {selectedMode ? <><Play size={16} fill="currentColor" /> Launch Mission</> : 'Select a Mode First'}
                      </motion.button>

                      {/* Join with code */}
                      <div className="relative pt-4 border-t border-[#27272a]">
                        <div className="absolute -top-3 left-6 px-3 bg-[#18181b] text-[9px] font-black text-[#3f3f46] uppercase tracking-widest">Join Existing Room</div>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === 'Enter' && handleJoinWithCode()}
                            placeholder="Enter room code..."
                            className="flex-1 bg-[#09090b] border border-[#27272a] rounded-xl px-5 py-3.5 text-sm font-mono font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-indigo-500/50"
                          />
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={handleJoinWithCode}
                            className="bg-indigo-600 hover:bg-indigo-500 px-5 rounded-xl transition-all"
                          ><ChevronRight size={22} /></motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── Profile Lockdown Modal ───────────────────────────────── */}
            <AnimatePresence>
              {showProfileModal && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#09090b]/85 backdrop-blur-md"
                >
                  <motion.div
                    initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
                    className="w-full max-w-md bg-[#18181b] border border-[#27272a] rounded-[2.5rem] p-10 shadow-2xl overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-8">
                       <h2 className="text-2xl font-black uppercase italic tracking-tighter">Profile <span className="text-indigo-500">Lockdown</span></h2>
                       <button onClick={() => setShowProfileModal(false)} className="p-2 text-[#52525b] hover:text-white transition-colors">
                        <X size={20} />
                       </button>
                    </div>

                    <div className="space-y-6">
                      <div className="flex justify-center mb-8">
                        <div className="relative group">
                          <div className="w-32 h-32 bg-zinc-900 rounded-[2.5rem] border-2 border-indigo-500/30 overflow-hidden">
                            <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${newAvatar}`} alt="Avatar" />
                          </div>
                          <button 
                            onClick={() => setNewAvatar(Math.random().toString(36).substring(7))}
                            className="absolute -bottom-2 -right-2 p-3 bg-indigo-600 rounded-2xl border-4 border-[#18181b] group-hover:scale-110 transition-transform"
                          >
                            <RefreshCw size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#52525b] uppercase tracking-widest pl-2">Callsign</label>
                        <input 
                          type="text"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          className="w-full bg-[#09090b] border border-[#27272a] rounded-2xl px-6 py-4 text-sm font-black tracking-widest outline-none focus:ring-1 focus:ring-indigo-500/50"
                          placeholder="OPERATOR NAME"
                        />
                      </div>

                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleUpdateProfile}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-[0_10px_30px_rgba(79,70,229,0.2)] mt-4"
                      >Save Identity Changes</motion.button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[140px]">

                {/* Profile */}
                <motion.div
                    whileHover={{ borderColor: '#6366f1' }}
                    onClick={() => {
                        setNewUsername(user?.username || '');
                        setNewAvatar(user?.avatar || '');
                        setShowProfileModal(true);
                    }}
                    className="md:col-span-4 md:row-span-2 bg-[#18181b] border border-[#27272a] rounded-[2rem] p-8 flex flex-col justify-between group transition-all cursor-pointer relative overflow-hidden"
                >
                    <div className="absolute top-4 right-4 p-2 bg-[#27272a] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={14} className="text-[#a1a1aa]" />
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-zinc-800 rounded-3xl border border-[#27272a] overflow-hidden group-hover:scale-105 transition-transform">
                             <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user?.avatar || user?.username}`} alt="Avatar" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight mb-1">{user?.username}</h2>
                            <p className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] font-mono">Rank {user?.rank || 1} Elite</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-[#52525b] border-t border-[#27272a] pt-6">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Gear</p>
                        <p className="text-xs font-black text-[#a1a1aa]">{user?.activeGear || 'Standard Ink'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Account</p>
                        <p className="text-xs font-black text-[#a1a1aa]">{user?.email?.split('@')[0]}</p>
                      </div>
                    </div>
                </motion.div>

                {/* Main Action Hub */}
                <motion.div className="md:col-span-8 md:row-span-3 bg-[#18181b] border border-[#27272a] rounded-[2.5rem] p-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                        <LayoutDashboard size={400} />
                    </div>
                    <div className="relative z-10 h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
                        <h2 className="text-5xl font-black tracking-tighter leading-tight mb-3 uppercase italic">TACTICAL <span className="text-indigo-500">OPERATIONS</span></h2>
                        <p className="text-xs text-[#52525b] font-black uppercase tracking-widest mb-10">Draw. Guess. Dominate.</p>
                        <div className="flex flex-col gap-4 w-full">
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={openModal}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-5 px-10 rounded-[1.5rem] font-black uppercase tracking-widest text-sm shadow-[0_20px_40px_rgba(79,70,229,0.2)] transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-3"
                            >
                                <Play size={18} fill="currentColor" />
                                Initiate Multiplayer Mode
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={() => navigate('/arena/test-solo-' + Math.random().toString(36).substring(7))}
                                className="w-full bg-[#09090b] border border-[#27272a] hover:border-amber-500/50 text-[#52525b] hover:text-white py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3"
                            >
                                <Zap size={14} className="text-amber-500" />
                                Solo Testing Loop (1 Player)
                            </motion.button>
                        </div>
                    </div>
                </motion.div>

                {/* Shop Tile */}
                <motion.div
                    whileHover={{ scale: 0.98 }}
                    onClick={() => navigate('/shop')}
                    className="md:col-span-4 md:row-span-1 bg-indigo-600 rounded-[2rem] p-6 flex items-center justify-between cursor-pointer shadow-[0_20px_40px_rgba(79,70,229,0.15)] group relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_70%)]" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3 bg-white/10 rounded-xl">
                            <ShoppingCart size={24} className="text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-white/60 uppercase tracking-widest">Ink Store</p>
                            <p className="text-lg font-black text-white leading-none mt-1">Armor &amp; Gears</p>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default Dashboard;
