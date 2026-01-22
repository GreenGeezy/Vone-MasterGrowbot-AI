import React, { useState } from 'react';
import { Camera, AlertCircle, CheckCircle, Loader2, ScanLine, X, Sparkles, Activity, Thermometer } from 'lucide-react';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { diagnosePlant } from '../services/geminiService';
import { Plant } from '../types';

interface DiagnoseProps {
  onSaveToJournal: (entry: any) => void;
  plant: Plant;
}

const Diagnose: React.FC<DiagnoseProps> = ({ onSaveToJournal, plant }) => {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const takePicture = async () => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
        promptLabelHeader: 'Scan Plant',
      });

      if (image.base64String) {
        setImage(`data:image/jpeg;base64,${image.base64String}`);
        analyzePlant(image.base64String);
      }
    } catch (error) { console.error('Camera error:', error); }
  };

  const analyzePlant = async (base64Image: string) => {
    setIsAnalyzing(true);
    try {
      const diagnosis = await diagnosePlant(base64Image, plant?.strain);
      setResult(diagnosis);
    } catch (error: any) {
      alert(`Diagnosis Failed: ${error.message}`);
      setImage(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getTheme = () => {
      if (!result) return 'border-gray-100';
      if (result.healthy) return 'border-green-200 bg-green-50/50';
      if (result.severity === 'high') return 'border-red-200 bg-red-50/50';
      return 'border-orange-200 bg-orange-50/50';
  };

  return (
    <div className="p-6 pt-8 pb-24 h-full overflow-y-auto bg-surface relative">
      <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-main">Health Scan</h1>
            <p className="text-gray-500 text-sm">Gemini 2.5 Pro Vision</p>
          </div>
          <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center animate-pulse">
            <Activity size={20} />
          </div>
      </div>

      {!image ? (
        <div className="animate-fade-in space-y-6">
            <div onClick={takePicture} className="w-full aspect-[4/5] bg-gradient-to-br from-white to-gray-50 border-2 border-dashed border-primary/30 rounded-3xl flex flex-col items-center justify-center gap-6 cursor-pointer shadow-sm hover:border-primary transition-all group relative overflow-hidden">
              <div className="absolute w-64 h-64 bg-primary/5 rounded-full animate-ping opacity-75" />
              <div className="w-20 h-20 bg-primary text-white rounded-full flex items-center justify-center shadow-xl z-10 group-hover:scale-110 transition-transform">
                <Camera size={32} />
              </div>
              <div className="text-center z-10">
                  <h3 className="font-bold text-lg text-text-main">Initiate Scan</h3>
                  <p className="text-gray-400 text-sm">Detect pests & deficiencies</p>
              </div>
            </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <div className="relative w-full aspect-square rounded-3xl overflow-hidden shadow-lg border-4 border-white">
            <img src={image} alt="Diagnosis" className="w-full h-full object-cover" />
            {isAnalyzing && (
              <div className="absolute inset-0 z-20">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_15px_rgba(255,0,0,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-white">
                    <p className="font-mono text-lg font-bold tracking-widest animate-pulse">ANALYZING...</p>
                    <p className="text-xs opacity-80 mt-2">Connecting to Gemini 2.5 Pro</p>
                </div>
              </div>
            )}
            {!isAnalyzing && <button onClick={() => { setImage(null); setResult(null); }} className="absolute top-4 right-4 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center"><X size={16} /></button>}
          </div>

          {result && !isAnalyzing && (
            <div className="animate-slide-up space-y-6">
                <div className={`rounded-2xl p-6 shadow-xl border ${getTheme()} relative overflow-hidden`}>
                    <h2 className="text-xl font-black uppercase tracking-wide opacity-80">Diagnosis</h2>
                    <p className="text-2xl font-bold mt-1 mb-4 text-text-main">{result.diagnosis}</p>
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/50">
                        <h3 className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                            <Sparkles size={12} /> Priority AI Action
                        </h3>
                        <p className="font-medium leading-relaxed">{result.topAction}</p>
                    </div>
                </div>

                {!result.healthy && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
                            <Activity size={18} className="text-primary" /> Recovery Protocol
                        </h3>
                        <div className="space-y-3">
                            {result.fixSteps?.map((step: string, idx: number) => (
                                <div key={idx} className="flex gap-3 items-start p-3 bg-gray-50 rounded-xl">
                                    <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-xs font-bold text-gray-400">{idx + 1}</span>
                                    </div>
                                    <p className="text-sm text-gray-600">{step}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <h4 className="font-bold text-blue-700 text-xs uppercase mb-2">Yield Impact</h4>
                        <p className="text-xs text-blue-600">{result.yieldTips || "Stable"}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                        <h4 className="font-bold text-purple-700 text-xs uppercase mb-2">Quality Impact</h4>
                        <p className="text-xs text-purple-600">{result.qualityTips || "Stable"}</p>
                    </div>
                </div>

                <button 
                    onClick={() => {
                        onSaveToJournal({ type: 'diagnosis', result, image, notes: result.diagnosis });
                        alert("Analysis Saved!");
                    }}
                    className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg"
                >
                    Save Report
                </button>
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes scan { 0% { top: 0%; opacity: 0.5; } 50% { top: 100%; opacity: 1; } 100% { top: 0%; opacity: 0.5; } }`}</style>
    </div>
  );
};

export default Diagnose;
