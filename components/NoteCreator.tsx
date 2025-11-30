
import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, PenTool, Check, Eraser, Droplets, Utensils, Scissors, Thermometer, Camera } from 'lucide-react';
import { JournalEntry } from '../types';
import { fileToGenerativePart } from '../services/geminiService';

interface NoteCreatorProps {
  onSave: (entry: Omit<JournalEntry, 'id' | 'date'>) => void;
  onClose: () => void;
}

type Mode = 'text' | 'draw' | 'voice';
type Tag = 'water' | 'feed' | 'prune' | 'env';

const NoteCreator: React.FC<NoteCreatorProps> = ({ onSave, onClose }) => {
  const [mode, setMode] = useState<Mode>('text');
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // Drawing Refs & State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#059669'); // Primary green
  const [hasDrawing, setHasDrawing] = useState(false);

  // Initialize Canvas
  useEffect(() => {
    if (mode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Set canvas size to parent size
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const stopDrawing = () => {
    setIsDrawing(false);
  };

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

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
  };

  // Voice Handler
  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
    } else {
      setIsListening(true);
      if ('webkitSpeechRecognition' in window) {
        // @ts-ignore
        const recognition = new window.webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setText(prev => prev + (prev ? ' ' : '') + transcript);
          setIsListening(false);
        };
        
        recognition.onerror = () => setIsListening(false);
        recognition.start();
      } else {
        alert("Voice input not supported.");
        setIsListening(false);
      }
    }
  };

  // Photo Handler
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const preview = URL.createObjectURL(file);
      setAttachedImage(preview);
    }
  };

  const toggleTag = (tag: Tag) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSave = async () => {
    if (!title && !text && !hasDrawing && !attachedImage) return;
    
    setIsProcessing(true);
    let finalNote = text;
    let drawingUri = undefined;
    
    if (mode === 'draw' && hasDrawing && canvasRef.current) {
        drawingUri = canvasRef.current.toDataURL("image/png");
        if (!title) setTitle("Garden Sketch");
    }

    // Default title based on tags if empty
    let finalTitle = title;
    if (!finalTitle) {
       if (mode === 'draw') finalTitle = "Sketch";
       else if (tags.length > 0) finalTitle = tags.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' & ');
       else finalTitle = "Daily Log";
    }

    onSave({
      type: 'note',
      title: finalTitle,
      notes: finalNote,
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
             <button onClick={() => setMode('voice')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mode === 'voice' ? 'bg-white shadow-sm text-text-main' : 'text-text-sub'}`}>Voice</button>
          </div>
          <button 
            onClick={handleSave}
            disabled={isProcessing}
            className="p-2 bg-primary text-white rounded-full hover:bg-primary-dark shadow-lg shadow-primary/30 active:scale-95 transition-transform disabled:opacity-50"
          >
            {isProcessing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check size={20} />}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative bg-surface overflow-y-auto">
           {/* Title Input */}
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
                  placeholder="Type your observation... (e.g., 'Fed 500ml pH 6.0')"
                  className="w-full h-32 bg-transparent resize-none outline-none text-base leading-relaxed text-text-main placeholder-gray-300 mb-4"
                  autoFocus
                />
                
                {/* Image Preview */}
                {attachedImage && (
                    <div className="relative mb-4 w-24 h-24 rounded-xl overflow-hidden shadow-sm border border-gray-100 group">
                        <img src={attachedImage} alt="Attachment" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => setAttachedImage(null)}
                          className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X size={12} />
                        </button>
                    </div>
                )}

                {/* Quick Actions / Tags */}
                <div className="mt-auto">
                    <p className="text-[10px] font-bold text-text-sub uppercase tracking-wider mb-3">Quick Tags</p>
                    <div className="flex flex-wrap gap-2">
                        <button 
                            onClick={() => toggleTag('water')} 
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-colors ${tags.includes('water') ? 'bg-neon-blue text-white' : 'bg-white border border-gray-200 text-text-sub'}`}
                        >
                            <Droplets size={14} /> Water
                        </button>
                        <button 
                            onClick={() => toggleTag('feed')} 
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-colors ${tags.includes('feed') ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-text-sub'}`}
                        >
                            <Utensils size={14} /> Feed
                        </button>
                        <button 
                            onClick={() => toggleTag('prune')} 
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-colors ${tags.includes('prune') ? 'bg-orange-400 text-white' : 'bg-white border border-gray-200 text-text-sub'}`}
                        >
                            <Scissors size={14} /> Prune
                        </button>
                        <button 
                            onClick={() => toggleTag('env')} 
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-colors ${tags.includes('env') ? 'bg-deep-purple text-white' : 'bg-white border border-gray-200 text-text-sub'}`}
                        >
                            <Thermometer size={14} /> Environment
                        </button>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-white border border-gray-200 text-text-sub active:bg-gray-50"
                        >
                            <Camera size={14} /> Photo
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handlePhotoSelect} 
                        />
                    </div>
                </div>
             </div>
           )}

           {mode === 'voice' && (
             <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div 
                   onClick={toggleListening}
                   className={`w-24 h-24 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${isListening ? 'bg-red-50 text-alert-red scale-110' : 'bg-primary/10 text-primary hover:scale-105'}`}
                >
                    <Mic size={40} className={isListening ? 'animate-pulse' : ''} />
                </div>
                <p className="mt-6 text-sm font-bold text-text-sub uppercase tracking-wider">
                    {isListening ? 'Listening...' : 'Tap to Record'}
                </p>
                <div className="w-full mt-8 p-4 bg-white rounded-2xl border border-gray-100 min-h-[100px] text-left">
                   {text || <span className="text-gray-300 italic">Transcription will appear here...</span>}
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
                
                {/* Drawing Tools */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white shadow-xl rounded-full px-4 py-2 flex items-center gap-4 border border-gray-100">
                    <button onClick={() => setDrawingColor('#059669')} className={`w-6 h-6 rounded-full bg-primary ${drawingColor === '#059669' ? 'ring-2 ring-offset-2 ring-primary' : ''}`} />
                    <button onClick={() => setDrawingColor('#0F172A')} className={`w-6 h-6 rounded-full bg-text-main ${drawingColor === '#0F172A' ? 'ring-2 ring-offset-2 ring-text-main' : ''}`} />
                    <button onClick={() => setDrawingColor('#E11D48')} className={`w-6 h-6 rounded-full bg-alert-red ${drawingColor === '#E11D48' ? 'ring-2 ring-offset-2 ring-alert-red' : ''}`} />
                    <div className="w-px h-6 bg-gray-200"></div>
                    <button onClick={clearCanvas} className="text-text-sub hover:text-alert-red transition-colors"><Eraser size={20} /></button>
                </div>
             </div>
           )}
        </div>

      </div>
    </div>
  );
};

export default NoteCreator;