import React, { useState, useEffect, useRef } from 'react';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { diagnosePlant } from '../../services/geminiService';
import { ScanLine, ChevronRight, Camera, Leaf, AlertCircle } from 'lucide-react';

interface LiveScanDemoProps {
  onScanComplete: (result: any, imageDataUrl: string) => void;
  onSkip: () => void;
  onBack: () => void;
}

type DemoState = 'intro' | 'camera_open' | 'scanning' | 'done' | 'error' | 'skipped';

const LiveScanDemo: React.FC<LiveScanDemoProps> = ({ onScanComplete, onSkip, onBack }) => {
  const [demoState, setDemoState] = useState<DemoState>('intro');
  const [scanProgress, setScanProgress] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const scanInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (scanInterval.current) clearInterval(scanInterval.current);
    };
  }, []);

  const handleOpenCamera = async () => {
    try {
      setDemoState('camera_open');
      const image = await CapacitorCamera.getPhoto({
        quality: 80,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        allowEditing: false,
        width: 1200,
      });

      if (image.dataUrl) {
        setCapturedImage(image.dataUrl);
        startScanning(image.dataUrl);
      } else {
        setDemoState('intro');
      }
    } catch (e) {
      // User cancelled
      setDemoState('intro');
    }
  };

  const startScanning = async (dataUrl: string) => {
    setDemoState('scanning');
    setScanProgress(0);

    // Animate progress while we wait for the API
    let progress = 0;
    scanInterval.current = setInterval(() => {
      progress += Math.random() * 8 + 2;
      if (progress >= 90) {
        progress = 90; // Hold at 90 until API returns
        if (scanInterval.current) clearInterval(scanInterval.current);
      }
      setScanProgress(Math.min(progress, 90));
    }, 150);

    try {
      // Extract base64 from data URL
      const base64 = dataUrl.split(',')[1];
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

  // Intro state
  if (demoState === 'intro') {
    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col px-6 pt-14 pb-10 font-sans">
        <div className="mb-8">
          <OnboardingProgressBar current={8} total={9} />
        </div>

        <div className="mb-8">
          <button onClick={onBack} className="text-white/40 text-sm font-bold mb-4 flex items-center gap-1">
            ← Back
          </button>
          <p className="text-[#059669] text-sm font-bold uppercase tracking-widest mb-2">Step 8 of 9</p>
          <h1 className="text-3xl font-black text-white leading-tight mb-2">
            See the AI in<br />
            <span className="text-[#059669]">action — live</span>
          </h1>
          <p className="text-white/50 text-sm">Take a photo of any plant right now and watch the AI diagnose it instantly.</p>
        </div>

        {/* Demo illustration */}
        <div className="flex-1 flex flex-col items-center justify-center mb-8">
          <div className="relative w-64 h-48 bg-[#0D1F35] border border-white/10 rounded-3xl overflow-hidden mb-6">
            {/* Fake camera frame */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Leaf size={64} className="text-[#059669]/30" />
            </div>
            {/* Corner brackets */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-[#059669]" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-[#059669]" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-[#059669]" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-[#059669]" />
            {/* Scan line */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#059669] to-transparent animate-scan" />
            </div>
            {/* HUD labels */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center">
              <div className="bg-[#059669]/80 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                AI Scanning...
              </div>
            </div>
          </div>

          <div className="space-y-2 w-full">
            {['Analyzing leaf color', 'Checking nutrient signs', 'Detecting stress patterns'].map((step, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5">
                <div className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                <span className="text-white/60 text-sm">{step}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleOpenCamera}
          className="w-full py-5 bg-[#059669] text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-2xl shadow-[#059669]/40 mb-3"
        >
          <Camera size={22} />
          Scan a Plant Now
        </button>

        <button onClick={onSkip} className="text-white/30 text-sm font-bold text-center py-2">
          Skip demo — I'll scan later
        </button>
      </div>
    );
  }

  // Scanning state
  if (demoState === 'scanning' && capturedImage) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col font-sans">
        {/* Full image with scan overlay */}
        <div className="relative flex-1">
          <img src={capturedImage} className="w-full h-full object-cover" alt="Scanning" />
          <div className="absolute inset-0 bg-black/50" />

          {/* Scan animation */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#059669] to-transparent animate-scan shadow-lg shadow-[#059669]" />
          </div>

          {/* Corner brackets */}
          <div className="absolute top-12 left-8 w-10 h-10 border-t-3 border-l-3 border-[#059669]" style={{ borderWidth: 3 }} />
          <div className="absolute top-12 right-8 w-10 h-10 border-t-3 border-r-3 border-[#059669]" style={{ borderWidth: 3 }} />
          <div className="absolute bottom-40 left-8 w-10 h-10 border-b-3 border-l-3 border-[#059669]" style={{ borderWidth: 3 }} />
          <div className="absolute bottom-40 right-8 w-10 h-10 border-b-3 border-r-3 border-[#059669]" style={{ borderWidth: 3 }} />

          {/* Status overlay */}
          <div className="absolute top-8 left-0 right-0 flex justify-center">
            <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2">
              <ScanLine size={14} className="text-[#059669] animate-pulse" />
              <span className="text-white text-sm font-black">AI Analyzing...</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-[#0A1628] px-6 pt-6 pb-10">
          <div className="flex justify-between text-white/60 text-xs font-bold mb-2">
            <span>Analyzing plant health</span>
            <span>{Math.round(scanProgress)}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#059669] rounded-full transition-all duration-300"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
          <div className="mt-4 space-y-1">
            {['Leaf color analysis', 'Nutrient pattern detection', 'Stress indicator scan', 'Generating recommendations'].map((step, i) => (
              <div key={i} className={`flex items-center gap-2 text-sm transition-opacity duration-500 ${scanProgress > i * 22 ? 'opacity-100' : 'opacity-20'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${scanProgress > (i + 1) * 22 ? 'bg-[#059669]' : 'bg-white/30'}`} />
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
        <button
          onClick={() => { setDemoState('intro'); setErrorMsg(''); }}
          className="w-full py-5 bg-[#059669] text-white rounded-2xl font-black text-lg mb-3 active:scale-95 transition-transform"
        >
          Try Again
        </button>
        <button onClick={onSkip} className="text-white/40 text-sm font-bold py-2">
          Skip for now
        </button>
      </div>
    );
  }

  // camera_open state — loading indicator
  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-center font-sans">
      <ScanLine size={48} className="text-[#059669] animate-pulse mb-4" />
      <p className="text-white/60 font-bold">Opening camera...</p>
    </div>
  );
};

export default LiveScanDemo;
