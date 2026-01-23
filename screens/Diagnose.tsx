import React, { useState } from 'react';
import { Camera, AlertTriangle, CheckCircle, X, Zap, Activity, Copy, Square, CheckSquare, ScanLine, Share2 } from 'lucide-react';
import { diagnosePlant } from '../services/geminiService';
import { shareContent, formatDiagnosisForShare } from '../services/shareService';
import { DiagnosisResult, JournalEntry, Plant } from '../types';
import Growbot from '../components/Growbot';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';

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
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  const takePicture = async () => {
    try {
      const photo = await CapacitorCamera.getPhoto({
        quality: 90,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
        promptLabelHeader: 'Scan Plant Health'
      });

      if (photo.base64String) {
        setImage(`data:image/jpeg;base64,${photo.base64String}`);
        setLoading(true);
        try {
            const diagnosis = await diagnosePlant(photo.base64String, plant?.strain);
            setResult(diagnosis);
        } catch (e: any) {
            alert(`Scan Error: ${e.message}.`);
            setImage(null);
        } finally {
            setLoading(false);
        }
      }
    } catch (e) {
      console.error("Camera Error:", e);
    }
  };

  const handleShare = async () => {
      if (!result) return;
      const text = formatDiagnosisForShare(result);
      await shareContent('My Plant Scan', text, 'https://mastergrowbot.ai');
  };

  const getTheme = (severity: string) => {
    if (severity === 'high') return { base: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: AlertTriangle };
    if (severity === 'medium') return { base: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: Activity };
    return { base: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle };
  };

  if (!image) return (
    <div className="h-full pb-32 flex flex-col bg-surface overflow-y-auto pt-6 px-6">
      <div className="text-center mb-8">
        <Growbot size="xl" mood="happy" className="mb-4 mx-auto" />
        <h1 className="text-3xl font-extrabold text-text-main">AI Health Scan</h1>
        <p className="text-gray-400 font-bold uppercase tracking-wider text-xs mt-2">Gemini 2.5 Pro Vision</p>
      </div>
      
      <div className="bg-white rounded-[2.5rem] p-4 shadow-card border border-gray-50">
          <button onClick={takePicture} className="w-full bg-text-main text-white rounded-[2rem] py-8 flex flex-col items-center gap-2 shadow-xl hover:scale-[1.02] transition-transform">
              <Camera size={40} className="text-primary-light" />
              <span className="font-black text-xl tracking-widest uppercase font-mono">Tap to Scan</span>
          </button>
      </div>
      
      <p className="text-center text-xs text-gray-400 mt-8 max-w-[200px] mx-auto leading-relaxed">
          Analyzes leaves for pests, deficiencies, and diseases with 98% accuracy.
      </p>
    </div>
  );

  if (loading) return (
    <div className="flex flex-col h-full bg-black relative">
       <img src={image} className="w-full h-full object-cover opacity-60" />
       <div className="absolute top-0 left-0 w-full h-1 bg-green-400 shadow-[0_0_20px_rgba(74,222,128,0.9)] z-20 animate-scan"></div>
       <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
          <div className="bg-black/80 backdrop-blur-md rounded-2xl px-8 py-6 border border-green-500/30 flex flex-col items-center gap-4">
            <Growbot size="md" mood="thinking" className="animate-bounce" />
            <div>
                <span className="text-xl font-black text-white tracking-widest uppercase font-mono animate-pulse block text-center">Analyzing...</span>
                <span className="text-[10px] text-green-400 font-mono uppercase tracking-[0.2em] block text-center mt-1">Extracting Vectors</span>
            </div>
          </div>
       </div>
    </div>
  );

  const theme = getTheme(result?.severity || 'low');
  return (
    <div className="bg-surface min-h-screen pb-32 overflow-y-auto font-sans">
      <div className="bg-white/90 backdrop-blur p-4 flex justify-between items-center sticky top-0 z-20 border-b border-gray-100 shadow-sm">
         <div className="flex items-center gap-2 font-black uppercase text-xs tracking-widest text-text-main">
             <Activity size={16} className="text-primary" /> Analysis Report
         </div>
         <button onClick={() => { setImage(null); setResult(null); }} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20} /></button>
      </div>
      
      <div className="p-6 space-y-6">
         <div className="animate-in fade-in slide-in-from-top-4 duration-700">
             <div className="flex items-center gap-2 mb-2">
                 <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${theme.bg} ${theme.base}`}>
                     {result?.severity} Severity
                 </span>
                 <span className="text-xs font-bold text-gray-400">{result?.confidence}% Confidence</span>
             </div>
             <h1 className={`text-3xl font-black leading-tight tracking-tight ${theme.base}`}>{result?.diagnosis}</h1>
         </div>

         <div className={`p-6 rounded-[2rem] shadow-sm relative overflow-hidden ${theme.bg} ${theme.border} border animate-in zoom-in-95 duration-500 delay-150`}>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3 opacity-90">
                    <Zap size={18} className="fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Priority AI Action</span>
                </div>
                <p className="text-lg font-black leading-snug">{result?.topAction}</p>
            </div>
         </div>

         <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-card">
             <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-50">
                <CheckCircle size={22} className="text-primary" />
                <h3 className="text-sm font-black text-text-main uppercase tracking-[0.15em]">Recovery Protocol</h3>
             </div>
             {result?.fixSteps && <RecoveryChecklist steps={result.fixSteps} themeColor={theme.base} />}
         </div>

         <div className="grid grid-cols-1 gap-4">
             <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                 <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block mb-1">Yield Impact</span>
                 <p className="text-sm font-bold text-blue-900">{result?.yieldTips}</p>
             </div>
         </div>

         <div className="flex gap-3 pt-4">
             <button onClick={handleShare} className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:bg-gray-50">
                 <Share2 size={20} className="text-text-main" />
             </button>
             <button 
                onClick={() => { 
                    if (onSaveToJournal && result) {
                        onSaveToJournal({ type: 'diagnosis', title: result.diagnosis, result, image }); 
                        alert("Saved to Journal!");
                    }
                }} 
                className="flex-1 py-4 rounded-2xl bg-text-main text-white font-black flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-transform"
             >
                <Copy size={18} /> Save Report
             </button>
         </div>
      </div>
    </div>
  );
};

export default Diagnose;
