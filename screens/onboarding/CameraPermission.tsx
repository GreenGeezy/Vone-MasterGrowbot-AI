import React, { useState } from 'react';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { Camera, Zap, Shield, ChevronRight } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Camera as CapacitorCamera } from '@capacitor/camera';

interface CameraPermissionProps {
  onPermissionGranted: () => void;
  onSkip: () => void;
  onBack: () => void;
}

const BENEFITS = [
  {
    icon: '🔬',
    title: 'Instant Plant Diagnosis',
    desc: 'Scan any leaf and get AI-powered health analysis in seconds.',
  },
  {
    icon: '📈',
    title: 'Track Visual Progress',
    desc: 'Before & after photos show exactly how your plants respond to changes.',
  },
  {
    icon: '🚨',
    title: 'Early Problem Detection',
    desc: 'Catch deficiencies, pests, and stress before visible damage spreads.',
  },
];

const CameraPermission: React.FC<CameraPermissionProps> = ({ onPermissionGranted, onSkip, onBack }) => {
  const [requesting, setRequesting] = useState(false);

  const handleRequestPermission = async () => {
    if (!Capacitor.isNativePlatform()) {
      onPermissionGranted();
      return;
    }

    setRequesting(true);
    try {
      await CapacitorCamera.requestPermissions({ permissions: ['camera'] });
      onPermissionGranted();
    } catch (e) {
      console.warn('Camera permission error:', e);
      onPermissionGranted();
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 pt-14 pb-10 font-sans">
      <div className="mb-8">
        <OnboardingProgressBar current={7} total={9} />
      </div>

      <div className="mb-8">
        <button onClick={onBack} className="text-slate-400 text-sm font-bold mb-4 flex items-center gap-1">
          ← Back
        </button>
        <p className="text-[#059669] text-sm font-bold uppercase tracking-widest mb-2">Step 7 of 9</p>
        <h1 className="text-3xl font-black text-slate-900 leading-tight mb-2">
          Unlock AI<br />
          <span className="text-[#059669]">plant scanning</span>
        </h1>
        <p className="text-slate-500 text-sm">Camera access powers MasterGrowbot's most powerful feature.</p>
      </div>

      {/* Camera illustration */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          <div className="w-32 h-32 bg-[#ECFDF5] border-2 border-[#059669]/30 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <Camera size={56} className="text-[#059669]" strokeWidth={1.5} />
          </div>
          <div className="absolute -top-2 -right-2 bg-[#059669] rounded-full px-2 py-0.5 flex items-center gap-1 shadow-lg shadow-[#059669]/30">
            <Zap size={10} className="text-white" />
            <span className="text-white text-[10px] font-black">AI</span>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 mb-6">
        {BENEFITS.map((b, i) => (
          <div key={i} className="flex items-start gap-4 bg-white border border-slate-200 shadow-sm rounded-2xl p-4">
            <span className="text-2xl leading-none">{b.icon}</span>
            <div>
              <div className="text-slate-900 font-black text-sm">{b.title}</div>
              <div className="text-slate-500 text-xs mt-0.5 leading-relaxed">{b.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
        <Shield size={14} className="text-[#059669] flex-shrink-0" />
        <p className="text-slate-500 text-[11px]">Photos are processed locally and never stored without your permission.</p>
      </div>

      <button
        onClick={handleRequestPermission}
        disabled={requesting}
        className="w-full py-5 bg-[#059669] text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-xl shadow-[#059669]/30 mb-3"
      >
        {requesting ? (
          <span className="animate-pulse">Requesting Access...</span>
        ) : (
          <>Enable Camera Access <ChevronRight size={20} /></>
        )}
      </button>

      <button onClick={onSkip} className="text-slate-400 text-sm font-bold text-center py-2">
        Skip for now — I'll enable it later
      </button>
    </div>
  );
};

export default CameraPermission;
