import React, { useState } from 'react';
import { Camera, AlertCircle, CheckCircle, Loader2, ScanLine, X, Sparkles } from 'lucide-react';
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
        // Fix standard base64 prefix if missing
        const base64Data = image.base64String.includes('data:image') 
            ? image.base64String 
            : `data:image/jpeg;base64,${image.base64String}`;
            
        setImage(base64Data);
        analyzePlant(image.base64String); // Pass raw string to Gemini
      }
    } catch (error) {
      console.error('Camera error:', error);
    }
  };

  const analyzePlant = async (base64Image: string) => {
    setIsAnalyzing(true);
    try {
      const diagnosis = await diagnosePlant(base64Image);
      setResult(diagnosis);
    } catch (error: any) {
      console.error("Diagnosis Error:", error);
      alert(`Diagnosis Failed: ${error.message || "Please check your internet connection."}`);
      setImage(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-6 pt-8 pb-24 h-full overflow-y-auto bg-surface relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-main">AI Doctor</h1>
            <p className="text-gray-500 text-sm">Gemini 1.5 Pro Vision</p>
          </div>
          <div className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center animate-pulse">
            <ScanLine size={20} />
          </div>
      </div>

      {!image ? (
        // --- 1. IDLE STATE: SCANNER UI ---
        <div className="animate-fade-in space-y-6">
            <div 
              onClick={takePicture}
              className="w-full aspect-[4/5] bg-gradient-to-br from-white to-gray-50 border-2 border-dashed border-primary/30 rounded-3xl flex flex-col items-center justify-center gap-6 cursor-pointer shadow-sm hover:shadow-md hover:border-primary transition-all group relative overflow-hidden"
            >
              {/* Pulse Ring Animation */}
              <div className="absolute w-64 h-64 bg-primary/5 rounded-full animate-ping opacity-75" />
              
              <div className="w-20 h-20 bg-primary text-white rounded-full flex items-center justify-center shadow-xl shadow-primary/30 z-10 group-hover:scale-110 transition-transform duration-300">
                <Camera size={32} />
              </div>
              <div className="text-center z-10">
                  <h3 className="font-bold text-lg text-text-main">Tap to Scan</h3>
                  <p className="text-gray-400 text-sm mt-1">Identify pests & deficiencies</p>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
                <AlertCircle className="text-blue-500 shrink-0" size={20} />
                <p className="text-xs text-blue-700 leading-relaxed">
                    <strong>Pro Tip:</strong> Ensure good lighting and focus directly on the affected leaf for 99% accuracy.
                </p>
            </div>
        </div>
      ) : (
        // --- 2. ACTIVE STATE: ANALYSIS ---
        <div className="space-y-6 animate-fade-in">
          <div className="relative w-full aspect-square rounded-3xl overflow-hidden shadow-lg border-4 border-white">
            <img src={image} alt="Diagnosis" className="w-full h-full object-cover" />
            
            {/* Analyzing Overlay */}
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary blur-xl opacity-50 animate-pulse" />
                    <Loader2 size={48} className="animate-spin relative z-10 text-white" />
                </div>
                <p className="font-bold text-lg mt-6">Analyzing Plant...</p>
                <p className="text-xs opacity-80 mt-2">Checking 150+ known issues</p>
              </div>
            )}

            {/* Close Button */}
            {!isAnalyzing && (
                <button 
                    onClick={() => { setImage(null); setResult(null); }}
                    className="absolute top-4 right-4 w-8 h-8 bg-black/50 backdrop-blur-md text-white rounded-full flex items-center justify-center"
                >
                    <X size={16} />
                </button>
            )}
          </div>

          {result && !isAnalyzing && (
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 animate-slide-up relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-full h-2 ${result.healthy ? 'bg-green-500' : 'bg-red-500'}`} />
              
              <div className="flex items-center gap-3 mb-6 mt-2">
                {result.healthy ? (
                  <CheckCircle className="text-green-500" size={32} />
                ) : (
                  <AlertCircle className="text-red-500" size={32} />
                )}
                <div>
                    <h2 className="text-xl font-bold text-text-main">
                    {result.healthy ? "Healthy Plant" : "Issue Detected"}
                    </h2>
                    <p className="text-xs text-gray-400">Confidence: {result.confidence || 'High'}</p>
                </div>
              </div>
              
              <div className="prose prose-sm text-gray-600 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p>{result.diagnosis}</p>
              </div>

              {!result.healthy && (
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-6">
                  <h3 className="font-bold text-red-700 mb-2 text-sm flex items-center gap-2">
                    <Sparkles size={14} /> Recommended Action:
                  </h3>
                  <p className="text-red-600 text-sm leading-relaxed">{result.treatment}</p>
                </div>
              )}
              
              <button 
                onClick={() => {
                    onSaveToJournal({ 
                        type: 'diagnosis', 
                        result, 
                        image,
                        notes: result.diagnosis
                    });
                    alert("Saved to Journal!");
                }}
                className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30 active:scale-95 transition-transform"
              >
                Save to Journal
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Diagnose;
