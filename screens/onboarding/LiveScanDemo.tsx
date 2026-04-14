import React, { useState, useEffect, useRef } from 'react';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { Capacitor } from '@capacitor/core';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { diagnosePlant } from '../../services/geminiService';
import { ScanLine, ChevronRight, Camera, Leaf, AlertCircle, Upload } from 'lucide-react';

interface LiveScanDemoProps {
  onScanComplete: (result: any, imageDataUrl: string) => void;
  onSkip: () => void;
  onBack: () => void;
}

type DemoState = 'intro' | 'scanning' | 'error';

const LiveScanDemo: React.FC<LiveScanDemoProps> = ({ onScanComplete, onSkip, onBack }) => {
  const [demoState, setDemoState] = useState<DemoState>('intro');
  const [scanProgress, setScanProgress] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const scanInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isWeb = !Capacitor.isNativePlatform();

  useEffect(() => {
    return () => {
      if (scanInterval.current) clearInterval(scanInterval.current);
    };
  }, []);

  const startScanning = async (dataUrl: string) => {
    setCapturedImage(dataUrl);
    setDemoState('scanning');
    setScanProgress(0);

    let progress = 0;
    scanInterval.current = setInterval(() => {
      progress += Math.random() * 8 + 2;
      if (progress >= 90) {
        progress = 90;
        if (scanInterval.current) clearInterval(scanInterval.current);
      }
      setScanProgress(Math.min(progress, 90));
    }, 150);

    try {
      const base64 = dataUrl.split(',')[1] || dataUrl;
      const result = await diagnosePlant(base64, {
        growMethod: 'Indoor',
        stage: 'Vegetative',
      });

      if (scanInterval.current) clearInterval(scanInterval.current);
      setScanProgress(100);

      setTimeout(() => {
        onScanComplete(result, dataUrl);
      }, 600);
    } catch (err) {
      if (scanInterval.current) clearInterval(scanInterval.current);
      setErrorMsg('Analysis failed. Check your connection and try again.');
      setDemoState('error');
    }
  };

  const handleOpenCamera = async () => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 80,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        allowEditing: false,
        width: 1200,
      });
      if (image.dataUrl) {
        await startScanning(image.dataUrl);
      }
    } catch (e) {
      // User cancelled — stay on intro
    }
  };

  const handleWebFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) startScanning(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Scanning state (shared between native + web)
  if (demoState === 'scanning' && capturedImage) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col font-sans">
        <div className="relative flex-1 min-h-0" style={{ minHeight: 240 }}>
          <img src={capturedImage} className="w-full h-full object-cover" style={{ maxHeight: 340 }} alt="Scanning" />
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-[#059669] to-transparent animate-scan shadow-lg" style={{ boxShadow: '0 0 12px #059669' }} />
          </div>
          {/* Corner brackets */}
          {[['top-8 left-6', 'border-t-2 border-l-2'], ['top-8 right-6', 'border-t-2 border-r-2'],
            ['bottom-8 left-6', 'border-b-2 border-l-2'], ['bottom-8 right-6', 'border-b-2 border-r-2']].map(([pos, border], i) => (
            <div key={i} className={`absolute ${pos} w-8 h-8 ${border} border-[#059669]`} />
          ))}
          <div className="absolute top-4 left-0 right-0 flex justify-center">
            <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2">
              <ScanLine size={14} className="text-[#059669] animate-pulse" />
              <span className="text-white text-sm font-black">AI Analyzing...</span>
            </div>
          </div>
        </div>

        <div className="bg-[#0A1628] px-6 pt-6 pb-10">
          <div className="flex justify-between text-white/60 text-xs font-bold mb-2">
            <span>Analyzing plant health</span>
            <span>{Math.round(scanProgress)}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#059669] rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
          </div>
          <div className="mt-4 space-y-1">
            {['Leaf color analysis', 'Nutrient pattern detection', 'Stress indicator scan', 'Generating recommendations'].map((step, i) => (
              <div key={i} className={`flex items-center gap-2 text-sm transition-opacity duration-500 ${scanProgress > i * 22 ? 'opacity-100' : 'opacity-20'}`}>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${scanProgress > (i + 1) * 22 ? 'bg-[#059669]' : 'bg-white/30'}`} />
                <span className="text-white/70">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (demoState === 'error') {
    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-center px-6 font-sans">
        <AlertCircle size={56} className="text-red-400 mb-4" />
        <h2 className="text-2xl font-black text-white mb-2">Scan Failed</h2>
        <p className="text-white/50 text-sm text-center mb-8">{errorMsg}</p>
        <button onClick={() => { setDemoState('intro'); setErrorMsg(''); setCapturedImage(null); }}
          className="w-full py-5 bg-[#059669] text-white rounded-2xl font-black text-lg mb-3 active:scale-95 transition-transform">
          Try Again
        </button>
        <button onClick={onSkip} className="text-white/40 text-sm font-bold py-2">Skip for now</button>
      </div>
    );
  }

  // Intro state
  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col px-6 pt-14 pb-10 font-sans">
      <div className="mb-8">
        <OnboardingProgressBar current={8} total={9} />
      </div>

      <div className="mb-8">
        <button onClick={onBack} className="text-white/40 text-sm font-bold mb-4 flex items-center gap-1">← Back</button>
        <p className="text-[#059669] text-sm font-bold uppercase tracking-widest mb-2">Step 8 of 9</p>
        <h1 className="text-3xl font-black text-white leading-tight mb-2">
          See the AI in<br />
          <span className="text-[#059669]">action — live</span>
        </h1>
        <p className="text-white/50 text-sm">
          {isWeb
            ? 'Upload a photo of any plant to watch the AI diagnose it instantly.'
            : 'Take a photo of any plant right now and watch the AI diagnose it instantly.'}
        </p>
      </div>

      {/* Demo illustration */}
      <div className="flex-1 flex flex-col items-center justify-center mb-8">
        <div className="relative w-64 h-48 bg-[#0D1F35] border border-white/10 rounded-3xl overflow-hidden mb-6">
          <div className="absolute inset-0 flex items-center justify-center">
            <Leaf size={64} className="text-[#059669]/30" />
          </div>
          <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-[#059669]" />
          <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-[#059669]" />
          <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-[#059669]" />
          <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-[#059669]" />
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-[#059669] to-transparent animate-scan" />
          </div>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center">
            <div className="bg-[#059669]/80 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
              AI Scanning...
            </div>
          </div>
        </div>

        <div className="space-y-2 w-full">
          {['Analyzing leaf color', 'Checking nutrient signs', 'Detecting stress patterns'].map((step, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5">
              <div className="w-2 h-2 rounded-full bg-[#059669] animate-pulse flex-shrink-0" style={{ animationDelay: `${i * 200}ms` }} />
              <span className="text-white/60 text-sm">{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Web file input (hidden) */}
      {isWeb && (
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleWebFileSelect} />
      )}

      <button
        onClick={isWeb ? () => fileInputRef.current?.click() : handleOpenCamera}
        className="w-full py-5 bg-[#059669] text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-2xl shadow-[#059669]/40 mb-3"
      >
        {isWeb ? <><Upload size={22} /> Upload a Plant Photo</> : <><Camera size={22} /> Scan a Plant Now</>}
      </button>

      <button onClick={onSkip} className="text-white/30 text-sm font-bold text-center py-2">
        Skip demo — I'll scan later
      </button>
    </div>
  );
};

export default LiveScanDemo;
