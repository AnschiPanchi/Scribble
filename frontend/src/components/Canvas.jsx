import React, { useRef, useEffect, useState, useMemo } from 'react';
import { socket } from '../socket';
import { motion } from 'framer-motion';

const Canvas = ({ roomId }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('brush'); // brush, eraser
  const [color, setColor] = useState('#60a5fa');
  const [brushSize, setBrushSize] = useState(5);
  
  // History for Undo/Redo
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const strokesRef = useRef([]); // Persistent store for Replay System

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    context.lineCap = 'round';
    context.lineJoin = 'round';

    socket.on('drawStroke', (data) => {
        const { x, y, lastX, lastY, tool: rTool, color: rColor, size: rSize } = data;
        const remoteContext = canvas.getContext('2d');
        remoteContext.beginPath();
        remoteContext.strokeStyle = rTool === 'eraser' ? '#1a1a2e' : rColor;
        remoteContext.lineWidth = rSize;
        remoteContext.moveTo(lastX, lastY);
        remoteContext.lineTo(x, y);
        remoteContext.stroke();
        // optionally also store remote strokes if needed for a global replay
    });

    socket.on('clearCanvas', () => clearLocalCanvas());

    return () => {
      socket.off('drawStroke');
      socket.off('clearCanvas');
    };
  }, []);

  const lastPos = useRef({ x: 0, y: 0 });

  const startDrawing = (e) => {
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    lastPos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.beginPath();
    context.strokeStyle = tool === 'eraser' ? '#1a1a2e' : color;
    context.lineWidth = brushSize;
    context.moveTo(lastPos.current.x, lastPos.current.y);
    context.lineTo(x, y);
    context.stroke();

    const currentStroke = { 
        x, y, 
        lastX: lastPos.current.x, 
        lastY: lastPos.current.y, 
        tool, color, size: brushSize,
        timestamp: Date.now()
    };
    
    strokesRef.current.push(currentStroke);

    socket.emit('drawStroke', {
      roomId,
      strokeData: currentStroke
    });

    lastPos.current = { x, y };
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    saveToHistory();
  };

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    const newStep = historyStep + 1;
    const newHistory = history.slice(0, newStep);
    newHistory.push(canvas.toDataURL());
    setHistory(newHistory);
    setHistoryStep(newStep);
  };


  const clearLocalCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleClear = () => {
    clearLocalCanvas();
    socket.emit('clearCanvas', roomId);
  };

  return (
    <div className="flex flex-col items-center select-none">
      {/* Toolbar */}
      <div className="w-full flex items-center justify-between p-4 mb-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md shadow-2xl">
        <div className="flex items-center space-x-6">
            <div className="flex items-center bg-black/40 rounded-xl p-1 gap-1">
                <button 
                  onClick={() => setTool('brush')}
                  className={`p-3 rounded-lg transition-all ${tool === 'brush' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                </button>
                <button 
                  onClick={() => setTool('eraser')}
                  className={`p-3 rounded-lg transition-all ${tool === 'eraser' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
            </div>

            <div className="flex items-center gap-2">
                {['#60a5fa', '#f87171', '#4ade80', '#fbbf24', '#ffffff'].map(c => (
                    <button 
                        key={c}
                        onClick={() => { setColor(c); setTool('brush'); }}
                        style={{ backgroundColor: c }}
                        className={`w-8 h-8 rounded-full border-2 transition-transform active:scale-90 ${color === c && tool === 'brush' ? 'border-white scale-110 shadow-lg shadow-white/20' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    />
                ))}
            </div>
        </div>

        <div className="flex items-center space-x-4">
            <div className="flex items-center gap-3 px-4 py-2 bg-black/20 rounded-xl border border-white/5">
                <input 
                    type="range" 
                    min="1" max="50" 
                    value={brushSize} 
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-32 accent-blue-500 cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-400 w-4">{brushSize}</span>
            </div>
            <button 
                onClick={handleClear}
                className="px-6 py-2 bg-white/5 hover:bg-rose-500/20 text-xs font-bold text-slate-400 hover:text-rose-400 rounded-xl border border-white/5 transition-all shadow-xl active:scale-95"
            >
                ERASE ARENA
            </button>
        </div>
      </div>

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-15 group-hover:opacity-20 transition duration-1000"></div>
        <canvas 
          ref={canvasRef}
          width={900}
          height={600}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          className="relative bg-[#1a1a2e] block rounded-2xl border border-white/10 shadow-inner cursor-crosshair"
        />
      </div>
    </div>
  );
};

export default Canvas;
