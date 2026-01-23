import React, { useState } from 'react';
import { Camera, AlertTriangle, CheckCircle, X, Zap, Activity, Copy, Square, CheckSquare, ScanLine } from 'lucide-react';
import { diagnosePlant } from '../services/geminiService';
import { DiagnosisResult, JournalEntry, Plant } from '../types';
import Growbot from '../components/Growbot';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';

interface DiagnoseProps { onSaveToJournal?: (entry: any) => void; plant?: Plant; }

const Diagnose: React.FC<DiagnoseProps> = ({ onSaveToJournal, plant }) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  const takePicture = async () => {
    try {
      const photo = await CapacitorCamera.getPhoto({ quality: 90, resultType: CameraResultType.Base64, source: CameraSource.Prompt, promptLabelHeader: 'Scan Plant' });
      if (photo.base64String) {
        setImage(`data:image/jpeg;base64,${photo.base64String}`);
        setLoading(true);
        try {
            const diagnosis = await diagnosePlant(photo.base64String, plant?.strain);
            setResult(diagnosis);
        } catch (e) { alert("Analysis failed."); setImage(null); } 
        finally { setLoading(false); }
      }
    } catch (e) { console.error(e); }
  };

  const getTheme = (severity: string) => {
    if (severity === 'high') return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    if (severity === 'medium') return { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
    return { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
  };

  if (!image) return (
    <div className="h-full pb-32 flex flex-col bg-surface overflow-y-auto pt-6 px-6">
      <div className="text-center mb-8">
        <Growbot size="xl" mood="happy" className="mb-4 mx-auto" />
        <h1 className="text-3xl font-extrabold text-text-main">AI Health Scan</h1>
        <p className="text-gray-400 font-bold uppercase tracking-wider text-xs mt-2">Advanced Vision Analysis</p>
      </div>
      <div className="bg-white rounded-[2.5rem] p-4 shadow-card border border-gray-50">
          <button onClick={takePicture} className="w-full bg-text-main text-white rounded-[2rem] py-8 flex flex-col items-center gap-2 shadow-xl">
              <Camera size={40} className="text-primary" />
              <span className="font-black text-xl tracking-widest uppercase font-mono">Tap to Scan</span>
          </button>
      </div>
    </div>
  );

  if (loading) return (
    <div className="flex flex-col h-full bg-black relative">
       <img src={image} className="w-full h-full object-cover opacity-60" />
       <div className="absolute top-0 left-0 w-full h-1 bg-green-400 shadow-[0_0_20px_rgba(74,222,128,0.8)] z-20 animate-[scan_2s_ease-in-out_infinite]"></div>
       <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
          <div className="bg-black/80 backdrop-blur-md rounded-2xl px-8 py-4 border border-green-500/30">
            <span className="text-2xl font-black text-white tracking-widest uppercase font-mono animate-pulse">Scanning...</span>
          </div>
       </div>
       <style>{`@keyframes scan { 0% { top: 0%; opacity: 0.5; } 50% { top: 100%; opacity: 1; } 100% { top: 0%; opacity: 0.5; } }`}</style>
    </div>
  );

  const theme = getSeverityTheme(result?.severity || 'low');
  return (
    <div className="bg-surface min-h-screen pb-32 overflow-y-auto">
      <div className="bg-white/90 backdrop-blur p-4 flex justify-between items-center sticky top-0 z-20 border-b border-gray-100">
         <div className="flex items-center gap-2 font-bold uppercase text-xs tracking-widest"><Activity size={16} /> Report</div>
         <button onClick={() => { setImage(null); setResult(null); }} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
      </div>
      <div className="p-6 space-y-6">
         <h1 className={`text-3xl font-black leading-tight ${theme.color}`}>{result.diagnosis}</h1>
         <div className={`p-6 rounded-[2rem] shadow-sm relative overflow-hidden ${theme.bg} ${theme.border} border`}>
            <div className="flex items-center gap-2 mb-3 opacity-90"><Zap size={18} className="fill-current" /><span className="text-[10px] font-black uppercase tracking-[0.2em]">Priority AI Action</span></div>
            <p className="text-lg font-black leading-snug">{result.topAction}</p>
         </div>
         <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
             <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-50"><CheckCircle size={22} className="text-primary" /><h3 className="text-sm font-black uppercase tracking-[0.15em]">Recovery Protocol</h3></div>
             <div className="space-y-3">
                {result.fixSteps?.map((step: string, i: number) => (<div key={i} className="flex gap-3 items-start"><Square size={20} className="text-gray-300 mt-0.5" /><p className="text-sm font-semibold">{step}</p></div>))}
             </div>
         </div>
         <button onClick={() => { onSaveToJournal({ type: 'diagnosis', title: result.diagnosis, result, image }); alert("Saved!"); }} className="w-full py-5 rounded-2xl bg-text-main text-white font-black flex items-center justify-center gap-3 shadow-lg"><Copy size={18} /> Save to Journal</button>
      </div>
    </div>
  );
};
export default Diagnose;
