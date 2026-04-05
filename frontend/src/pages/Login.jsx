import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../store/slices/authSlice';
import { motion } from 'framer-motion';

const Login = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    
    const dispatch = useDispatch();
    const { loading, error } = useSelector((state) => state.auth);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isRegister) {
            // we'll implement register action later if needed
            console.log('Registering...', { email, password, username });
        } else {
            dispatch(loginUser({ email, password }));
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen px-4 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md p-8 bg-[#1a2236] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl"
            >
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
                        SCRIBBLE-X
                    </h1>
                    <p className="mt-2 text-sm text-slate-400">Join the ultimate artistic battleground</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegister && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}>
                            <label className="block mb-1 text-sm font-medium text-slate-300">Username</label>
                            <input 
                                type="text" 
                                value={username} 
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 bg-[#0f172a] border border-white/5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all block"
                                placeholder="Enter your display name"
                                required
                            />
                        </motion.div>
                    )}

                    <div>
                        <label className="block mb-1 text-sm font-medium text-slate-300">Email Address</label>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-[#0f172a] border border-white/5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all block"
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block mb-1 text-sm font-medium text-slate-300">Password</label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-[#0f172a] border border-white/5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all block"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <p className="text-xs text-rose-500 animate-pulse">{error.error || 'Authentication Failed'}</p>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-4 mt-4 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-500 active:scale-95 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : (isRegister ? 'Create Account' : 'Enter Arena')}
                    </button>
                </form>

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10"></span></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="px-2 bg-[#1a2236] text-slate-500">Or continue with</span></div>
                </div>

                <button 
                    type="button"
                    className="flex items-center justify-center w-full px-4 py-3 space-x-2 text-sm font-medium bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    <span>Google Identity</span>
                </button>

                <p className="mt-8 text-sm text-center text-slate-400">
                    {isRegister ? 'Already an artist?' : 'New to the battleground?'}
                    <button 
                        onClick={() => setIsRegister(!isRegister)}
                        className="ml-2 font-bold text-blue-400 hover:text-blue-300 transition-colors underline decoration-blue-500/30"
                    >
                        {isRegister ? 'Sign In' : 'Sign Up Free'}
                    </button>
                </p>
            </motion.div>
        </div>
    );
};

export default Login;
