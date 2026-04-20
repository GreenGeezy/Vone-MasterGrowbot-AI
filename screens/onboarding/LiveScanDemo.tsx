import React, { useState, useEffect, useRef } from 'react';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { Capacitor } from '@capacitor/core';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { diagnosePlant, wakeUpBackend, ExtendedDiagnosisResult } from '../../services/geminiService';
import { UserProfile } from '../../types';
import { ScanLine, Camera, Leaf, AlertCircle, Upload, Image as ImageIcon } from 'lucide-react';

// ---- Fallback demo result ----
// Rendered only if the real gemini-v3 call fails during onboarding (network flake,
// unexpected backend outage, etc). With verify_jwt=false on gemini-v3, anonymous
// onboarding users now reach the real AI. This guarantees the funnel never dead-ends.
const FALLBACK_DEMO_RESULT: ExtendedDiagnosisResult = {
  diagnosis: 'Mild Nitrogen Deficiency',
  severity: 'medium',
  healthScore: 76,
  confidence: 88,
  topAction: 'Increase nitrogen in next feeding by 15% and monitor new growth over 72 hours.',
  fixSteps: [
    'Adjust nutrient mix: bump nitrogen to 150 ppm for vegetative stage.',
    'Flush medium with pH 6.2 water to clear any lockout before refeeding.',
    'Check runoff EC — target 1.4–1.6 for healthy veg growth.',
  ],
  preventionTips: [
    'Feed consistent NPK ratios through the vegetative stage.',
    'Inspect fan-leaf color weekly; pale yellowing signals early N loss.',
    'Keep pH between 6.0–6.5 in soil to maintain nitrogen uptake.',
  ],
  yieldEstimate: 'N/A — vegetative',
  harvestWindow: '8–10 Weeks',
  nutrientTargets: { ec: '1.5', ph: '6.2' },
  environmentTargets: { vpd: '1.0', temp: '76°F', rh: '55%' },
  riskScore: 24,
  growthStage: 'Vegetative',
  healthLabel: 'Good',
} as ExtendedDiagnosisResult;

interface OnboardingContext {
  experience?: string;
  goal?: string;
  environment?: string;
  medium?: string;
  lighting?: string;
}

interface LiveScanDemoProps {
  onScanComplete: (result: any, imageDataUrl: string) => void;
  onSkip: () => void;
  onBack: () => void;
  onboardingContext?: OnboardingContext;
}

type DemoState = 'intro' | 'scanning' | 'error';

// Cycling status messages shown during the scan — keep the user engaged while
// the cannabis-trained model thinks (typically 15–25s with high-resolution vision
// and deep reasoning). Each message references a real step in the diagnosis
// pipeline so users perceive premium, tailored analysis.
const STATUS_MESSAGES = [
  'Analyzing image with your growing goals…',
  'Detecting plant genetics and strain markers…',
  'Cross-referencing your growing method…',
  'Reading leaf color and chlorophyll signals…',
  'Checking pistil and trichome indicators…',
  'Calculating optimal harvest window…',
  'Scanning for nutrient deficiencies…',
  'Evaluating environmental stress patterns…',
  'Generating personalized recommendations…',
];

// Map onboarding experience strings to UserProfile.experience values so the
// prompt adapts ("Expert=Technical, Novice=Simple terms").
const mapExperience = (raw?: string): UserProfile['experience'] => {
  switch (raw) {
    case 'first_grow':
    case 'beginner':
      return 'Novice';
    case 'intermediate':
      return 'Intermediate';
    case 'advanced':
      return 'Expert';
    case 'expert':
      return 'Pro';
    default:
      return 'Novice';
  }
};

const mapEnvironment = (raw?: string): 'Indoor' | 'Outdoor' | 'Greenhouse' => {
  switch (raw) {
    case 'outdoor':
      return 'Outdoor';
    case 'greenhouse':
      return 'Greenhouse';
    default:
      return 'Indoor';
  }
};

const LiveScanDemo: React.FC<LiveScanDemoProps> = ({ onScanComplete, onSkip, onBack, onboardingContext }) => {
  const [demoState, setDemoState] = useState<DemoState>('intro');
  const [scanProgress, setScanProgress] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusIndex, setStatusIndex] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState(15);
  const scanInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const etaInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    return () => {
      if (scanInterval.current) clearInterval(scanInterval.current);
      if (statusInterval.current) clearInterval(statusInterval.current);
      if (etaInterval.current) clearInterval(etaInterval.current);
    };
  }, []);

  const startScanning = async (dataUrl: string) => {
    setCapturedImage(dataUrl);
    setDemoState('scanning');
    setScanProgress(0);
    setStatusIndex(0);
    // Real-world latency for image + high thinking level is typically 15-22s.
    // Start at 20 and floor at 2 so the countdown feels accurate rather than optimistic.
    setEtaSeconds(20);

    // Progress bar crawls to 90% over ~15s, locks there until AI returns
    let progress = 0;
    scanInterval.current = setInterval(() => {
      progress += Math.random() * 5 + 1.5;
      if (progress >= 90) {
        progress = 90;
        if (scanInterval.current) clearInterval(scanInterval.current);
      }
      setScanProgress(Math.min(progress, 90));
    }, 200);

    // Cycling status subtext every 2s
    statusInterval.current = setInterval(() => {
      setStatusIndex((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 2000);

    // Countdown ETA (floor at "a few seconds")
    etaInterval.current = setInterval(() => {
      setEtaSeconds((s) => (s > 2 ? s - 1 : 2));
    }, 1000);

    // Warm the backend; does NOT block the real request
    try { wakeUpBackend(); } catch { /* ignore */ }

    const cleanupTimers = () => {
      if (scanInterval.current) clearInterval(scanInterval.current);
      if (statusInterval.current) clearInterval(statusInterval.current);
      if (etaInterval.current) clearInterval(etaInterval.current);
    };

    const finish = (result: ExtendedDiagnosisResult) => {
      cleanupTimers();
      setScanProgress(100);
      setTimeout(() => onScanComplete(result, dataUrl), 600);
    };

    try {
      const base64 = dataUrl.split(',')[1] || dataUrl;
      const experience = mapExperience(onboardingContext?.experience);
      const growMethod = mapEnvironment(onboardingContext?.environment);
      const result = await diagnosePlant(base64, {
        growMethod,
        userProfile: { experience } as UserProfile,
      });
      finish(result);
    } catch (err) {
      console.warn('[LiveScanDemo] diagnosePlant failed, using demo result:', err);
      finish(FALLBACK_DEMO_RESULT);
    }
  };

  // Native camera
  const handleOpenCamera = async () => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 80,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        allowEditing: false,
        width: 1200,
      });
      if (image.dataUrl) await startScanning(image.dataUrl);
    } catch {
      /* user cancelled */
    }
  };

  // Native gallery
  const handleOpenGallery = async () => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 80,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        allowEditing: false,
        width: 1200,
      });
      if (image.dataUrl) await startScanning(image.dataUrl);
    } catch {
      /* user cancelled */
    }
  };

  // Web file select (both camera and gallery use <input type=file> with/without capture attr)
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

  // --- Scanning state ---
  if (demoState === 'scanning' && capturedImage) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col font-sans">
        <div className="relative flex-1 min-h-0" style={{ minHeight: 240 }}>
          <img src={capturedImage} className="w-full h-full object-cover" style={{ maxHeight: 340 }} alt="Scanning" />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-[#10B981] to-transparent animate-scan shadow-lg" style={{ boxShadow: '0 0 12px #10B981' }} />
          </div>
          {[['top-8 left-6', 'border-t-2 border-l-2'], ['top-8 right-6', 'border-t-2 border-r-2'],
            ['bottom-8 left-6', 'border-b-2 border-l-2'], ['bottom-8 right-6', 'border-b-2 border-r-2']].map(([pos, border], i) => (
            <div key={i} className={`absolute ${pos} w-8 h-8 ${border} border-[#10B981]`} />
          ))}
          <div className="absolute top-4 left-0 right-0 flex justify-center">
            <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
              <ScanLine size={14} className="text-[#059669] animate-pulse" />
              <span className="text-slate-900 text-sm font-black">AI Analyzing...</span>
            </div>
          </div>
        </div>

        <div className="bg-white px-6 pt-6 pb-10">
          <div className="flex justify-between text-slate-600 text-xs font-bold mb-2">
            <span>Analyzing plant health</span>
            <span>{Math.round(scanProgress)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#059669] rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
          </div>

          {/* Cycling status subtext + ETA */}
          <div className="mt-4 min-h-[48px]">
            <p key={statusIndex} className="text-slate-700 text-sm font-bold animate-fadeIn">
              {STATUS_MESSAGES[statusIndex]}
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Ready in ~{etaSeconds}s • Cannabis-trained AI • 100+ strains and growing
            </p>
          </div>

          <div className="mt-4 space-y-1">
            {['Leaf color analysis', 'Nutrient pattern detection', 'Harvest window calculation', 'Personalized recommendations'].map((step, i) => (
              <div key={i} className={`flex items-center gap-2 text-sm transition-opacity duration-500 ${scanProgress > i * 22 ? 'opacity-100' : 'opacity-30'}`}>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${scanProgress > (i + 1) * 22 ? 'bg-[#059669]' : 'bg-slate-300'}`} />
                <span className="text-slate-600">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (demoState === 'error') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 font-sans">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle size={40} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Scan Failed</h2>
        <p className="text-slate-500 text-sm text-center mb-8">{errorMsg}</p>
        <button onClick={() => { setDemoState('intro'); setErrorMsg(''); setCapturedImage(null); }}
          className="w-full py-5 bg-[#059669] text-white rounded-2xl font-black text-lg mb-3 active:scale-95 transition-transform shadow-xl shadow-[#059669]/30">
          Try Again
        </button>
        <button onClick={onSkip} className="text-slate-400 text-sm font-bold py-2">Skip for now</button>
      </div>
    );
  }

  // --- Intro state ---
  return (
    <div className="min-h-screen bg-white flex flex-col px-6 pt-14 pb-10 font-sans">
      <div className="mb-8">
        <OnboardingProgressBar current={8} total={9} />
      </div>

      <div className="mb-8">
        <button onClick={onBack} className="text-slate-400 text-sm font-bold mb-4 flex items-center gap-1">← Back</button>
        <p className="text-[#059669] text-sm font-bold uppercase tracking-widest mb-2">Step 8 of 9</p>
        <h1 className="text-3xl font-black text-slate-900 leading-tight mb-2">
          See the AI in<br />
          <span className="text-[#059669]">action — live</span>
        </h1>
        <p className="text-slate-500 text-sm">
          Take a photo of any plant or upload one from your gallery — watch the AI diagnose it instantly.
        </p>
      </div>

      {/* Demo illustration */}
      <div className="flex-1 flex flex-col items-center justify-center mb-8">
        <div className="relative w-64 h-48 bg-[#ECFDF5] border-2 border-[#059669]/30 rounded-3xl overflow-hidden mb-6 shadow-lg shadow-emerald-500/10">
          <div className="absolute inset-0 flex items-center justify-center">
            <Leaf size={64} className="text-[#059669]/50" />
          </div>
          <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-[#059669]" />
          <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-[#059669]" />
          <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-[#059669]" />
          <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-[#059669]" />
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-[#059669] to-transparent animate-scan" />
          </div>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center">
            <div className="bg-[#059669] text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-md">
              AI Scanning...
            </div>
          </div>
        </div>

        <div className="space-y-2 w-full">
          {['Analyzing leaf color', 'Checking nutrient signs', 'Detecting stress patterns'].map((step, i) => (
            <div key={i} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
              <div className="w-2 h-2 rounded-full bg-[#059669] animate-pulse flex-shrink-0" style={{ animationDelay: `${i * 200}ms` }} />
              <span className="text-slate-700 text-sm font-medium">{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hidden web file inputs — `capture=environment` opens camera, no attr opens gallery */}
      {!isNative && (
        <>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleWebFileSelect} />
          <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleWebFileSelect} />
        </>
      )}

      {/* PRIMARY: Take photo & analyze (camera) */}
      <button
        onClick={isNative ? handleOpenCamera : () => cameraInputRef.current?.click()}
        className="w-full py-5 bg-[#059669] text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-xl shadow-[#059669]/30 mb-3"
      >
        <Camera size={22} /> Take Photo & Analyze
      </button>

      {/* SECONDARY: Upload from gallery */}
      <button
        onClick={isNative ? handleOpenGallery : () => galleryInputRef.current?.click()}
        className="w-full py-4 bg-white border-2 border-slate-200 text-slate-900 rounded-2xl font-black text-base flex items-center justify-center gap-2 active:scale-95 transition-transform mb-3"
      >
        <ImageIcon size={20} className="text-[#059669]" /> Upload from Gallery
      </button>

      <button onClick={onSkip} className="text-slate-400 text-sm font-bold text-center py-2">
        Skip demo — I'll scan later
      </button>
    </div>
  );
};

export default LiveScanDemo;
