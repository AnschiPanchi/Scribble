import React, { useEffect, useState, useRef } from 'react';
import { Paintbrush, Eraser, Trash2 } from 'lucide-react';
import { socket } from '../socket';

const Canvas = ({ roomId, user, isDrawer, gameState }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#6366f1');
  const [tool, setTool] = useState('brush');
  const [brushSize, setBrushSize] = useState(6);
  const lastPos = useRef({ x: 0, y: 0 });

  const canDraw = isDrawer && gameState === 'DRAWING';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const drawLine = (x1, y1, x2, y2, sTool, sColor, sSize) => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.strokeStyle = sTool === 'eraser' ? '#ffffff' : sColor;
      ctx.lineWidth = sSize;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.closePath();
    };

    const handleSocketStroke = (data) => {
      const { x, y, lastX, lastY, tool: sTool, color: sColor, size: sSize } = data;
      drawLine(lastX, lastY, x, y, sTool, sColor, sSize);
    };

    const handleClear = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); };
    const handleCatchUp = (e) => { e.detail.forEach(s => handleSocketStroke(s)); };

    socket.on('drawStroke', handleSocketStroke);
    socket.on('clearCanvas', handleClear);
    window.addEventListener('clearCanvas', handleClear);
    window.addEventListener('canvasCatchUp', handleCatchUp);
    
    const onLocal = (e) => {
       const { x, y, lastX, lastY, tool: sT, color: sC, size: sS } = e.detail;
       drawLine(lastX, lastY, x, y, sT, sC, sS);
    };
    window.addEventListener('localDraw', onLocal);

    return () => {
      socket.off('drawStroke', handleSocketStroke);
      socket.off('clearCanvas', handleClear);
      window.removeEventListener('clearCanvas', handleClear);
      window.removeEventListener('canvasCatchUp', handleCatchUp);
      window.removeEventListener('localDraw', onLocal);
    };
  }, [roomId]);

  const getCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDrawing = (e) => {
    if (!canDraw) return;
    setIsDrawing(true);
    const { x, y } = getCoords(e);
    lastPos.current = { x, y };
  };

  const draw = (e) => {
    if (!isDrawing || !canDraw) return;
    const { x, y } = getCoords(e);
    if (Math.abs(x - lastPos.current.x) < 0.1 && Math.abs(y - lastPos.current.y) < 0.1) return;

    const drawData = { 
        x, y, 
        lastX: lastPos.current.x, 
        lastY: lastPos.current.y, 
        tool, color: tool === 'eraser' ? '#ffffff' : color, 
        size: brushSize
    };

    window.dispatchEvent(new CustomEvent('localDraw', { detail: drawData }));
    socket.emit('drawStroke', { roomId, strokeData: drawData });
    lastPos.current = { x, y };
  };

  return (
    <div className="w-full h-full bg-transparent flex flex-col lg:flex-row p-1 lg:p-4 gap-1 lg:gap-4 select-none">
      
      {/* Tools Sidebar (Desktop Only) */}
      {canDraw && (
        <div className="hidden lg:flex flex-col gap-2 p-2 bg-[#09090b] rounded-2xl border border-[#27272a] shrink-0">
          <ToolBtn active={tool === 'brush'} onClick={() => setTool('brush')} icon={<Paintbrush size={18}/>} />
          <ToolBtn active={tool === 'eraser'} onClick={() => setTool('eraser')} icon={<Eraser size={18}/>} />
          <div className="h-px bg-[#27272a] my-2" />
          <button onClick={() => socket.emit('clearCanvas', roomId)} className="p-4 rounded-xl text-rose-500 hover:bg-rose-500/10"><Trash2 size={18}/></button>
          <div className="flex-1" />
          <div className="grid grid-cols-2 gap-2">
            {['#6366f1','#f43f5e','#10b981','#f59e0b','#ffffff','#0ea5e9','#a855f7','#000000'].map(c => (
              <button key={c} onClick={() => { setColor(c); setTool('brush'); }} style={{ backgroundColor: c }} className={`p-3 rounded-lg border-2 transition-all ${color === c && tool === 'brush' ? 'border-white scale-110 shadow-lg' : 'border-black opacity-80'}`} />
            ))}
          </div>
        </div>
      )}

      {/* Main Arena Area */}
      <div className="flex-1 flex flex-col gap-1 min-h-0 min-w-0">
         
         {/* COMPACT Mobile Toolbar (Optimized for Height) */}
         {canDraw && (
           <div className="lg:hidden flex flex-col gap-1.5 p-1 bg-[#09090b] border border-[#27272a] rounded-xl shrink-0 shadow-lg">
              <div className="flex items-center gap-2">
                 <div className="flex bg-[#18181b] rounded-lg p-0.5 border border-[#27272a]">
                    <MiniToolBtn active={tool === 'brush'} onClick={() => setTool('brush')} icon={<Paintbrush size={14}/>} />
                    <MiniToolBtn active={tool === 'eraser'} onClick={() => setTool('eraser')} icon={<Eraser size={14}/>} />
                 </div>
                 <button onClick={() => socket.emit('clearCanvas', roomId)} className="p-2 text-rose-500 hover:text-rose-400 transition-colors"><Trash2 size={14}/></button>
                 <div className="flex-1 flex items-center bg-[#18181b] px-3 rounded-lg border border-[#27272a] h-8">
                   <input type="range" min="1" max="50" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value))} className="w-full accent-indigo-500" />
                   <span className="text-[9px] font-mono font-black text-indigo-400 ml-2 w-4">{brushSize}</span>
                </div>
              </div>
              <div className="flex gap-1 overflow-x-auto scrollbar-hide py-1">
                 {['#6366f1','#f43f5e','#10b981','#f59e0b','#ffffff','#0ea5e9','#a855f7','#000000','#fbbf24','#ec4899','#22c55e','#3b82f6'].map(c => (
                    <button key={c} onClick={() => { setColor(c); setTool('brush'); }} style={{ backgroundColor: c }} className={`w-8 h-8 rounded shrink-0 transition-all ${color === c && tool === 'brush' ? 'ring-2 ring-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'border-[#27272a] opacity-80'}`} />
                 ))}
              </div>
           </div>
         )}

         {/* Canvas Theater - MAXIMIZED */}
         <div className="flex-1 relative bg-white rounded-xl lg:rounded-3xl border-4 border-[#09090b] overflow-hidden shadow-2xl">
            <canvas
              ref={canvasRef}
              width={1200} height={700}
              onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={() => setIsDrawing(false)} onMouseLeave={() => setIsDrawing(false)}
              onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={() => setIsDrawing(false)}
              className={`block w-full h-full touch-none ${canDraw ? 'cursor-crosshair' : 'cursor-default'}`}
              style={{ background: '#ffffff' }}
            />
         </div>
      </div>

      {/* Desktop Weight Panel */}
      {canDraw && (
         <div className="hidden lg:flex flex-col items-center gap-4 p-4 bg-[#09090b] border border-[#27272a] rounded-2xl shrink-0">
            <span className="text-[10px] font-black uppercase text-[#3f3f46] [writing-mode:vertical-lr] rotate-180 tracking-[0.2em] font-mono italic">WEIGHT</span>
            <input type="range" min="1" max="50" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value))} className="h-40" style={{ writingMode: 'vertical-lr', direction: 'rtl' }} />
            <span className="text-xs font-mono text-indigo-400 font-black">{brushSize}</span>
         </div>
      )}
    </div>
  );
};

const ToolBtn = ({ active, onClick, icon }) => (
  <button
    onClick={onClick}
    className={`p-4 rounded-xl border transition-all ${active ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-[#18181b] border-[#27272a] text-zinc-500 hover:text-zinc-300'}`}
  >
    {icon}
  </button>
);

const MiniToolBtn = ({ active, onClick, icon }) => (
  <button
    onClick={onClick}
    className={`p-2 rounded-md transition-all ${active ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500'}`}
  >
    {icon}
  </button>
);

export default Canvas;
