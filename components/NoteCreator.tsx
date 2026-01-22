import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Eraser, Droplets, Utensils, Scissors, Thermometer, Camera } from 'lucide-react';
import { JournalEntry } from '../types';
import { Camera as CapacitorCamera, CameraResultType } from '@capacitor/camera';

interface NoteCreatorProps {
  onSave: (entry: Partial<JournalEntry>) => void; // Relaxed type for flexibility
  onClose: () => void;
}

type Mode = 'text' | 'draw';
type Tag = 'water' | 'feed' | 'prune' | 'env';

const NoteCreator: React.FC<NoteCreatorProps> = ({ onSave, onClose }) => {
  const [mode, setMode] = useState<Mode>('text');
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Drawing Refs & State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#059669'); // Primary green
  const [hasDrawing, setHasDrawing] = useState(false);

  // Initialize Canvas
  useEffect(() => {
    if (mode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const parent = canvas.parentElement;
        if (parent) {
          canvas.width = parent.clientWidth;
          canvas.height = parent.clientHeight;
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3;
        ctx.strokeStyle = drawingColor;
      }
    }
  }, [mode]);

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.strokeStyle = drawingColor;
    }
  }, [drawingColor]);

  // Drawing Handlers
  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawing(true);
    const { x, y } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const getCoordinates = (e: React.TouchEvent | React.MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
  };

  // NATIVE PHOTO HANDLER
  const handleTakePhoto = async () => {
    try {
      const photo = await CapacitorCamera.getPhoto({
        quality: 80,
        resultType: CameraResultType.Base64,
        allowEditing: false
      });
      if (photo.base64String) {
        setAttachedImage(`data:image/jpeg;base64,${photo.base64String}`);
      }
    } catch (e) {
      console.error("Camera cancelled or failed", e);
    }
  };

  const toggleTag = (tag: Tag) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSave = async () => {
    if (!title && !text && !hasDrawing && !attachedImage) return;
    
    setIsProcessing(true);
    let drawingUri = undefined;
    
    if (mode === 'draw' && hasDrawing && canvasRef.current) {
        drawingUri = canvasRef.current.toDataURL("image/png");
        if (!title) setTitle("Garden Sketch");
    }

    let finalTitle = title;
    if (!finalTitle) {
       if (mode === 'draw') finalTitle = "Sketch";
       else if (tags.length > 0) finalTitle = tags.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' & ');
       else finalTitle = "Daily Log";
    }

    onSave({
      type: 'note',
      title: finalTitle,
      notes: text,
      drawingUri: drawingUri,
      imageUri: attachedImage || undefined,
      tags: tags
    });
    
    setIsProcessing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md h-[85vh] sm:h-[600px] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
          <div className="flex bg-gray-100 rounded-full p-1">
             <button onClick={() => setMode('text')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mode === 'text' ? 'bg-white shadow-sm text-text-main' : 'text-text-sub'}`}>Text</button>
             <button onClick={() => setMode('draw')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mode === 'draw' ? 'bg-white shadow-sm text-text-main' : 'text-text-sub'}`}>Draw</button>
          </div>
          <button 
            onClick={handleSave}
            disabled={isProcessing}
            className="p-2 bg-primary text-white rounded-full hover:bg-primary-dark shadow-lg shadow-primary/30 active:scale-95 transition-transform disabled:opacity-50"
          >
            <Check size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative bg-surface overflow-y-auto">
           <div className="px-6 pt-6">
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (optional)"
                className="w-full text-lg font-bold bg-transparent outline-none placeholder-gray-300 text-text-main"
              />
           </div>

           {mode === 'text' && (
             <div className="p-6 h-full flex flex-col">
                <textarea 
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type your observation..."
                  className="w-full h-32 bg-transparent resize-none outline-none text-base leading-relaxed text-text-main placeholder-gray-300 mb-4"
                  autoFocus
                />
                
                {attachedImage && (
                    <div className="relative mb-4 w-24 h-24 rounded-xl overflow-hidden shadow-sm border border-gray-100 group">
                        <img src={attachedImage} alt="Attachment" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => setAttachedImage(null)}
                          className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full"
                        >
                            <X size={12} />
                        </button>
                    </div>
                )}

                <div className="mt-auto">
                    <p className="text-[10px] font-bold text-text-sub uppercase tracking-wider mb-3">Quick Tags</p>
                    <div className="flex flex-wrap gap-2">
                        {['water', 'feed', 'prune', 'env'].map((tag) => (
                            <button 
                                key={tag}
                                onClick={() => toggleTag(tag as Tag)} 
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-colors ${tags.includes(tag as Tag) ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-text-sub'}`}
                            >
                                {tag === 'water' && <Droplets size={14} />}
                                {tag === 'feed' && <Utensils size={14} />}
                                {tag === 'prune' && <Scissors size={14} />}
                                {tag === 'env' && <Thermometer size={14} />}
                                {tag.charAt(0).toUpperCase() + tag.slice(1)}
                            </button>
                        ))}
                        
                        {/* Native Camera Button */}
                        <button 
                            onClick={handleTakePhoto}
                            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-white border border-gray-200 text-text-sub active:bg-gray-50"
                        >
                            <Camera size={14} /> Photo
                        </button>
                    </div>
                </div>
             </div>
           )}

           {mode === 'draw' && (
             <div className="absolute inset-0 top-16 bg-white touch-none">
                <canvas 
                    ref={canvasRef}
                    className="w-full h-full cursor-crosshair"
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                />
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white shadow-xl rounded-full px-4 py-2 flex items-center gap-4 border border-gray-100">
                    <button onClick={() => setDrawingColor('#059669')} className={`w-6 h-6 rounded-full bg-primary ${drawingColor === '#059669' ? 'ring-2 ring-primary' : ''}`} />
                    <button onClick={() => setDrawingColor('#E11D48')} className={`w-6 h-6 rounded-full bg-red-500 ${drawingColor === '#E11D48' ? 'ring-2 ring-red-500' : ''}`} />
                    <div className="w-px h-6 bg-gray-200"></div>
                    <button onClick={clearCanvas} className="text-gray-400 hover:text-red-500"><Eraser size={20} /></button>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default NoteCreator;
