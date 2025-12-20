import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, AlertTriangle, CheckCircle, X, Zap, Activity, Sprout, Plus, Share2, Copy, Check, RefreshCcw, Square, CheckSquare, ChevronRight } from 'lucide-react';
import { diagnosePlant, fileToGenerativePart } from '../services/geminiService';
import { DiagnosisResult, JournalEntry, Plant } from '../types';
import Growbot from '../components/Growbot';
import { STRAIN_DATABASE } from '../data/strains';
import { generatePublicLink, shareContent, formatDiagnosisForShare } from '../services/shareService';

interface DiagnoseProps {
  onSaveToJournal?: (entry: Omit<JournalEntry, 'id' | 'date'>) => void;
  plant?: Plant; 
}

const RecoveryChecklist: React.FC<{ steps: string[], themeColor: string }> = ({ steps, themeColor }) => {
  const [checkedState, setCheckedState] = useState<boolean[]>(new Array(steps.length).fill(false));
  const toggleStep = (index: number) => {
    const updated = [...checkedState];
    updated[index] = !updated[index];
    setCheckedState(updated);
  };
  return (
    <div className="space-y-4 mt-2">
      {steps.map((step, idx) => (
        <div 
          key={idx} 
          onClick={() => toggleStep(idx)}
          className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
            checkedState[idx] ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-100 hover:border-gray-200 shadow-soft'
          }`}
        >
          <div className={`mt-0.5 transition-colors ${checkedState[idx] ? 'text-gray-300' : themeColor}`}>
            {checkedState[idx] ? <CheckSquare size={22} /> : <Square size={22} />}
          </div>
          <p className={`text-sm sm:text-base leading-relaxed transition-all ${
            checkedState[idx] ? 'text-gray-400 line-through decoration-gray-300' : 'text-text-main font-semibold'
          }`}>{step}</p>
        </div>
      ))}
    </div>
  );
};

const Diagnose: React.FC<DiagnoseProps> = ({ onSaveToJournal, plant }) => {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTimer, setLoadingTimer] = useState(5);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null); 
  const [selectedStrain, setSelectedStrain] = useState<string>(plant?.strain || '');
  const [selectedEnv, setSelectedEnv] = useState<string>('Indoor');
  const [showStrainDropdown, setShowStrainDropdown] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => { if (plant) setSelectedStrain(plant.strain); }, [plant]);
  useEffect(() => () => stopCamera(), []);
  
  // Loading timer logic
  useEffect(() => {
    let interval: any;
    if (loading && loadingTimer > 1) {
      interval = setInterval(() => {
        setLoadingTimer(prev => prev - 1);
      }, 1000);
    } else if (!loading) {
      setLoadingTimer(5);
    }
    return () => clearInterval(interval);
  }, [loading, loadingTimer]);

  useEffect(() => {
    if (showCamera && !capturedImage && streamRef.current && videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(e => console.log("Play error:", e));
    }
  }, [showCamera, capturedImage]);

  const filteredStrains = STRAIN_DATABASE.filter(s => s.name.toLowerCase().includes(selectedStrain.toLowerCase()));

  const getSeverityTheme = (severity: string, health: string) => {
    if (severity === 'high' || health === 'Poor') return { base: 'text-alert-red', bg: 'bg-red-50', chip: 'bg-red-100 text-red-700', card: 'bg-red-600 text-white', icon: AlertTriangle };
    if (severity === 'medium' || health === 'Fair') return { base: 'text-orange-500', bg: 'bg-orange-50', chip: 'bg-orange-100 text-orange-800', card: 'bg-orange-500 text-white', icon: Activity };
    return { base: 'text-primary', bg: 'bg-emerald-50', chip: 'bg-emerald-100 text-emerald-800', card: 'bg-primary text-white', icon: CheckCircle };
  };

  const handleStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setShowCamera(true);
    } catch (err) { cameraInputRef.current?.click(); }
  };

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    setShowCamera(false); setCapturedImage(null);
  };

  const handleCapturePhoto = () => {
    if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        setCapturedImage(canvas.toDataURL('image/jpeg', 0.85)); 
    }
  };

  const handleConfirmAnalysis = () => { if (capturedImage) { stopCamera(); processCapturedImage(capturedImage); } };
  const processCapturedImage = async (dataUrl: string) => {
    try {
        setImages([dataUrl]); setLoading(true); setLoadingTimer(5); setResult(null);
        const base64Data = dataUrl.split(',')[1];
        const diagnosis = await diagnosePlant([base64Data], { strain: selectedStrain, environment: selectedEnv });
        setResult(diagnosis);
    } catch (error) { alert("Analysis failed."); setImages([]); } finally { setLoading(false); }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      try {
        setLoading(true); setLoadingTimer(5); setResult(null);
        const files = Array.from(e.target.files).slice(0, 3) as File[];
        setImages(files.map(f => URL.createObjectURL(f)));
        const base64Parts = await Promise.all(files.map(f => fileToGenerativePart(f)));
        setResult(await diagnosePlant(base64Parts, { strain: selectedStrain, environment: selectedEnv }));
      } catch (error) { alert("Analysis failed."); setImages([]); } finally { setLoading(false); }
    }
  };

  const handleSave = () => {
    if (result && onSaveToJournal && images.length > 0) {
        onSaveToJournal({ type: 'diagnosis', title: result.diagnosis, diagnosisData: result, imageUri: images[0], notes: `Health: ${result.health}. Action: ${result.topAction}` });
    }
  };

  const handleShare = async () => {
    if (!result || !images.length) return;
    setIsSharing(true);
    await shareContent("Plant Analysis", formatDiagnosisForShare(result), generatePublicLink('report', '123'));
    setIsSharing(false);
  };

  const handleReset = () => { setImages([]); setResult(null); setCapturedImage(null); };

  if (showCamera) return (
      <div className="fixed inset-0 z-[60] bg-black flex flex-col">
          <div className="relative flex-1 bg-black overflow-hidden">
              {capturedImage ? <img src={capturedImage} className="absolute inset-0 w-full h-full object-cover" /> : <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />}
              <button onClick={stopCamera} className="absolute top-6 right-6 p-2 bg-black/50 text-white rounded-full"><X size={24} /></button>
          </div>
          <div className="h-32 bg-black flex items-center justify-center gap-8 pb-6">
              {capturedImage ? <>
                  <button onClick={() => setCapturedImage(null)} className="flex flex-col items-center text-white"><RefreshCcw /> <span className="text-xs mt-1">Retake</span></button>
                  <button onClick={handleConfirmAnalysis} className="flex items-center gap-2 bg-primary px-8 py-3 rounded-full text-white font-bold"><Check /> Analyze Photo</button>
              </> : <button onClick={handleCapturePhoto} className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center"><div className="w-14 h-14 bg-white rounded-full"></div></button>}
          </div>
      </div>
  );

  if (!images.length) return (
    <div className="h-full pb-32 flex flex-col bg-surface overflow-y-auto no-scrollbar">
      <div className="px-6 pt-6 text-center">
        <Growbot size="xl" mood="happy" className="mb-4" />
        <h1 className="text-3xl font-extrabold text-text-main mb-2 tracking-tight">AI Plant Health Scan</h1>
        <p className="text-text-sub text-sm font-bold uppercase tracking-wider mb-6">Snap a photo for instant diagnosis</p>
      </div>
      <div className="px-6 flex flex-col gap-4 items-center">
        <div className="w-full max-w-sm bg-white/60 backdrop-blur-md rounded-[2.5rem] p-4 border border-white shadow-soft">
            <div className="mb-4 relative">
                <label className="text-[10px] font-bold text-text-sub uppercase tracking-wider block mb-2 ml-1">Current Genetics</label>
                <input 
                    type="text" value={selectedStrain} onChange={(e) => { setSelectedStrain(e.target.value); setShowStrainDropdown(true); }}
                    placeholder="Search Strain..." onFocus={() => setShowStrainDropdown(true)}
                    className="w-full bg-white border-0 rounded-2xl px-5 py-4 text-sm font-bold text-text-main shadow-sm ring-1 ring-gray-100 focus:ring-2 focus:ring-primary/20 outline-none"
                />
                {showStrainDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto border border-gray-100 p-2 animate-in fade-in slide-in-from-top-2">
                         <button 
                             onClick={() => { setSelectedStrain(''); setShowStrainDropdown(false); }} 
                             className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 flex items-center gap-2 text-text-sub font-bold rounded-xl"
                         >
                             <X size={16} /> Leave Blank
                         </button>
                         <button onClick={() => setShowStrainDropdown(false)} className="w-full text-left px-4 py-3 text-sm hover:bg-primary/5 flex items-center gap-2 text-primary font-bold rounded-xl">
                             <Plus size={16} /> Add Custom Strain
                         </button>
                         <div className="h-px bg-gray-50 my-2"></div>
                         {filteredStrains.map(s => <button key={s.name} onClick={() => { setSelectedStrain(s.name); setShowStrainDropdown(false); }} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 text-text-main rounded-xl border-b border-gray-50 last:border-0 flex justify-between items-center group"><span>{s.name}</span><span className="text-[10px] text-gray-300 font-bold uppercase">{s.type}</span></button>)}
                    </div>
                )}
            </div>
            <div>
                <label className="text-[10px] font-bold text-text-sub uppercase tracking-wider block mb-2 ml-1">Environment</label>
                <div className="flex bg-gray-100/50 rounded-2xl p-1.5 gap-1.5">
                    {['Indoor', 'Outdoor', 'Glass'].map(env => <button key={env} onClick={() => setSelectedEnv(env)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${selectedEnv === env ? 'bg-white text-primary shadow-sm' : 'text-text-sub'}`}>{env === 'Glass' ? 'GHouse' : env}</button>)}
                </div>
            </div>
        </div>
        <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-4 shadow-card border border-gray-50 flex flex-col gap-3">
            <button onClick={handleStartCamera} className="w-full bg-text-main text-white rounded-[2rem] py-5 flex flex-col items-center gap-2 shadow-xl active:scale-95 transition-transform"><Camera size={40} className="text-primary-light" /><span className="font-black text-xl tracking-widest uppercase font-mono">Analyze Pic</span></button>
            <button onClick={() => galleryInputRef.current?.click()} className="w-full py-4 flex items-center justify-center gap-3 rounded-2xl text-text-main font-black text-sm bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-colors"><Upload size={20} /> Upload from Gallery</button>
        </div>
      </div>
      <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
      <input type="file" ref={galleryInputRef} accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
    </div>
  );

  if (loading || !result) return (
    <div className="flex flex-col h-full bg-black relative">
       <div className="absolute inset-0 overflow-hidden">{images.length > 0 && <img src={images[0]} className="w-full h-full object-cover opacity-60" />}<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-light to-transparent shadow-[0_0_20px_rgba(52,211,153,0.8)] z-20 animate-scan"></div></div>
       <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
          <div className="bg-black/80 backdrop-blur-md rounded-[2.5rem] px-10 py-8 flex flex-col items-center border border-primary/30 shadow-2xl">
            <Growbot size="lg" mood="thinking" className="mb-4 animate-bounce" />
            <span className="text-2xl font-black text-white tracking-widest uppercase font-mono">Analyzing...</span>
            <span className="text-[10px] font-bold text-primary-light uppercase tracking-[0.2em] mt-2 opacity-80">Estimated ready in ~{loadingTimer}s</span>
          </div>
       </div>
    </div>
  );

  const theme = getSeverityTheme(result.severity, result.health);
  return (
    <div className="bg-surface min-h-screen pb-32 font-sans overflow-y-auto no-scrollbar">
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100 px-6 py-5 flex justify-between items-center shadow-sm">
         <div className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-widest"><Activity size={18} /> Analysis Report</div>
         <button onClick={handleReset} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-text-main"><X size={20} /></button>
      </div>
      <div className="p-6 sm:p-8 space-y-6 max-w-screen-xl mx-auto">
         {/* Diagnosis Header Section */}
         <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            <h1 className={`text-2xl sm:text-3xl font-black leading-tight mb-4 tracking-tight ${theme.base}`}>{result.diagnosis}</h1>
            <div className="flex flex-wrap gap-2">{result.issues.map((issue, i) => <span key={i} className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${theme.chip}`}>{issue}</span>)}</div>
         </div>

         {/* Info Row: Health & Stage on Left, Image on Right */}
         <div className="flex flex-row gap-4 sm:gap-6 items-stretch justify-between animate-in fade-in duration-700 delay-100">
            <div className="flex-1 grid grid-cols-1 gap-3 sm:gap-4">
                <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-soft flex flex-col justify-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Overall Health</span>
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${theme.bg.replace('bg-', 'bg-').replace('50', '500')}`}></div>
                        <span className="text-base font-black text-text-main">{result.health}</span>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-soft flex flex-col justify-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Growth Stage</span>
                    <div className="flex items-center gap-2">
                        <Sprout size={18} className="text-primary" />
                        <span className="text-base font-black text-text-main">{result.stage}</span>
                    </div>
                </div>
            </div>

            <div className="relative w-36 h-36 sm:w-48 sm:h-48 flex-shrink-0">
                <img src={images[0]} className="w-full h-full object-cover rounded-[2.5rem] shadow-card border-4 border-white" />
                <div className="absolute -bottom-2 -right-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 flex flex-col items-center min-w-[70px]">
                    <div className={`w-full text-center rounded-lg text-[10px] font-black py-1 text-white px-2 ${result.confidence > 80 ? 'bg-primary' : 'bg-orange-400'}`}>
                        {Math.round(result.confidence)}%
                    </div>
                    <span className="text-[7px] font-black text-gray-400 uppercase mt-1 tracking-widest">Confidence</span>
                </div>
            </div>
         </div>

         {/* Priority Action Card */}
         <div className={`p-6 rounded-[2.5rem] shadow-card relative overflow-hidden animate-in zoom-in-95 duration-700 delay-200 ${theme.card}`}>
            <div className="absolute -right-4 -top-4 opacity-10">
                <Growbot size="xl" mood="success" />
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3 opacity-90">
                    <Zap size={18} className="fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Priority AI Action</span>
                </div>
                <p className="text-lg sm:text-xl font-black leading-snug">{result.topAction}</p>
            </div>
         </div>

         {/* Recovery Checklist */}
         <div className="bg-white p-6 sm:p-8 rounded-[3rem] border border-gray-100 shadow-card animate-in slide-in-from-bottom-4 duration-700 delay-300">
             <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
                <CheckCircle size={22} className="text-primary" />
                <h3 className="text-sm font-black text-text-main uppercase tracking-[0.15em]">Recovery Protocol</h3>
             </div>
             {result.fixSteps.length ? <RecoveryChecklist steps={result.fixSteps} themeColor={theme.base} /> : <p className="text-sm text-gray-400 italic">No critical actions found.</p>}
         </div>

         {/* Action Buttons */}
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 pb-8 animate-in fade-in duration-1000 delay-500">
             <button onClick={handleShare} className="py-5 rounded-2xl border border-gray-200 text-text-main font-black text-sm flex items-center justify-center gap-3 hover:bg-white shadow-soft transition-all">
                {isSharing ? <Activity size={18} className="animate-spin" /> : <Share2 size={18} />} Share Report
             </button>
             <button onClick={handleSave} className="py-5 rounded-2xl bg-text-main text-white font-black text-sm flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
                <Copy size={18} /> Save to Journal
             </button>
         </div>
      </div>
    </div>
  );
};

export default Diagnose;