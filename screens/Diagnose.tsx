import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Zap, Activity, CheckSquare, Square, ChevronRight, Droplet, Calendar, Scale, ShieldAlert, Wind, CheckCircle, Share2, Save, RotateCcw, ScanLine } from 'lucide-react';
import { diagnosePlant, ExtendedDiagnosisResult } from '../services/geminiService';
import { Plant } from '../types';
import Growbot from '../components/Growbot';
import { STRAIN_DATABASE } from '../data/strains';
import { Share } from '@capacitor/share';

/**
 * Health Score Mapping help
 */
const getHealthRating = (score: number) => {
  if (score >= 90) return "Thriving";
  if (score >= 75) return "Great";
  if (score >= 60) return "Good";
  if (score >= 45) return "Average";
  if (score >= 30) return "Suboptimal";
  if (score >= 15) return "Poor";
  return "Struggling"; // 0-14
};

const MetricCard = ({ icon: Icon, label, value, subValue, color = "blue" }: any) => (
  <div className={`bg-white/60 backdrop-blur-md p-3 rounded-2xl border border-${color}-100 shadow-sm flex flex-col items-center text-center`}>
    <div className={`p-2 bg-${color}-50 text-${color}-600 rounded-full mb-1`}><Icon size={16} /></div>
    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
    <span className="text-sm font-black text-gray-800 leading-tight">{value || "--"}</span>
    {subValue && <span className="text-[9px] text-gray-500 font-medium">{subValue}</span>}
  </div>
);

const PreventionSection = ({ tips }: { tips: string[] }) => (
  <div className="bg-orange-50/50 border border-orange-100 rounded-[2rem] p-5 mt-4">
    <div className="flex items-center gap-2 mb-3"><ShieldAlert size={18} className="text-orange-500" /><h3 className="text-xs font-black text-orange-700 uppercase tracking-widest">Prevention & Risks</h3></div>
    <ul className="space-y-2">{tips.map((tip, i) => (<li key={i} className="flex items-start gap-2 text-xs font-medium text-orange-800/80 leading-relaxed"><div className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-300" />{tip}</li>))}</ul>
  </div>
);

const RecoveryChecklist = ({ steps, themeColor }: { steps: string[], themeColor: string }) => {
  const [checkedState, setCheckedState] = useState<boolean[]>(new Array(steps.length).fill(false));
  return (
    <div className="space-y-2 mt-3">
      {steps.map((step, idx) => (
        <div key={idx} onClick={() => { const updated = [...checkedState]; updated[idx] = !updated[idx]; setCheckedState(updated); }} className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${checkedState[idx] ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className={`mt-0.5 transition-colors ${checkedState[idx] ? 'text-gray-300' : themeColor}`}>{checkedState[idx] ? <CheckSquare size={18} /> : <Square size={18} />}</div>
          <p className={`text-xs sm:text-sm leading-snug transition-all ${checkedState[idx] ? 'text-gray-400 line-through' : 'text-gray-700 font-semibold'}`}>{step}</p>
        </div>
      ))}
    </div>
  );
};

interface DiagnoseProps {
  plant?: Plant;
  onBack?: () => void;
  onSaveToJournal?: (entry: any) => void;
}

const Diagnose: React.FC<DiagnoseProps> = ({ plant, onBack, onSaveToJournal }) => {
  const [image, setImage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null); // NEW: For Review Step
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtendedDiagnosisResult | null>(null);
  const [strain, setStrain] = useState<string>(plant?.strain || '');
  const [growMethod, setGrowMethod] = useState<'Indoor' | 'Outdoor' | 'Greenhouse'>('Indoor');
  const [showStrainMenu, setShowStrainMenu] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    let interval: any;
    if (loading) {
      setTimeLeft(15);
      interval = setInterval(() => setTimeLeft(prev => prev > 0 ? prev - 1 : 0), 1000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const processImage = async (dataUrl: string) => {
    setImage(dataUrl);
    setPreviewImage(null); // Clear preview once processing starts
    setLoading(true);
    setResult(null);
    try {
      const diagnosis = await diagnosePlant(dataUrl, { strain: strain === 'Leave Blank' ? undefined : strain, growMethod });
      setResult(diagnosis);
    } catch (e) {
      alert("Analysis failed. Please check connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartCamera = async () => {
    try {
      // Force environment facing mode for rear camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: 'environment' }
        }
      }).catch(() => navigator.mediaDevices.getUserMedia({ video: true })); // Fallback

      streamRef.current = stream;
      setShowCamera(true);
    } catch (err) {
      cameraInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    setShowCamera(false);
  };

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      stopCamera();
      setPreviewImage(dataUrl); // GO TO REVIEW STEP
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      // STRICT: Ensure only images are processed (No Video)
      if (!file.type.startsWith('image/')) {
        alert("Please select a photo. Video analysis is not supported.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string); // ALSO GO TO REVIEW STEP FOR GALLERY
      };
      reader.readAsDataURL(file);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    try {
      await Share.share({
        title: 'MasterGrowbot Diagnosis',
        text: `My plant health is rated '${getHealthRating(result.healthScore || 0)}'. Diagnose yours with MasterGrowbot AI!`,
        dialogTitle: 'Share Result'
      });
    } catch (e) {
      if (navigator.share) {
        navigator.share({ title: 'Diagnosis', text: `My plant is ${getHealthRating(result.healthScore || 0)}` });
      } else {
        alert("Sharing not supported on this browser.");
      }
    }
  };

  const handleSave = () => {
    if (onSaveToJournal && result && image) {
      const rating = getHealthRating(result.healthScore || 0);
      onSaveToJournal({
        id: Date.now().toString(),
        date: new Date().toLocaleDateString(),
        type: 'Health Check',
        notes: `AI Analysis: ${result.diagnosis}. Health: ${rating}. Action: ${result.topAction}`,
        image: image,
      });
      alert("Saved to Journal! 📝");
    } else {
      alert("Could not save entry.");
    }
  };

  // Filter Strains
  const filteredStrains = STRAIN_DATABASE.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // 1. Loading State (UPDATED: Fullscreen Image + Overlay)
  if (loading) return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      {/* Full Screen Background Image */}
      {image && <img src={image} className="absolute inset-0 w-full h-full object-cover opacity-50" />}

      {/* Pulse Overlay */}
      <div className="absolute inset-0 bg-green-500/10 animate-pulse"></div>

      {/* Scanning Line */}
      <div className="absolute top-0 left-0 w-full h-2 bg-green-400 shadow-[0_0_20px_rgba(74,222,128,1)] animate-[scan_2s_ease-in-out_infinite] z-10"></div>

      <div className="relative z-20 text-center p-8 bg-black/60 rounded-3xl backdrop-blur-md border border-white/10 m-6">
        <Growbot size="lg" mood="thinking" className="mb-4 mx-auto" />
        <h2 className="text-2xl font-black uppercase tracking-widest text-green-400 mb-2">Analyzing Photo</h2>
        <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-6">Processing Plant Genetics...</p>
        <div className="text-4xl font-mono text-white font-black">{timeLeft}s</div>
      </div>
    </div>
  );

  // 2. Camera View
  if (showCamera) return (
    <div className="fixed inset-0 z-[60] bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        controls={false} // CRITICAL
        className="absolute inset-0 w-full h-full object-cover z-0"
        style={{ pointerEvents: 'none' }}
      />
      <div className="relative z-10 w-full h-full flex flex-col justify-between py-12">
        <p className="text-center text-white/80 font-bold text-sm drop-shadow-md mt-4">Position plant in frame</p>
        <div className="flex justify-center items-center gap-8 pb-12">
          <button onClick={handleCapture} className="w-20 h-20 bg-white/20 rounded-full border-4 border-white backdrop-blur-sm active:scale-95 transition-transform flex items-center justify-center cursor-pointer">
            <div className="w-16 h-16 bg-white rounded-full"></div>
          </button>
        </div>
        <button onClick={stopCamera} className="absolute top-6 right-6 text-white bg-black/40 p-3 rounded-full backdrop-blur-md hover:bg-black/60"><X /></button>
      </div>
    </div>
  );

  // 3. Review Step (NEW: Retake vs Analyze)
  if (previewImage) return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <img src={previewImage} className="flex-1 w-full object-contain bg-black" />
      <div className="h-32 bg-gray-900 px-6 flex items-center justify-between gap-4 shrink-0">
        <button onClick={() => { setPreviewImage(null); handleStartCamera(); }} className="flex-1 py-4 bg-gray-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2">
          <RotateCcw size={18} /> Retake
        </button>
        <button onClick={() => processImage(previewImage)} className="flex-[2] py-4 bg-green-500 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.4)]">
          <ScanLine size={20} /> Analyze Plant
        </button>
      </div>
    </div>
  );

  // 4. Result View
  if (result) {
    const isCritical = result.severity === 'high';
    const themeColor = isCritical ? 'text-red-500' : result.severity === 'medium' ? 'text-orange-500' : 'text-green-500';
    const bgTheme = isCritical ? 'bg-red-500' : result.severity === 'medium' ? 'bg-orange-500' : 'bg-green-600';
    const healthRating = getHealthRating(result.healthScore || 0);

    return (
      <div className="bg-gray-50 min-h-screen pb-32 overflow-y-auto font-sans">
        <div className="sticky top-0 z-[60] bg-white/90 backdrop-blur px-6 py-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-2 text-gray-800 font-black uppercase text-xs tracking-widest"><Activity size={16} className={themeColor} /> Health Report</div>
          {/* Thumbnail Image: Explicitly rendered */}
          <div className="flex items-center gap-3">
            {image && <img src={image} className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover" />}
            <button onClick={() => { setResult(null); setImage(null); }} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={18} /></button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-w-lg mx-auto">
          {/* ... Content ... */}
          <div className="animate-in fade-in slide-in-from-top-4">
            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 text-white ${bgTheme}`}>{result.severity} Severity • {result.confidence}% Conf.</span>
            <h1 className={`text-3xl font-black leading-tight ${themeColor}`}>{result.diagnosis}</h1>
            <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wide">Detected in {result.growthStage}</p>
          </div>

          <div className={`${bgTheme} text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden`}>
            <div className="relative z-10"><div className="flex items-center gap-2 mb-2 opacity-90"><Zap size={16} fill="currentColor" /><span className="text-[10px] font-black uppercase tracking-widest">Priority Action</span></div><p className="text-lg font-bold leading-snug">{result.topAction}</p></div>
            <Activity size={100} className="absolute -right-4 -bottom-4 opacity-10 rotate-12" />
          </div>

          <div className="grid grid-cols-2 gap-3 animate-in fade-in delay-100">
            <MetricCard icon={Scale} label="Health Score" value={healthRating} color="purple" />
            <MetricCard icon={Calendar} label="Harvest In" value={result.harvestWindow} color="green" />
            <MetricCard icon={Droplet} label="Nutrient Target" value={result.nutrientTargets?.ec || "N/A"} subValue={`pH: ${result.nutrientTargets?.ph || "--"}`} color="blue" />
            <MetricCard icon={Wind} label="VPD Target" value={result.environmentTargets?.vpd || "N/A"} subValue={`${result.environmentTargets?.temp || "--"} / ${result.environmentTargets?.rh || "--"}`} color="cyan" />
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2 border-b border-gray-50 pb-2"><CheckCircle size={18} className={themeColor} /><h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">Recovery Protocol</h3></div>
            <RecoveryChecklist steps={result.fixSteps} themeColor={themeColor} />
            {result.preventionTips && result.preventionTips.length > 0 && <PreventionSection tips={result.preventionTips} />}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <button onClick={handleSave} className="py-4 bg-gray-900 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"><Save size={18} /> Save to Journal</button>
            <button onClick={handleShare} className="py-4 bg-gray-100 text-gray-900 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-gray-200"><Share2 size={18} /> Share Result</button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Initial View (Main)
  return (
    <div className="bg-gray-50 h-full pb-20 overflow-y-auto w-full absolute inset-0">
      <div className="bg-white px-6 pt-12 pb-8 rounded-b-[3rem] shadow-sm mb-6">
        <div className="flex justify-between items-center mb-4">{onBack && <button onClick={onBack}><ChevronRight className="rotate-180 text-gray-400" /></button>}<Growbot size="lg" mood="happy" /><div className="w-6" /></div>
        <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Analyze Your Plant's Health with AI</h1>
        <p className="text-sm text-gray-500 font-medium">Scan or upload a photo for instant report on plant health and actions to take to save your grow from pests, diseases, and fix deficiencies.</p>
      </div>

      <div className="px-6 space-y-6 max-w-md mx-auto">
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 space-y-5">
          <div className="relative">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Genetics</label>
            <div onClick={() => setShowStrainMenu(!showStrainMenu)} className="w-full bg-gray-50 p-4 rounded-xl font-bold text-gray-800 flex justify-between items-center cursor-pointer border border-transparent hover:border-green-200 transition-all">
              {strain || "Select Strain / Auto-Detect"}
              <ChevronRight size={16} className={`text-gray-400 transition-transform ${showStrainMenu ? 'rotate-90' : ''}`} />
            </div>
            {showStrainMenu && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 p-2 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                <input className="w-full text-xs p-3 bg-gray-50 rounded-lg mb-2 outline-none font-bold" placeholder="Search Strains..." autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                <div className="grid grid-cols-2 gap-2 mb-2 pb-2 border-b border-gray-50">
                  <button onClick={() => { setStrain("Auto-Detect"); setShowStrainMenu(false); }} className="p-2 bg-green-50 text-green-700 rounded-lg text-xs font-bold text-center">✨ Auto-Detect</button>
                  <button onClick={() => { setStrain("Custom Strain"); setShowStrainMenu(false); }} className="p-2 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold text-center">+ Custom</button>
                </div>
                {filteredStrains.map(s => (
                  <button key={s.id} onClick={() => { setStrain(s.name); setShowStrainMenu(false); }} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg text-sm font-bold text-gray-800 flex justify-between items-center group">
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Environment</label>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              {['Indoor', 'Outdoor', 'Greenhouse'].map((env) => (<button key={env} onClick={() => setGrowMethod(env as any)} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${growMethod === env ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}>{env}</button>))}
            </div>
          </div>
        </div>

        <button onClick={handleStartCamera} className="w-full bg-gray-900 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-gray-200 flex items-center justify-center gap-3 active:scale-95 transition-transform"><Camera size={24} className="text-green-400" /> Scan with Camera</button>
        <button onClick={() => galleryInputRef.current?.click()} className="w-full bg-white text-gray-600 py-4 rounded-[2rem] font-bold border border-gray-200 flex items-center justify-center gap-2"><Upload size={18} /> Upload from Gallery</button>
      </div>
      <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
      <input type="file" ref={galleryInputRef} accept="image/*" className="hidden" onChange={handleFileSelect} />
    </div>
  );
};

export default Diagnose;