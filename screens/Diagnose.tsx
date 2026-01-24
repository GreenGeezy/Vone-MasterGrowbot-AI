import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, AlertTriangle, CheckCircle, X, Zap, Activity, Sprout, Plus, Share2, Copy, Check, RefreshCcw, Square, CheckSquare, ChevronRight } from 'lucide-react';
import { diagnosePlant } from '../services/geminiService';
import { DiagnosisResult, JournalEntry, Plant } from '../types';
import Growbot from '../components/Growbot';
import { STRAIN_DATABASE } from '../data/strains';

interface DiagnoseProps {
  onSaveToJournal?: (entry: Omit<JournalEntry, 'id' | 'date'>) => void;
  plant?: Plant;
  onBack?: () => void;
}

// --- SUB-COMPONENTS ---

const RecoveryChecklist: React.FC<{ steps: string[], themeColor: string }> = ({ steps, themeColor }) => {
  const [checkedState, setCheckedState] = useState<boolean[]>(new Array(steps.length).fill(false));
  
  const toggleStep = (index: number) => {
    const updated = [...checkedState];
    updated[index] = !updated[index];
    setCheckedState(updated);
  };

  return (
    <div className="space-y-3 mt-4">
      {steps.map((step, idx) => (
        <div 
          key={idx} 
          onClick={() => toggleStep(idx)}
          className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
            checkedState[idx] ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm'
          }`}
        >
          <div className={`mt-0.5 transition-colors ${checkedState[idx] ? 'text-gray-300' : themeColor}`}>
            {checkedState[idx] ? <CheckSquare size={20} /> : <Square size={20} />}
          </div>
          <p className={`text-sm leading-relaxed transition-all ${
            checkedState[idx] ? 'text-gray-400 line-through decoration-gray-300' : 'text-gray-800 font-medium'
          }`}>{step}</p>
        </div>
      ))}
    </div>
  );
};

const LoadingScreen = ({ timer, image }: { timer: number, image?: string }) => (
  <div className="flex flex-col h-full bg-black relative fixed inset-0 z-50">
     <div className="absolute inset-0 overflow-hidden">
        {image && <img src={image} className="w-full h-full object-cover opacity-60 blur-sm" />}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent shadow-[0_0_20px_rgba(52,211,153,0.8)] z-20 animate-scan"></div>
     </div>
     <div className="absolute inset-0 flex flex-col items-center justify-center z-30 p-8">
        <div className="bg-black/80 backdrop-blur-xl rounded-[2.5rem] px-8 py-10 flex flex-col items-center border border-white/10 shadow-2xl w-full max-w-sm">
           <Growbot size="lg" mood="thinking" className="mb-6 animate-bounce" />
           <span className="text-2xl font-black text-white tracking-widest uppercase font-mono mb-2">Analyzing...</span>
           <div className="w-full bg-gray-800 h-1.5 rounded-full mt-4 overflow-hidden">
              <div className="bg-green-500 h-full animate-progress rounded-full"></div>
           </div>
           <span className="text-[10px] font-bold text-green-400 uppercase tracking-[0.2em] mt-4 opacity-80">
              AI Reasoning Engine Active (~{timer}s)
           </span>
        </div>
     </div>
  </div>
);

// --- MAIN COMPONENT ---

const Diagnose: React.FC<DiagnoseProps> = ({ onSaveToJournal, plant, onBack }) => {
  // State
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTimer, setLoadingTimer] = useState(5);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  
  // Inputs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  // Context
  const [selectedStrain, setSelectedStrain] = useState<string>(plant?.strain || '');
  const [selectedEnv, setSelectedEnv] = useState<string>('Indoor');
  const [showStrainDropdown, setShowStrainDropdown] = useState(false);
  
  // Lifecycle
  useEffect(() => { 
    if (plant) setSelectedStrain(plant.strain); 
    return () => stopCamera(); // Cleanup on unmount
  }, [plant]);

  // Timer Logic
  useEffect(() => {
    let interval: any;
    if (loading && loadingTimer > 0) {
      interval = setInterval(() => setLoadingTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [loading, loadingTimer]);

  // Camera Stream Logic
  useEffect(() => {
    if (showCamera && !capturedImage && streamRef.current && videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(e => console.log("Play error:", e));
    }
  }, [showCamera, capturedImage]);

  const filteredStrains = STRAIN_DATABASE.filter(s => s.name.toLowerCase().includes(selectedStrain.toLowerCase()));

  // Theme Helper
  const getSeverityTheme = (severity: string, health: string = '') => {
    if (severity === 'high' || health === 'Poor') return { 
        base: 'text-red-500', bg: 'bg-red-50', chip: 'bg-red-100 text-red-700', card: 'bg-red-500 text-white', icon: AlertTriangle 
    };
    if (severity === 'medium' || health === 'Fair') return { 
        base: 'text-orange-500', bg: 'bg-orange-50', chip: 'bg-orange-100 text-orange-800', card: 'bg-orange-500 text-white', icon: Activity 
    };
    return { 
        base: 'text-green-600', bg: 'bg-green-50', chip: 'bg-green-100 text-green-800', card: 'bg-green-600 text-white', icon: CheckCircle 
    };
  };

  // --- ACTIONS ---

  const handleStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      streamRef.current = stream;
      setShowCamera(true);
    } catch (err) {
      console.warn("Camera fallback:", err);
      cameraInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    setShowCamera(false); 
    setCapturedImage(null);
  };

  const handleCapturePhoto = () => {
    if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(dataUrl);
    }
  };

  const handleConfirmAnalysis = () => { 
      if (capturedImage) { 
          stopCamera(); 
          processImage(capturedImage); 
      } 
  };

  const processImage = async (dataUrl: string) => {
    setImages([dataUrl]); 
    setLoading(true); 
    setLoadingTimer(5); 
    setResult(null);
    
    try {
        const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        const diagnosis = await diagnosePlant(base64Data, selectedStrain); 
        setResult(diagnosis);
    } catch (error) {
        alert("AI Analysis failed. Please check connection.");
        setImages([]);
    } finally {
        setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
          if (typeof reader.result === 'string') processImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (result && onSaveToJournal && images.length > 0) {
        onSaveToJournal({ 
            type: 'diagnosis', 
            title: result.diagnosis, 
            diagnosisData: result, 
            imageUri: images[0], 
            notes: `Health: ${result.healthScore}%. Action: ${result.topAction}` 
        });
        alert("Saved to Journal!");
    }
  };

  // --- RENDER ---

  // 1. Camera View
  if (showCamera) return (
      <div className="fixed inset-0 z-[60] bg-black flex flex-col">
          <div className="relative flex-1 bg-black overflow-hidden">
              {capturedImage ? 
                  <img src={capturedImage} className="absolute inset-0 w-full h-full object-cover" /> : 
                  <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
              }
              <button onClick={stopCamera} className="absolute top-6 right-6 p-3 bg-black/50 text-white rounded-full backdrop-blur-md z-20">
                  <X size={24} />
              </button>
          </div>
          <div className="h-32 bg-black/90 backdrop-blur flex items-center justify-center gap-8 pb-6 pt-4">
              {capturedImage ? (
                  <>
                    <button onClick={() => setCapturedImage(null)} className="flex flex-col items-center text-gray-300 gap-1">
                        <RefreshCcw size={24} /> <span className="text-xs font-bold">Retake</span>
                    </button>
                    <button onClick={handleConfirmAnalysis} className="flex items-center gap-2 bg-green-500 px-8 py-4 rounded-full text-white font-bold shadow-lg hover:scale-105 transition-transform">
                        <Check size={20} /> Analyze Now
                    </button>
                  </>
              ) : (
                  <button onClick={handleCapturePhoto} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                      <div className="w-16 h-16 bg-white rounded-full"></div>
                  </button>
              )}
          </div>
      </div>
  );

  // 2. Loading View
  if (loading) return <LoadingScreen timer={loadingTimer} image={images[0]} />;

  // 3. Results View
  if (result && images.length > 0) {
      const theme = getSeverityTheme(result.severity, result.healthLabel);
      
      return (
        <div className="bg-gray-50 min-h-screen pb-32 overflow-y-auto">
           {/* Header */}
           <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100 px-6 py-4 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-2 text-gray-800 font-black uppercase text-xs tracking-widest">
                  <Activity size={18} className="text-green-600" /> Plant Doctor Report
              </div>
              <button onClick={() => { setImages([]); setResult(null); }} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:text-black">
                  <X size={20} />
              </button>
           </div>

           <div className="p-6 space-y-6 max-w-lg mx-auto">
              
              {/* Diagnosis Title */}
              <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                 <h1 className={`text-3xl font-black leading-tight mb-3 ${theme.base}`}>{result.diagnosis}</h1>
                 <div className="flex flex-wrap gap-2">
                     <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${theme.chip}`}>
                        {result.severity} Severity
                     </span>
                     <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600">
                        {result.growthStage}
                     </span>
                 </div>
              </div>

              {/* Priority Action Card (Hero) */}
              <div className={`p-6 rounded-[2rem] shadow-lg relative overflow-hidden animate-in zoom-in-95 duration-700 delay-100 ${theme.card}`}>
                 <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2 opacity-90">
                        <Zap size={16} className="fill-current" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Priority Action</span>
                    </div>
                    <p className="text-xl font-bold leading-tight">{result.topAction}</p>
                 </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-700 delay-200">
                 {/* Health Score */}
                 <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="relative w-16 h-16 flex items-center justify-center mb-2">
                       <svg className="w-full h-full transform -rotate-90">
                          <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-100" />
                          <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" 
                                  strokeDasharray={175} strokeDashoffset={175 - (175 * (result.healthScore || 80)) / 100} 
                                  className={theme.base} />
                       </svg>
                       <span className={`absolute text-lg font-black ${theme.base}`}>{result.healthScore}%</span>
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Health Score</span>
                 </div>

                 {/* Image Thumbnail */}
                 <div className="relative rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 h-32">
                    <img src={images[0]} className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur px-3 py-1 rounded-lg">
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                           {result.confidence}% Conf.
                        </span>
                    </div>
                 </div>
              </div>

              {/* Recovery Checklist */}
              <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm animate-in slide-in-from-bottom-4 duration-700 delay-300">
                  <div className="flex items-center gap-3 mb-2 pb-2 border-b border-gray-50">
                     <CheckCircle size={20} className={theme.base} />
                     <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Recovery Protocol</h3>
                  </div>
                  {result.fixSteps && <RecoveryChecklist steps={result.fixSteps} themeColor={theme.base} />}
              </div>

              {/* Yield Tips (Gemini 3 Feature) */}
              {result.yieldTips && result.yieldTips.length > 0 && (
                  <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-[2.5rem] border border-purple-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-3 text-purple-700">
                          <Sprout size={20} />
                          <h3 className="text-sm font-black uppercase tracking-widest">Yield Optimizer</h3>
                      </div>
                      <ul className="space-y-2">
                          {result.yieldTips.map((tip, i) => (
                              <li key={i} className="text-sm text-purple-900 font-medium flex items-start gap-2">
                                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-400" />
                                  {tip}
                              </li>
                          ))}
                      </ul>
                  </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4 pt-4 pb-8">
                 <button onClick={() => alert("Sharing enabled via Share Service")} className="py-4 rounded-2xl border border-gray-200 text-gray-700 font-bold text-sm flex items-center justify-center gap-2 bg-white shadow-sm active:scale-95 transition-all">
                    <Share2 size={18} /> Share
                 </button>
                 <button onClick={handleSave} className="py-4 rounded-2xl bg-gray-900 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all">
                    <Copy size={18} /> Save to Journal
                 </button>
              </div>

           </div>
        </div>
      );
  }

  // 4. Default View (Input Selection)
  return (
    <div className="h-full bg-gray-50 pb-20 overflow-y-auto">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-8 rounded-b-[3rem] shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
            {onBack && <button onClick={onBack} className="p-2 -ml-2"><ChevronRight className="rotate-180 text-gray-400" /></button>}
            <Growbot size="lg" mood="happy" />
            <div className="w-10"></div>
        </div>
        <h1 className="text-3xl font-black text-gray-800 mb-2 tracking-tight">AI Plant Health Scan</h1>
        <p className="text-gray-500 font-medium text-sm">Snap a photo for instant diagnosis</p>
      </div>

      <div className="px-6 space-y-6 max-w-md mx-auto">
         {/* Context Inputs */}
         <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
             <div className="mb-5 relative">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 ml-1">Current Genetics</label>
                <input 
                   type="text" 
                   value={selectedStrain} 
                   onChange={(e) => { setSelectedStrain(e.target.value); setShowStrainDropdown(true); }}
                   placeholder="e.g. Blue Dream" 
                   onFocus={() => setShowStrainDropdown(true)}
                   className="w-full bg-gray-50 border-0 rounded-xl px-5 py-4 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                />
                
                {/* Strain Dropdown with Custom Logic */}
                {showStrainDropdown && (
                   <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl z-50 max-h-64 overflow-y-auto border border-gray-100 p-2 animate-in fade-in slide-in-from-top-2">
                       {/* 1. Static Options */}
                       <button 
                          onClick={() => { setSelectedStrain(''); setShowStrainDropdown(false); }} 
                          className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 text-gray-500 rounded-xl font-bold flex items-center gap-2 mb-1"
                       >
                          <X size={16} /> Leave Blank
                       </button>
                       <button 
                          onClick={() => { setShowStrainDropdown(false); /* Accepts current text */ }} 
                          className="w-full text-left px-4 py-3 text-sm hover:bg-green-50 text-green-600 rounded-xl font-bold flex items-center gap-2"
                       >
                          <Plus size={16} /> Add Custom Strain
                       </button>
                       <div className="h-px bg-gray-100 my-2"></div>
                       
                       {/* 2. Filtered List */}
                       {filteredStrains.map(s => (
                           <button key={s.name} onClick={() => { setSelectedStrain(s.name); setShowStrainDropdown(false); }} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 text-gray-700 rounded-xl font-bold flex justify-between items-center">
                               {s.name} <span className={`text-[10px] px-2 py-0.5 rounded text-white font-black uppercase ${
                                   s.type === 'Sativa' ? 'bg-yellow-400' : s.type === 'Indica' ? 'bg-purple-400' : 'bg-green-400'
                               }`}>{s.type}</span>
                           </button>
                       ))}
                       {filteredStrains.length === 0 && (
                           <div className="p-3 text-center text-xs text-gray-400 italic">No matches. Use 'Add Custom Strain'</div>
                       )}
                   </div>
                )}
             </div>

             <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 ml-1">Environment</label>
                {/* Updated Environment Selector (Indoor / Outdoor / Greenhouse) */}
                <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-1">
                   {['Indoor', 'Outdoor', 'Greenhouse'].map(env => (
                       <button 
                          key={env} 
                          onClick={() => setSelectedEnv(env)} 
                          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                              selectedEnv === env ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                          }`}
                       >
                          {env}
                       </button>
                   ))}
                </div>
             </div>
         </div>

         {/* Camera Buttons */}
         <div className="flex flex-col gap-3">
             <button onClick={handleStartCamera} className="w-full bg-gray-900 text-white rounded-[2rem] py-6 flex flex-col items-center gap-2 shadow-xl hover:scale-[1.02] active:scale-95 transition-all group">
                 <Camera size={32} className="text-green-400 group-hover:rotate-12 transition-transform" />
                 <span className="font-black text-lg tracking-widest uppercase">Analyze Pic</span>
             </button>
             
             <button onClick={() => galleryInputRef.current?.click()} className="w-full bg-white text-gray-600 rounded-2xl py-4 flex items-center justify-center gap-2 border border-gray-200 font-bold hover:bg-gray-50 transition-colors">
                 <Upload size={18} /> Upload from Gallery
             </button>
         </div>
      </div>

      {/* Hidden Inputs */}
      <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
      <input type="file" ref={galleryInputRef} accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
    </div>
  );
};

export default Diagnose;