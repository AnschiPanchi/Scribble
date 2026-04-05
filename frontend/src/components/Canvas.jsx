import React, { useRef, useEffect, useState, useCallback } from 'react';
import { socket } from '../socket';
import { motion } from 'framer-motion';
import { Paintbrush, Eraser, Trash2 } from 'lucide-react';

const Canvas = ({ roomId, user, isDrawer, gameState }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('brush');
  const [color, setColor] = useState('#6366f1');
  const [brushSize, setBrushSize] = useState(5);
  const lastPos = useRef({ x: 0, y: 0 });
  const points = useRef([]);

  const canDraw = isDrawer && gameState === 'DRAWING';

  // ── Remote stroke renderer (shared by socket + catch-up) ─────────────────
  const drawRemoteStroke = useCallback((data) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    
    let strokeColor = data.color || '#6366f1';
    if (data.gear === 'Golden Brush') strokeColor = '#fbbf24';
    if (data.gear === 'Shadow Protocol') strokeColor = '#18181b';

    ctx.strokeStyle = data.tool === 'eraser' ? '#09090b' : strokeColor;
    ctx.lineWidth = data.size || 5;

    // Gear Effects
    if (data.gear === 'Neon Trail') { ctx.shadowBlur = 15; ctx.shadowColor = strokeColor; }
    else if (data.gear === 'Solar Flare') { ctx.shadowBlur = 25; ctx.shadowColor = '#f59e0b'; }
    else if (data.gear === 'Golden Brush') { ctx.shadowBlur = 20; ctx.shadowColor = '#fbbf24'; }
    else { ctx.shadowBlur = 0; }

    if (data.gear === 'Glitch Ink' && Math.random() > 0.85) {
       ctx.strokeStyle = '#f43f5e'; // random glitch color
       ctx.lineWidth += 4;
    }

    ctx.moveTo(data.lastX, data.lastY);
    ctx.quadraticCurveTo(data.cpX, data.cpY, data.x, data.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, []);

  const clearLocalCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  // ── Socket & window events ────────────────────────────────────────────────
  useEffect(() => {
    const handleClear = () => clearLocalCanvas();
    const handleCatchUp = (e) => e.detail.forEach(drawRemoteStroke);

    socket.on('drawStroke', drawRemoteStroke);
    window.addEventListener('clearCanvas', handleClear);
    window.addEventListener('canvasCatchUp', handleCatchUp);

    return () => {
      socket.off('drawStroke', drawRemoteStroke);
      window.removeEventListener('clearCanvas', handleClear);
      window.removeEventListener('canvasCatchUp', handleCatchUp);
    };
  }, [drawRemoteStroke, clearLocalCanvas]);

  // ── Drawing logic ─────────────────────────────────────────────────────────
  const getCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    if (!canDraw) return;
    setIsDrawing(true);
    const pos = getCoords(e);
    lastPos.current = pos;
    points.current = [pos];
  };

  const draw = (e) => {
    if (!isDrawing || !canDraw) return;
    const pos = getCoords(e);
    const ctx = canvasRef.current.getContext('2d');
    points.current.push(pos);

    if (points.current.length > 2) {
      const last3 = points.current.slice(-3);
      const cpX = last3[1].x;
      const cpY = last3[1].y;
      const x = (last3[1].x + last3[2].x) / 2;
      const y = (last3[1].y + last3[2].y) / 2;

      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      let drawColor = color;
      if (user?.activeGear === 'Golden Brush') drawColor = '#fbbf24';
      if (user?.activeGear === 'Shadow Protocol') drawColor = '#18181b';

      ctx.strokeStyle = tool === 'eraser' ? '#09090b' : drawColor;
      ctx.lineWidth = brushSize;

      // Local Gear Effects
      if (user?.activeGear === 'Neon Trail' && tool !== 'eraser') {
        ctx.shadowBlur = 15; ctx.shadowColor = drawColor;
      } else if (user?.activeGear === 'Solar Flare' && tool !== 'eraser') {
        ctx.shadowBlur = 25; ctx.shadowColor = '#f59e0b';
      } else if (user?.activeGear === 'Golden Brush' && tool !== 'eraser') {
        ctx.shadowBlur = 20; ctx.shadowColor = '#fbbf24';
      } else { ctx.shadowBlur = 0; }

      if (user?.activeGear === 'Glitch Ink' && tool !== 'eraser' && Math.random() > 0.85) {
         ctx.strokeStyle = '#f43f5e';
         ctx.lineWidth += 4;
      }

      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.quadraticCurveTo(cpX, cpY, x, y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      socket.emit('drawStroke', {
        roomId,
        strokeData: { 
          x, y, cpX, cpY, 
          lastX: lastPos.current.x, 
          lastY: lastPos.current.y, 
          tool, color: drawColor, 
          size: brushSize,
          gear: user?.activeGear
        },
      });

      lastPos.current = { x, y };
    }
  };

  const stopDrawing = () => { setIsDrawing(false); points.current = []; };

  const handleClearClick = () => {
    clearLocalCanvas();
    socket.emit('clearCanvas', roomId);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex items-stretch gap-2 select-none w-full h-full">

      {/* Toolbar — only for drawer during DRAWING */}
      {canDraw && (
        <div className="flex flex-col gap-2 p-2 bg-[#18181b] border border-[#27272a] rounded-xl shadow-xl shrink-0">
          <ToolBtn active={tool === 'brush'} onClick={() => setTool('brush')} icon={<Paintbrush size={16}/>} />
          <ToolBtn active={tool === 'eraser'} onClick={() => setTool('eraser')} icon={<Eraser size={16}/>} />
          <div className="h-px bg-[#27272a] my-1" />
          <ToolBtn onClick={handleClearClick} icon={<Trash2 size={16} className="text-rose-500/80"/>} />
          <div className="h-px bg-[#27272a] my-1" />
          <div className="flex flex-col gap-1.5 p-0.5">
            {['#6366f1','#f43f5e','#10b981','#f59e0b','#ffffff','#0ea5e9','#a855f7','#000000'].map(c => (
              <button
                key={c}
                onClick={() => { setColor(c); setTool('brush'); }}
                style={{ backgroundColor: c }}
                className={`w-5 h-5 rounded border-2 transition-all hover:scale-110 ${color === c && tool === 'brush' ? 'border-white scale-110' : 'border-transparent opacity-70'}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          width={1200}
          height={700}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className={`bg-white block rounded-xl w-full h-full ${canDraw ? 'cursor-crosshair' : 'cursor-default'}`}
          style={{ background: '#fafafa' }}
        />
        {/* Not your turn overlay */}
        {!canDraw && gameState === 'DRAWING' && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
            <span className="px-4 py-1.5 bg-[#09090b]/70 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-widest text-[#71717a]">
              Guess the word! Type below →
            </span>
          </div>
        )}
      </div>

      {/* Brush size — only for drawer */}
      {canDraw && (
        <div className="flex flex-col items-center gap-3 p-3 bg-[#18181b] border border-[#27272a] rounded-xl shrink-0">
          <p className="text-[9px] text-[#52525b] uppercase font-black tracking-widest">Size</p>
          <input
            type="range"
            min="1" max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="h-28 accent-indigo-500 cursor-pointer"
            style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
          />
          <span className="text-[10px] font-mono text-indigo-400 font-black">{brushSize}</span>
        </div>
      )}
    </div>
  );
};

const ToolBtn = ({ active, onClick, icon }) => (
  <motion.button
    whileTap={{ scale: 0.93 }}
    onClick={onClick}
    className={`p-2.5 rounded-lg border transition-all ${active ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400' : 'bg-transparent border-transparent text-[#71717a] hover:text-white hover:bg-[#27272a]'}`}
  >
    {icon}
  </motion.button>
);

export default Canvas;
