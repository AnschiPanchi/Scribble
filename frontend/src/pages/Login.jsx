import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, registerUser, googleLogin, clearError } from '../store/slices/authSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, User as UserIcon, Lock, AtSign, ArrowRight } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    
    const dispatch = useDispatch();
    const { loading, error, registrationSuccess } = useSelector((state) => state.auth);

    useEffect(() => {
        dispatch(clearError());
    }, [isRegister, dispatch]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isRegister) {
            dispatch(registerUser({ username, email, password }));
        } else {
            dispatch(loginUser({ email, password }));
        }
    };

    const handleGoogleSuccess = (credentialResponse) => {
        dispatch(googleLogin(credentialResponse.credential));
    };

    return (
        <div className="flex items-center justify-center min-h-screen px-4 bg-[#09090b] relative overflow-hidden">
            {/* Tactical Grid Background Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />
            
            <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="w-full max-w-md p-8 bg-[#18181b] border border-[#27272a] rounded-[1.25rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl relative z-10"
            >
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                         <ShieldCheck size={24} />
                    </div>
                    <h1 className="text-3xl font-black tracking-[-0.04em] text-white uppercase italic">
                        Scribble<span className="text-indigo-500 font-black">X</span>
                    </h1>
                    <p className="mt-2 text-xs font-black tracking-widest text-[#52525b] uppercase">Sign In to continue</p>
                </div>

                {registrationSuccess && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-black text-emerald-400 text-center uppercase tracking-widest"
                    >
                        Account created! Access key sent to email.
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <AnimatePresence mode="wait">
                        {isRegister && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }} 
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <label className="block mb-2 text-[10px] font-black uppercase tracking-widest text-[#71717a]">Username</label>
                                <div className="relative group">
                                    <UserIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3f3f46] group-focus-within:text-indigo-400 transition-colors" />
                                    <input 
                                        type="text" 
                                        value={username} 
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-[#09090b] border border-[#27272a] rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all text-sm font-medium"
                                        placeholder="Enter your username"
                                        required
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div>
                        <label className="block mb-2 text-[10px] font-black uppercase tracking-widest text-[#71717a]">Email</label>
                        <div className="relative group">
                            <AtSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3f3f46] group-focus-within:text-indigo-400 transition-colors" />
                            <input 
                                type="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-[#09090b] border border-[#27272a] rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all text-sm font-medium"
                                placeholder="operator@scribble-x.net"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block mb-2 text-[10px] font-black uppercase tracking-widest text-[#71717a]">Password</label>
                        <div className="relative group">
                            <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3f3f46] group-focus-within:text-indigo-400 transition-colors" />
                            <input 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-[#09090b] border border-[#27272a] rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all text-sm font-medium"
                                placeholder="••••••••••••"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[10px] font-black text-rose-500 text-center uppercase tracking-widest">
                            {error.error || 'Access Denied'}
                        </div>
                    )}

                    <motion.button 
                        type="submit" 
                        disabled={loading}
                        whileHover={{ backgroundColor: '#4f46e5' }}
                        whileTap={{ scale: 0.96 }}
                        className="w-full py-4 mt-2 font-black text-xs uppercase tracking-widest text-white bg-indigo-600 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.2)] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? 'Processing Mission...' : (
                            <>
                                {isRegister ? 'Create Account' : 'Sign In'}
                                <ArrowRight size={14} />
                            </>
                        )}
                    </motion.button>
                </form>

                <div className="my-6 flex items-center gap-4">
                    <div className="h-[1px] flex-1 bg-[#27272a]" />
                    <span className="text-[10px] font-bold text-[#3f3f46]">SECURE SSO</span>
                    <div className="h-[1px] flex-1 bg-[#27272a]" />
                </div>

                <div className="flex flex-col items-center gap-4">
                    <GoogleLogin 
                        onSuccess={handleGoogleSuccess} 
                        onError={() => dispatch({ type: 'auth/error', payload: 'Google Login Failed' })}
                        theme="filled_black"
                        shape="pill"
                        width="100%"
                    />
                    
                    <p className="mt-4 text-[11px] text-center text-[#52525b] font-medium tracking-tight">
                        {isRegister ? 'ALREADY A MEMBER?' : 'NOT A MEMBER YET?'}
                        <button 
                            onClick={() => setIsRegister(!isRegister)}
                            className="ml-2 font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest"
                        >
                            {isRegister ? 'Switch to Login' : 'Sign Up Free'}
                        </button>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
