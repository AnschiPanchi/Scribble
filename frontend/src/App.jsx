import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Login from './pages/Login';
import Game from './pages/Game';

function App() {
  const { user } = useSelector((state) => state.auth);

  return (
    <div className="w-full min-h-screen bg-[#0f172a] text-white">
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <Game /> : <Navigate to="/login" />} />
        {/* Wildcard to redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;
