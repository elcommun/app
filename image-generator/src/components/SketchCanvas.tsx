
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PenIcon, UndoIcon, TrashIcon, PhotoIcon, PaletteIcon } from './icons';

interface SketchCanvasProps {
  onChange: (imageDataUrl: string | null) => void;
  baseImageUrl?: string | null;
  initialImageData?: string | null;
}

const COLORS = ['#000000', '#FFFFFF', '#EF4444']; // Black, White, Red

export const SketchCanvas: React.FC<SketchCanvasProps> = ({ onChange, baseImageUrl, initialImageData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [currentColorIndex, setCurrentColorIndex] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const size = 300; // Fixed internal resolution
      canvas.width = size;
      canvas.height = size;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, size, size);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3;
        ctx.strokeStyle = COLORS[currentColorIndex];
        saveState();
      }
    }
  }, []);

  // Restore sketch when initialImageData changes
  useEffect(() => {
    if (initialImageData) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasContent(true);
        saveState();
      };
      img.src = initialImageData;
    }
  }, [initialImageData]);

  // Update stroke color when state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = COLORS[currentColorIndex];
      }
    }
  }, [currentColorIndex]);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        setHistory(prev => [...prev.slice(-10), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
      }
    }
  };

  const getCanvasData = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas && hasContent) {
      return canvas.toDataURL('image/jpeg');
    }
    return null;
  }, [hasContent]);

  const updateParent = useCallback(() => {
    onChange(getCanvasData());
  }, [getCanvasData, onChange]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsDrawing(true);
    setHasContent(true);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    
    // Handle scaling due to CSS width/height vs canvas internal resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left) * scaleX;
    const y = (('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top) * scaleY;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    e.preventDefault();
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left) * scaleX;
    const y = (('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveState();
      updateParent();
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHasContent(false);
        saveState();
        onChange(null);
      }
    }
  };

  const handleLoadBaseImage = () => {
    if (!baseImageUrl) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = baseImageUrl;
    img.crossOrigin = "anonymous";
    img.onload = () => {
        // Clear and draw image stretching to fit square canvas
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Reset color logic to ensure visible
        setHasContent(true);
        saveState();
        updateParent();
    };
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (canvas && history.length > 1) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const newHistory = [...history];
        newHistory.pop(); 
        const prevState = newHistory[newHistory.length - 1];
        ctx.putImageData(prevState, 0, 0);
        setHistory(newHistory);
        setHasContent(newHistory.length > 1);
        onChange(canvas.toDataURL('image/jpeg'));
      }
    }
  };

  const cycleColor = () => {
      setCurrentColorIndex((prev) => (prev + 1) % COLORS.length);
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">手書きスケッチ (補助)</h3>
      {/* Changed: Remove h-full/flex-grow, use aspect-square, resize-y, overflow-hidden */}
      <div className="relative w-full aspect-square resize-y overflow-hidden rounded-2xl bg-black/20 border border-white/10 group min-h-[200px]">
        <canvas
          ref={canvasRef}
          className="w-full h-full bg-white cursor-crosshair touch-none block"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        
        {/* Floating Toolbar */}
        <div className={`absolute top-3 right-3 flex gap-1 bg-black/80 backdrop-blur-md border border-white/10 p-1 rounded-xl shadow-lg transition-opacity duration-300 ${
            isDrawing ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100 pointer-events-auto'
        }`}>
          {baseImageUrl && (
            <>
                <button
                    onClick={handleLoadBaseImage}
                    className="p-2 text-slate-300 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                    title="ベース画像を背景に読み込む"
                >
                    <PhotoIcon className="w-4 h-4" />
                </button>
                <div className="w-[1px] bg-white/10 my-1"></div>
            </>
          )}

          <button
            onClick={cycleColor}
            className="p-2 rounded-lg transition-colors flex items-center justify-center"
            title="ペンの色を変更"
            style={{ color: COLORS[currentColorIndex] === '#000000' ? '#94a3b8' : COLORS[currentColorIndex] }}
          >
             {COLORS[currentColorIndex] === '#FFFFFF' ? (
                <div className="w-4 h-4 rounded-full border border-slate-400 bg-white shadow-sm"></div>
             ) : (
                <PaletteIcon className="w-4 h-4" />
             )}
          </button>
          
          <div className="w-[1px] bg-white/10 my-1"></div>

          <button
            onClick={handleUndo}
            disabled={history.length <= 1}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/20 rounded-lg disabled:opacity-30 transition-colors"
            title="元に戻す"
          >
            <UndoIcon className="w-4 h-4" />
          </button>
          <div className="w-[1px] bg-white/10 my-1"></div>
          <button
            onClick={handleClear}
            className="p-2 text-slate-300 hover:text-red-400 hover:bg-white/20 rounded-lg transition-colors"
            title="キャンバスをクリア"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Indicator */}
        <div className="absolute bottom-3 left-3 pointer-events-none">
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/5">
                <PenIcon className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] text-slate-300 font-medium">スケッチレイヤー</span>
            </div>
        </div>
        
        {/* Resize Handle Indicator (Visual only) */}
        <div className="absolute bottom-1 right-1/2 translate-x-1/2 w-12 h-1 rounded-full bg-white/20 pointer-events-none"></div>
      </div>
    </div>
  );
};
