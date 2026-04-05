import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, Loader2, ArrowRight } from 'lucide-react';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('');
    const verificationRef = React.useRef(false);

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setStatus('error');
            setMessage('No tactical token detected.');
            return;
        }

        if (verificationRef.current) return;
        verificationRef.current = true;

        const verify = async () => {
            try {
                const { data } = await api.get(`auth/verify-email?token=${token}`);
                setStatus('success');
                setMessage(data.message);
            } catch (err) {
                setStatus('error');
                setMessage(err.response?.data?.error || 'Verification server timeout.');
            }
        };

        verify();
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 text-white font-sans">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-[#18181b] border border-[#27272a] p-10 rounded-[2.5rem] text-center shadow-2xl"
            >
                {status === 'verifying' && (
                    <div className="flex flex-col items-center gap-6">
                        <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter">Initializing Identity</h2>
                        <p className="text-[#a1a1aa] text-sm">Validating tactical access token...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] flex items-center justify-center text-emerald-400">
                            <ShieldCheck size={40} />
                        </div>
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter">Access <span className="text-emerald-500">Authorized</span></h2>
                        <p className="text-[#a1a1aa] text-sm leading-relaxed">{message}</p>
                        <button 
                            onClick={() => navigate('/login')}
                            className="mt-6 w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all"
                        >
                            Return to Login <ArrowRight size={16} />
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] flex items-center justify-center text-rose-400">
                            <ShieldAlert size={40} />
                        </div>
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-rose-500 underline decoration-rose-500/30">Protocol Breach</h2>
                        <p className="text-[#a1a1aa] text-sm leading-relaxed">{message}</p>
                        <button 
                            onClick={() => navigate('/login')}
                            className="mt-6 w-full bg-[#09090b] border border-[#27272a] text-[#71717a] hover:text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
                        >
                            Retry Registration
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default VerifyEmail;
