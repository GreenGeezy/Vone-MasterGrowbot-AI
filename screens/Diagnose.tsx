
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, AlertTriangle, CheckCircle, X, Scan, Zap, TrendingUp, Search, Activity, Sprout, Plus, Share2, Copy, Images, Aperture, Check, RefreshCcw, ArrowRight, ChevronDown, CheckSquare, Square } from 'lucide-react';
import { diagnosePlant, fileToGenerativePart } from '../services/geminiService';
import { DiagnosisResult, JournalEntry, Plant } from '../types';
import Growbot from '../components/Growbot';
import StrainCard from '../components/StrainCard';
import { STRAIN_DATABASE } from '../data/strains';
import { generatePublicLink, shareContent, formatDiagnosisForShare } from '../services/shareService';

interface DiagnoseProps {
  onSaveToJournal?: (entry: Omit<JournalEntry, 'id' | 'date'>) => void;
  plant?: Plant; 
}

// --- SUB-COMPONENT: RECOVERY CHECKLIST ---
const RecoveryChecklist: React.FC<{ steps: string[], themeColor: string }> = ({ steps, themeColor }) => {
  const [checkedState, setCheckedState] = useState<boolean[]>(new Array(steps.length).fill(false));

  const toggleStep = (index: number) => {
    const updated = [...checkedState];
    updated[index] = !updated[index];
    setCheckedState(updated);
  };

  return (
    <div className="space-y-3 mt-2">
      {steps.map((step, idx) => (
        <div 
          key={idx} 
          onClick={() => toggleStep(idx)}
          className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
            checkedState[idx] 
              ? 'bg-gray-50 border-gray-100' 
              : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm'
          }`}
        >
          <div className={`mt-0.5 transition-colors ${checkedState[idx] ? 'text-gray-300' : themeColor}`}>
            {checkedState[idx] ? <CheckSquare size={20} /> : <Square size={20} />}
          </div>
          <p className={`text-sm leading-relaxed transition-all ${
            checkedState[idx] 
              ? 'text-gray-400 line-through decoration-gray-300' 
              : 'text-[#1F1F1F] font-medium'
          }`}>
            {step}
          </p>
        </div>
      ))}
    </div>
  );
};

const Diagnose: React.FC<DiagnoseProps> = ({ onSaveToJournal, plant }) => {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  
  // Camera & File Refs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // UI States
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null); 
  const [selectedStrain, setSelectedStrain] = useState<string>(plant?.strain || '');
  const [selectedEnv, setSelectedEnv] = useState<string>('Indoor');
  const [showStrainDropdown, setShowStrainDropdown] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (plant) {
        setSelectedStrain(plant.strain);
    }
  }, [plant]);

  useEffect(() => {
    return () => {
        stopCamera();
    };
  }, []);

  useEffect(() => {
    if (showCamera && !capturedImage && streamRef.current && videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(e => console.log("Play error:", e));
    }
  }, [showCamera, capturedImage]);

  const filteredStrains = STRAIN_DATABASE.filter(s => 
      s.name.toLowerCase().includes(selectedStrain.toLowerCase())
  );

  // --- THEME ENGINE ---
  const getSeverityTheme = (severity: string, health: string) => {
    // Logic: Critical if High Severity OR Poor Health
    if (severity === 'high' || health === 'Poor') {
      return {
        base: 'text-alert-red',
        bg: 'bg-red-50',
        border: 'border-red-100',
        chip: 'bg-red-100 text-red-700',
        card: 'bg-red-500 text-white', // For high emphasis
        icon: AlertTriangle
      };
    }
    // Warning if Medium Severity OR Fair Health
    if (severity === 'medium' || health === 'Fair') {
      return {
        base: 'text-orange-500',
        bg: 'bg-orange-50',
        border: 'border-orange-100',
        chip: 'bg-orange-100 text-orange-800',
        card: 'bg-orange-500 text-white',
        icon: Activity
      };
    }
    // Default / Low / Good
    return {
      base: 'text-primary',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      chip: 'bg-emerald-100 text-emerald-800',
      card: 'bg-primary text-white',
      icon: CheckCircle
    };
  };

  // --- CAMERA LOGIC ---
  const handleStartCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not available");
      }
      setCapturedImage(null);
      let stream;
      try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      } catch (e) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      streamRef.current = stream;
      setShowCamera(true);
    } catch (err) {
      cameraInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setCapturedImage(null);
  };

  const handleCapturePhoto = () => {
    if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setCapturedImage(dataUrl); 
        }
    }
  };

  const handleConfirmAnalysis = () => {
      if (capturedImage) {
          stopCamera(); 
          processCapturedImage(capturedImage);
      }
  };

  const processCapturedImage = async (dataUrl: string) => {
    try {
        setImages([dataUrl]);
        setLoading(true);
        setResult(null);
        const base64Data = dataUrl.split(',')[1];
        const diagnosis = await diagnosePlant([base64Data], { 
            strain: selectedStrain, 
            environment: selectedEnv 
        });
        setResult(diagnosis);
    } catch (error) {
        alert("Analysis failed. Please try again.");
        setImages([]);
    } finally {
        setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        setLoading(true);
        setResult(null);
        const files: File[] = Array.from(e.target.files).slice(0, 3) as File[];
        const imageUrls = files.map(file => URL.createObjectURL(file));
        setImages(imageUrls);
        const base64Promises = files.map(file => fileToGenerativePart(file));
        const base64DataArray = await Promise.all(base64Promises);
        const diagnosis = await diagnosePlant(base64DataArray, { strain: selectedStrain, environment: selectedEnv });
        setResult(diagnosis);
      } catch (error) {
        alert("Analysis failed.");
        setImages([]);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = () => {
    if (result && onSaveToJournal && images.length > 0) {
        onSaveToJournal({
            type: 'diagnosis',
            title: result.diagnosis,
            diagnosisData: result,
            imageUri: images[0],
            notes: `Context: ${selectedStrain} (${selectedEnv})\nHealth: ${result.health}. Action: ${result.topAction}`
        });
    }
  };

  const handleShare = async () => {
    if (!result || images.length === 0) return;
    setIsSharing(true);
    const link = generatePublicLink('report', '123'); // Mock ID
    const text = formatDiagnosisForShare(result);
    await shareContent("Plant Analysis", text, link);
    setIsSharing(false);
  };

  const handleReset = () => {
      setImages([]);
      setResult(null);
      setCapturedImage(null);
  };

  // 0. Live Camera
  if (showCamera) {
      return (
          <div className="fixed inset-0 z-[60] bg-black flex flex-col">
              <div className="relative flex-1 bg-black overflow-hidden">
                  {capturedImage ? (
                      <img src={capturedImage} alt="Captured" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  {/* Controls Overlay */}
                  <button onClick={stopCamera} className="absolute top-6 right-6 p-2 bg-black/50 text-white rounded-full"><X size={24} /></button>
              </div>
              <div className="h-32 bg-black flex items-center justify-center gap-8 pb-6">
                  {capturedImage ? (
                      <>
                        <button onClick={() => setCapturedImage(null)} className="flex flex-col items-center text-white"><RefreshCcw /> <span className="text-xs mt-1">Retake</span></button>
                        <button onClick={handleConfirmAnalysis} className="flex items-center gap-2 bg-primary px-8 py-3 rounded-full text-white font-bold"><Check /> Analyze Photo</button>
                      </>
                  ) : (
                      <button onClick={handleCapturePhoto} className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center"><div className="w-14 h-14 bg-white rounded-full"></div></button>
                  )}
              </div>
          </div>
      );
  }

  // 1. Initial State
  if (images.length === 0) {
    return (
      <div className="h-full pb-32 flex flex-col bg-surface overflow-y-auto">
        <div className="flex flex-col min-h-full p-6 relative overflow-hidden">
          <div className="mt-2 mb-4 flex flex-col items-center text-center z-10">
            <Growbot size="xl" mood="happy" />
            <h1 className="text-3xl font-extrabold text-text-main mb-2 tracking-tight">MasterGrowbot AI</h1>
            <p className="text-text-sub text-xs font-bold uppercase tracking-wider">Take a Pic or Upload photos to AI Analyze</p>
          </div>
          
          <div className="flex-1 flex flex-col justify-center items-center gap-4 z-10 w-full px-2">
            {/* Inputs Container */}
            <div className="w-full max-w-sm bg-white/60 backdrop-blur-md rounded-3xl p-4 border border-white/50 shadow-sm relative z-20">
                <div className="mb-3 relative">
                    <label className="text-[10px] font-bold text-text-sub uppercase tracking-wider block mb-1.5 ml-1">Genetics</label>
                    <input 
                        type="text"
                        value={selectedStrain}
                        onChange={(e) => { setSelectedStrain(e.target.value); setShowStrainDropdown(true); }}
                        placeholder="Select Strain..."
                        className="w-full bg-white border-0 rounded-xl px-4 py-3 text-sm font-bold text-text-main shadow-sm ring-1 ring-gray-100 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                    {showStrainDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl z-40 max-h-40 overflow-y-auto">
                            {filteredStrains.map(s => (
                                <button key={s.name} onClick={() => { setSelectedStrain(s.name); setShowStrainDropdown(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">{s.name}</button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="relative z-10">
                    <label className="text-[10px] font-bold text-text-sub uppercase tracking-wider block mb-1.5 ml-1">Environment</label>
                    <div className="flex bg-white/50 rounded-xl p-1 gap-1">
                        {['Indoor', 'Outdoor', 'Glass'].map(env => (
                             <button key={env} onClick={() => setSelectedEnv(env)} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${selectedEnv === env ? 'bg-white text-primary shadow-sm' : 'text-text-sub'}`}>{env === 'Glass' ? 'Greenhouse' : env}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ACTION AREA - SEPARATE BUTTONS */}
            <div className="w-full max-w-sm bg-white rounded-[2rem] p-4 shadow-card border border-gray-100 flex flex-col gap-3 z-10">
                <button onClick={handleStartCamera} className="w-full group bg-text-main text-white rounded-[1.5rem] py-5 flex flex-col items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform">
                  <Camera size={36} className="text-primary-light" />
                  <span className="font-extrabold text-xl tracking-widest uppercase font-mono">Take Photo</span>
                </button>
                
                {/* Upload Button Separated */}
                <button onClick={() => galleryInputRef.current?.click()} className="w-full py-4 flex items-center justify-center gap-2 rounded-xl text-text-main font-bold text-sm bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors shadow-sm">
                     <Upload size={18} /> Upload Image
                </button>
            </div>
            
            <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
            <input type="file" ref={galleryInputRef} accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
          </div>
        </div>
      </div>
    );
  }

  // 2. Loading State
  if (loading || !result) {
      return (
        <div className="flex flex-col h-full bg-black relative">
           <div className="absolute inset-0 overflow-hidden">
             {images.length > 0 && <img src={images[0]} alt="Analysis" className="w-full h-full object-cover opacity-60" />}
             {/* Scanning Line */}
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-light to-transparent shadow-[0_0_20px_rgba(52,211,153,0.8)] z-20 animate-scan"></div>
           </div>
           
           <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
              <div className="bg-black/80 backdrop-blur-md rounded-2xl px-8 py-6 flex flex-col items-center border border-primary/30 shadow-2xl">
                  <div className="flex items-center gap-3 mb-2">
                      <Growbot size="md" mood="thinking" className="animate-bounce" />
                      <span className="text-2xl font-black text-white tracking-widest uppercase font-mono">Analyzing...</span>
                  </div>
                  <span className="text-primary-light text-xs font-bold animate-pulse px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                      Est. wait time: ~15s
                  </span>
              </div>
           </div>
        </div>
      );
  }

  // 3. Result State - REFACTORED DASHBOARD
  const theme = getSeverityTheme(result.severity, result.health);

  return (
    <div className="bg-surface min-h-screen pb-32 font-sans relative">
      {/* Top Navigation / Close */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100 px-6 py-4 flex justify-between items-center">
         <div className="flex items-center gap-2 text-primary font-bold">
            <Activity size={18} /> Analysis Report
         </div>
         <button onClick={handleReset} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-text-main"><X size={20} /></button>
      </div>

      <div className="p-6 space-y-6">
         
         {/* A. Diagnosis Header & Image */}
         <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
               <h1 className={`text-2xl font-bold leading-tight mb-2 ${theme.base}`}>
                  {result.diagnosis}
               </h1>
               <div className="flex flex-wrap gap-2">
                  {result.issues.map((issue, i) => (
                     <span key={i} className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md ${theme.chip}`}>
                        {issue}
                     </span>
                  ))}
               </div>
            </div>
            
            {/* Image Thumbnail with Explicit Confidence Badge */}
            <div className="relative w-24 h-24 flex-shrink-0">
                <img src={images[0]} alt="Analyzed" className="w-full h-full object-cover rounded-2xl shadow-sm border border-gray-100" />
                <div className="absolute -bottom-2 -right-2 bg-white rounded-xl shadow-md border border-gray-100 p-1 flex flex-col items-center min-w-[50px]">
                    <div className={`w-full text-center rounded-lg text-[10px] font-black py-0.5 text-white ${result.confidence > 80 ? 'bg-primary' : 'bg-orange-400'}`}>
                        {Math.round(result.confidence)}%
                    </div>
                    <span className="text-[6px] font-bold text-gray-400 uppercase mt-0.5 tracking-wider">AI Confidence</span>
                </div>
            </div>
         </div>

         {/* B. Actionable Tip Card (Highest Priority) */}
         <div className={`p-5 rounded-2xl shadow-sm relative overflow-hidden ${theme.card}`}>
             {/* Mascot for Success State */}
             <div className="absolute -right-2 -top-2 opacity-20">
                <Growbot size="lg" mood="success" />
             </div>

             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 opacity-90">
                   <Zap size={16} className="fill-current" />
                   <span className="text-xs font-bold uppercase tracking-widest">Custom AI Grow Tip</span>
                </div>
                <p className="text-lg font-bold leading-snug">
                   {result.topAction}
                </p>
             </div>
             {/* Decorative */}
             <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/20 rounded-full blur-2xl"></div>
         </div>

         {/* C. Metadata Grid */}
         <div className="grid grid-cols-2 gap-3">
             <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Plant Health</span>
                 <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${theme.bg.replace('bg-', 'bg-').replace('50', '500')}`}></div>
                    <span className="text-sm font-bold text-[#1F1F1F]">{result.health}</span>
                 </div>
             </div>
             <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Growth Stage</span>
                 <div className="flex items-center gap-2">
                    <Sprout size={14} className="text-text-sub" />
                    <span className="text-sm font-bold text-[#1F1F1F]">{result.stage}</span>
                 </div>
             </div>
         </div>

         {/* D. Interactive Recovery Protocol */}
         <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
             <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-50">
                 <CheckCircle size={18} className="text-primary" />
                 <h3 className="text-sm font-bold text-[#1F1F1F] uppercase tracking-wide">Recovery Protocol</h3>
             </div>
             {result.fixSteps.length > 0 ? (
                 <RecoveryChecklist steps={result.fixSteps} themeColor={theme.base} />
             ) : (
                 <p className="text-sm text-gray-400 italic">No specific recovery steps needed.</p>
             )}
         </div>

         {/* E. Action Footer */}
         <div className="grid grid-cols-2 gap-3 pt-2">
             <button 
                onClick={handleShare}
                className="py-3.5 rounded-xl border border-gray-200 text-text-main font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
             >
                <Share2 size={16} /> {isSharing ? 'Sharing...' : 'Share Report'}
             </button>
             <button 
                onClick={handleSave}
                className="py-3.5 rounded-xl bg-text-main text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
             >
                <Copy size={16} /> Save to Journal
             </button>
         </div>

      </div>
    </div>
  );
};

export default Diagnose;