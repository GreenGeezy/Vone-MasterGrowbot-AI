import React, { useState, useRef } from 'react';
import { Camera, Upload, Zap, Activity, AlertTriangle, CheckCircle, X, Share2, Plus, Check } from 'lucide-react';
import { diagnosePlant, fileToGenerativePart } from '../services/geminiService';
import { DiagnosisResult, JournalEntry, Plant } from '../types';
import Growbot from '../components/Growbot';

interface DiagnoseProps {
  onSaveToJournal?: (entry: Omit<JournalEntry, 'id' | 'date'>) => void;
  plant?: Plant; 
}

const RecoveryChecklist: React.FC<{ steps: string[] }> = ({ steps }) => {
  const [checkedState, setCheckedState] = useState<boolean[]>(new Array(steps.length).fill(false));
  return (
    <div className="space-y-3 mt-4">
      {steps.map((step, idx) => (
        <div key={idx} onClick={() => {
            const up = [...checkedState]; up[idx] = !up[idx]; setCheckedState(up);
        }} className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all ${checkedState[idx] ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'} border`}>
          <div className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center ${checkedState[idx] ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
            {checkedState[idx] && <Check size={14} />}
          </div>
          <p className={`text-sm font-medium ${checkedState[idx] ? 'text-green-800 line-through opacity-70' : 'text-gray-700'}`}>{step}</p>
        </div>
      ))}
    </div>
  );
};

const Diagnose: React.FC<DiagnoseProps> = ({ onSaveToJournal }) => {
  const [image, setImage] = useState<string | null>(null);
  const [fileToAnalyze, setFileToAnalyze] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileToAnalyze(file);
      const reader = new FileReader();
      reader.onload = (ev) => { setImage(ev.target?.result as string); setResult(null); };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalysis = async () => {
    if (!fileToAnalyze) return alert("Please select an image first.");
    setAnalyzing(true);
    try {
      const base64Data = await fileToGenerativePart(fileToAnalyze);
      const diagnosis = await diagnosePlant([base64Data]); 
      setResult(diagnosis);
    } catch (e) { alert("Analysis failed. Try again."); } 
    finally { setAnalyzing(false); }
  };

  const handleSave = () => {
      if (onSaveToJournal && result && image) {
          onSaveToJournal({
              type: 'diagnosis',
              title: result.diagnosis,
              notes: `Health: ${result.health}%. Severity: ${result.severity}.`,
              images: [image],
              diagnosis: result
          });
          alert('Saved to Journal!');
      }
  };

  // 1. Landing State
  if (!image) {
    return (
      <div className="h-full flex flex-col p-6 pt-12 bg-surface">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
                <Growbot size="xl" mood="happy" />
            </div>
            <div className="space-y-2">
                <h2 className="text-3xl font-black text-text-main">AI Health Scan</h2>
                <p className="text-text-sub font-medium max-w-[200px] mx-auto">Instant diagnosis for pests, deficiency, and mold.</p>
            </div>
            <div className="w-full max-w-xs space-y-3 pt-8">
                <button onClick={() => cameraInputRef.current?.click()} className="w-full py-4 bg-black text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-transform"><Camera size={22} /> Take Photo</button>
                <button onClick={() => galleryInputRef.current?.click()} className="w-full py-4 bg-white text-text-main border border-gray-200 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-sm active:scale-95 transition-transform"><Upload size={22} /> Upload from Gallery</button>
            </div>
            <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileSelect} />
            <input type="file" ref={galleryInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
        </div>
      </div>
    );
  }

  // 2. Review State
  if (!result) {
      return (
          <div className="h-full flex flex-col bg-black relative">
              <img src={image} className="absolute inset-0 w-full h-full object-cover opacity-90" />
              {analyzing ? (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
                      <Growbot size="lg" mood="alert" />
                      <p className="mt-6 text-white font-mono font-bold tracking-widest animate-pulse">ANALYZING PLANT DATA...</p>
                  </div>
              ) : (
                  <div className="absolute bottom-0 left-0 right-0 p-8 pb-24 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex gap-4">
                      <button onClick={() => { setImage(null); setFileToAnalyze(null); }} className="flex-1 py-4 bg-white/20 backdrop-blur-md rounded-2xl text-white font-bold">Retake</button>
                      <button onClick={handleAnalysis} className="flex-[2] py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/30 flex items-center justify-center gap-2"><Zap size={20} fill="currentColor" /> Run Scan</button>
                  </div>
              )}
          </div>
      );
  }

  // 3. Results State (The "Beautiful" Part)
  return (
    <div className="h-full overflow-y-auto bg-surface p-4 pb-32">
        <div className="flex items-center justify-between mb-6">
            <button onClick={() => { setImage(null); setResult(null); }} className="p-2 bg-white rounded-full shadow-sm"><X size={20} /></button>
            <span className="font-black uppercase text-gray-300 text-xs tracking-widest">Diagnosis Report</span>
            <div className="w-10"></div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 shadow-card border border-gray-100 relative overflow-hidden mb-6">
            <div className={`absolute top-0 left-0 right-0 h-2 ${result.severity === 'high' ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-black text-text-main leading-tight mb-1">{result.diagnosis}</h2>
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${result.severity === 'high' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{result.severity} RISK</span>
                        <span className="text-xs text-gray-400 font-bold">{result.health}% Health Score</span>
                    </div>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${result.severity === 'high' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                    {result.severity === 'high' ? <AlertTriangle size={24} /> : <Activity size={24} />}
                </div>
            </div>
            
            <div className="mb-2 flex items-center gap-2 text-text-main font-bold">
                <CheckCircle size={18} className="text-primary" />
                <h3 className="uppercase text-xs tracking-wider text-gray-400">Recovery Protocol</h3>
            </div>
            <RecoveryChecklist steps={result.fixSteps} />
        </div>

        <button onClick={handleSave} className="w-full py-4 bg-text-main text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
            <Plus size={20} /> Save to Journal
        </button>
    </div>
  );
};

export default Diagnose;
