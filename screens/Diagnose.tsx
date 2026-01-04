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
            checkedState[idx] ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm'
          }`}
        >
          <div className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
             checkedState[idx] ? 'bg-gray-200 border-gray-200 text-white' : `border-${themeColor === 'red' ? 'alert-red' : themeColor === 'yellow' ? 'alert-yellow' : 'primary'} text-white`
          }`}>
             {checkedState[idx] && <Check size={14} strokeWidth={4} />}
          </div>
          <p className={`text-sm font-medium leading-relaxed ${checkedState[idx] ? 'text-gray-400 line-through' : 'text-text-main'}`}>{step}</p>
        </div>
      ))}
    </div>
  );
};

const Diagnose: React.FC<DiagnoseProps> = ({ onSaveToJournal, plant }) => {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanProgress, setScanProgress] = useState(0);

  // Sharing State
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    let interval: any;
    if (analyzing) {
      setScanProgress(0);
      interval = setInterval(() => {
        setScanProgress(prev => {
           if (prev >= 90) return prev; 
           return prev + (Math.random() * 10);
        });
      }, 500);
    } else {
      setScanProgress(100);
    }
    return () => clearInterval(interval);
  }, [analyzing]);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImage(ev.target?.result as string);
        setResult(null); // Reset previous results
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleAnalysis = async () => {
    if (!image || !fileInputRef.current?.files?.[0]) return;

    setAnalyzing(true);
    try {
      const file = fileInputRef.current.files[0];
      const base64Data = await fileToGenerativePart(file);
      // Calls the optimized geminiService function
      const diagnosis = await diagnosePlant([base64Data]); 
      setResult(diagnosis);
    } catch (error) {
      console.error("Analysis failed", error);
      alert("Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = () => {
      if (onSaveToJournal && result && image) {
          onSaveToJournal({
              type: 'diagnosis',
              title: result.diagnosis,
              notes: `Severity: ${result.severity}. Health Score: ${result.health}.`,
              images: [image],
              diagnosis: result
          });
          // Show success feedback
          const btn = document.getElementById('save-btn');
          if(btn) {
              const originalText = btn.innerText;
              btn.innerText = 'Saved to Journal!';
              setTimeout(() => btn.innerText = originalText, 2000);
          }
      }
  };

  const handleShare = async () => {
      if (!result || !image) return;
      setIsSharing(true);
      try {
          // 1. Generate text format
          const shareText = formatDiagnosisForShare(result, plant);
          
          // 2. Try Native Share first (Mobile)
          const shared = await shareContent(shareText, 'My MasterGrowbot Report');
          
          // 3. If native share not supported/cancelled, generate a link
          if (!shared) {
              const url = await generatePublicLink({
                  diagnosis: result,
                  plantName: plant?.name || 'My Plant',
                  date: new Date().toISOString()
              });
              setShareUrl(url);
          }
      } catch (e) {
          console.error('Share failed', e);
      } finally {
          setIsSharing(false);
      }
  };

  const copyToClipboard = () => {
      if (shareUrl) {
          navigator.clipboard.writeText(shareUrl);
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
      }
  };

  const resetScan = () => {
      setImage(null);
      setResult(null);
      setScanProgress(0);
      setShareUrl(null);
  };

  // 1. Idle State
  if (!image) {
    return (
      <div className="h-full flex flex-col p-6 animate-in fade-in duration-500">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse"></div>
                <Growbot size="xl" mood="happy" />
            </div>
            <div className="space-y-2 max-w-[80%]">
                <h2 className="text-2xl font-black text-text-main tracking-tight">AI Health Scan</h2>
                <p className="text-text-sub font-medium">Snap a photo of your plant. I'll identify pests, deficiencies, or stress in seconds.</p>
            </div>

            <div className="w-full max-w-xs space-y-4 pt-8">
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 bg-primary hover:bg-primary-dark active:scale-95 transition-all rounded-2xl shadow-lg shadow-primary/30 flex items-center justify-center gap-3 text-white font-bold text-lg group"
                >
                    <Camera size={24} className="group-hover:rotate-12 transition-transform" />
                    Take Photo
                </button>
                <p className="text-xs text-center text-gray-400 font-medium">Supported: Leaves, Stems, Buds</p>
            </div>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                capture="environment"
                onChange={handleCapture}
            />
        </div>
      </div>
    );
  }

  // 2. Review & Analyzing State
  if (!result) {
      return (
          <div className="h-full flex flex-col bg-black relative">
              <img src={image} alt="Scan preview" className="absolute inset-0 w-full h-full object-cover opacity-80" />
              
              {/* Scanning Overlay */}
              {analyzing && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                      <Growbot size="lg" mood="alert" />
                      <div className="mt-8 w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-300 ease-out" style={{ width: `${scanProgress}%` }}></div>
                      </div>
                      <p className="mt-4 text-white font-mono text-sm tracking-widest animate-pulse">ANALYZING BIOMETRICS...</p>
                  </div>
              )}

              {/* Confirm UI */}
              {!analyzing && (
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent pt-24 space-y-4">
                      <div className="flex gap-4">
                          <button onClick={resetScan} className="flex-1 py-4 bg-white/10 backdrop-blur rounded-xl text-white font-bold border border-white/20">Retake</button>
                          <button onClick={handleAnalysis} className="flex-[2] py-4 bg-primary rounded-xl text-white font-bold shadow-xl shadow-primary/20 flex items-center justify-center gap-2">
                              <Zap size={20} fill="currentColor" /> Run Diagnosis
                          </button>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  // 3. Results State
  const theme = result.severity === 'high' ? { color: 'text-alert-red', bg: 'bg-alert-red/10', border: 'border-alert-red/20', base: 'red' } :
                result.severity === 'medium' ? { color: 'text-alert-yellow', bg: 'bg-alert-yellow/10', border: 'border-alert-yellow/20', base: 'yellow' } :
                { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', base: 'green' };

  return (
    <div className="h-full overflow-y-auto bg-surface p-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
            <button onClick={resetScan} className="p-2 -ml-2 text-text-sub hover:text-text-main"><X size={24} /></button>
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Scan Report</span>
            <div className="w-8"></div> 
        </div>

        {/* Share Modal/Overlay */}
        {shareUrl && (
            <div className="mb-6 p-4 bg-white rounded-2xl border border-primary/20 shadow-lg animate-in slide-in-from-top-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 text-primary font-bold">
                        <Share2 size={18} />
                        <h3>Share Link Ready</h3>
                    </div>
                    <button onClick={() => setShareUrl(null)} className="text-gray-400"><X size={16}/></button>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <p className="flex-1 text-xs text-gray-500 truncate font-mono">{shareUrl}</p>
                    <button onClick={copyToClipboard} className={`p-2 rounded-md transition-colors ${copySuccess ? 'bg-green-100 text-green-600' : 'bg-white shadow-sm text-text-main'}`}>
                        {copySuccess ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                </div>
            </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-[2.5rem] p-1 shadow-card overflow-hidden mb-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* Image Banner */}
            <div className="h-48 w-full relative rounded-[2rem] overflow-hidden group">
                <img src={image} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" alt="Analysis Target" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-4 left-4 text-white">
                    <p className="text-xs font-medium opacity-80">Detected Issue</p>
                    <h2 className="text-2xl font-black tracking-tight">{result.diagnosis}</h2>
                </div>
                <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full backdrop-blur-md bg-white/20 border border-white/30 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5`}>
                    <div className={`w-2 h-2 rounded-full ${result.severity === 'high' ? 'bg-red-500' : result.severity === 'medium' ? 'bg-yellow-400' : 'bg-green-400'} animate-pulse`}></div>
                    {result.severity} Severity
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 p-2 mt-2">
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <div className="flex items-center gap-2 mb-1 text-gray-400">
                        <Activity size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Health Score</span>
                    </div>
                    <p className="text-2xl font-black text-text-main">{result.health}</p>
                </div>
                <div className={`rounded-2xl p-4 border ${theme.bg} ${theme.border}`}>
                    <div className={`flex items-center gap-2 mb-1 ${theme.color}`}>
                        <AlertTriangle size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Confidence</span>
                    </div>
                    <p className={`text-2xl font-black ${theme.color}`}>{Math.round((result.confidence || 0.95) * 100)}%</p>
                </div>
            </div>
        </div>

         {/* Recovery Checklist */}
         <div className="bg-white p-6 sm:p-8 rounded-[3rem] border border-gray-100 shadow-card animate-in slide-in-from-bottom-4 duration-700 delay-300">
             <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
                <CheckCircle size={22} className="text-primary" />
                <h3 className="text-sm font-black text-text-main uppercase tracking-[0.15em]">Recovery Protocol</h3>
             </div>
             {result.fixSteps && result.fixSteps.length > 0 ? (
                <RecoveryChecklist steps={result.fixSteps} themeColor={theme.base} />
             ) : (
                <p className="text-sm text-gray-400 italic">No specific actions required. Monitor closely.</p>
             )}
         </div>

         {/* Action Buttons */}
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 pb-8 animate-in fade-in duration-1000 delay-500">
             <button onClick={handleShare} className="py-5 rounded-2xl border border-gray-200 text-text-main font-black text-sm flex items-center justify-center gap-3 hover:bg-white shadow-soft transition-all">
                {isSharing ? <Activity size={18} className="animate-spin" /> : <Share2 size={18} />} Share Report
             </button>
             <button id="save-btn" onClick={handleSave} className="py-5 rounded-2xl bg-text-main text-white font-black text-sm flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all active:scale-95">
                <Plus size={18} /> Save to Journal
             </button>
         </div>
    </div>
  );
};

export default Diagnose;
