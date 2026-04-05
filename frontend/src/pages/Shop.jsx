import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, LayoutGrid, Zap, Shield, Wand2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { updateUser } from '../store/slices/authSlice';
import api from '../services/api';

const Shop = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    
    const items = [
        { id: 1, name: 'Neon Trail', price: 500, type: 'INK', description: 'Your lines emit high-intensity photons.', color: 'from-cyan-400 to-blue-500' },
        { id: 2, name: 'Static Shield', price: 1200, type: 'DEFENSE', description: 'Prevents players from seeing your hints.', color: 'from-indigo-500 to-purple-600' },
        { id: 3, name: 'Glitch Ink', price: 1500, type: 'INK', description: 'Strokes that fragment and strobe.', color: 'from-emerald-400 to-teal-500' },
        { id: 4, name: 'Solar Flare', price: 2000, type: 'AURA', description: 'Radiate energy that glows around your brush.', color: 'from-orange-500 to-rose-600' },
        { id: 5, name: 'Void Eraser', price: 800, type: 'TOOL', description: 'Instantly vaporize specific strokes.', color: 'from-rose-500 to-pink-600' },
        { id: 6, name: 'Digital Ghost', price: 3000, type: 'AVATAR', description: 'Become an untraceable phantom of the web.', color: 'from-violet-600 to-fuchsia-700' },
        { id: 7, name: 'Golden Brush', price: 5000, type: 'ELITE', description: 'A premium golden stroke for the elites.', color: 'from-amber-400 to-orange-500' },
        { id: 8, name: 'Shadow Protocol', price: 4500, type: 'BANNED', description: 'Unauthorized stealth ink used by hackers.', color: 'from-zinc-700 to-black' },
    ];

    const handleBuy = async (item) => {
        try {
            const response = await api.post('shop/buy', {
                userId: user?.id,
                itemName: item.name,
                price: item.price
            });
            dispatch(updateUser(response.data.user));
            alert(response.data.message);
        } catch (err) {
            alert(err.response?.data?.error || 'Transaction Failed');
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-white p-10 font-sans">
            <header className="max-w-6xl mx-auto flex items-center justify-between mb-20">
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate('/')} className="p-3 bg-[#18181b] border border-[#27272a] rounded-xl hover:bg-[#27272a] transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-4xl font-black tracking-tight uppercase italic text-indigo-500">Ink Store</h2>
                    </div>
                </div>
                
                <div className="bg-[#18181b] border border-[#27272a] rounded-2xl px-6 py-3 flex items-center gap-3">
                    <Zap size={18} className="text-amber-400" />
                    <span className="font-mono font-black text-xl">{user?.coins || 0} IC</span>
                </div>
            </header>

            <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {items.map((item) => {
                    const isEquipped = user?.activeGear === item.name;
                    return (
                        <motion.div 
                            key={item.id}
                            whileHover={{ y: -10 }}
                            className={`bg-[#18181b] border ${isEquipped ? 'border-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.15)]' : 'border-[#27272a]'} rounded-[2rem] p-6 flex flex-col group relative overflow-hidden`}
                        >
                            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${item.color} opacity-5 blur-3xl`} />
                            <div className="mb-6 flex items-center justify-between relative z-10">
                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isEquipped ? 'text-indigo-400' : 'text-[#52525b]'}`}>
                                    {isEquipped ? 'EQUIPPED' : item.type}
                                </span>
                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                                    {item.id === 1 && <Wand2 size={24} />}
                                    {item.id === 2 && <Shield size={24} />}
                                    {item.id === 3 && <Zap size={24} />}
                                    {item.id === 4 && <Shield size={24} />}
                                    {item.id === 5 && <Zap size={24} />}
                                    {item.id === 6 && <Shield size={24} />}
                                    {item.id === 7 && <LayoutGrid size={24} />}
                                    {item.id === 8 && <Shield size={24} />}
                                </div>
                            </div>
                            
                            <h3 className="text-xl font-black mb-2 relative z-10">{item.name}</h3>
                            <p className="text-sm font-medium text-[#71717a] mb-8 relative z-10">{item.description}</p>
                            
                            <button 
                                onClick={() => handleBuy(item)}
                                disabled={isEquipped}
                                className={`w-full ${isEquipped ? 'bg-indigo-600 text-white' : 'bg-[#09090b] border border-[#27272a] group-hover:bg-white group-hover:text-black'} transition-all py-4 rounded-2xl font-black text-xs uppercase tracking-widest mt-auto relative z-10 flex items-center justify-center gap-2`}
                            >
                                {isEquipped ? 'Active' : `${item.price} IC`}
                            </button>
                        </motion.div>
                    );
                })}
            </main>
        </div>
    );
};

export default Shop;
