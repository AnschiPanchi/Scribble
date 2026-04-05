import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Game from './pages/Game';
import Shop from './pages/Shop';
import VerifyEmail from './pages/VerifyEmail';

function App() {
  const { user } = useSelector((state) => state.auth);

  return (
    <div className="w-full min-h-screen bg-[#09090b] text-[#fafafa] selection:bg-indigo-500/30">
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        
        {/* Core Operations */}
        <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/arena/:roomId" element={user ? <Game /> : <Navigate to="/login" />} />
        <Route path="/shop" element={user ? <Shop /> : <Navigate to="/login" />} />
        
        {/* Wildcard to redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;
