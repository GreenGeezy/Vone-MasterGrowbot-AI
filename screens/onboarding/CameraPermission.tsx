import React, { useState } from 'react';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { Camera, Zap, Shield, ChevronRight } from 'lucide-react';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';

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
    setRequesting(true);
    try {
      // Taking a photo with requestPermissions triggers the system dialog on iOS
      await CapacitorCamera.requestPermissions({ permissions: ['camera'] });
      onPermissionGranted();
    } catch (e) {
      // User denied or error — still advance (they can enable later in Settings)
      console.warn('Camera permission denied or error:', e);
      onPermissionGranted(); // Still proceed — they can enable later
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col px-6 pt-14 pb-10 font-sans">
      {/* Progress */}
      <div className="mb-8">
        <OnboardingProgressBar current={7} total={9} />
      </div>

      {/* Header */}
      <div className="mb-8">
        <button onClick={onBack} className="text-white/40 text-sm font-bold mb-4 flex items-center gap-1">
          ← Back
        </button>
        <p className="text-[#059669] text-sm font-bold uppercase tracking-widest mb-2">Step 7 of 9</p>
        <h1 className="text-3xl font-black text-white leading-tight mb-2">
          Unlock AI<br />
          <span className="text-[#059669]">plant scanning</span>
        </h1>
        <p className="text-white/50 text-sm">Camera access powers MasterGrowbot's most powerful feature.</p>
      </div>

      {/* Camera illustration */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          <div className="w-32 h-32 bg-[#059669]/10 border-2 border-[#059669]/30 rounded-3xl flex items-center justify-center">
            <Camera size={56} className="text-[#059669]" strokeWidth={1.5} />
          </div>
          {/* Pulse rings */}
          <div className="absolute inset-0 rounded-3xl border-2 border-[#059669]/20 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute -inset-4 rounded-[2.5rem] border border-[#059669]/10 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
          {/* Badge */}
          <div className="absolute -top-2 -right-2 bg-[#059669] rounded-full px-2 py-0.5 flex items-center gap-1 shadow-lg">
            <Zap size={10} className="text-white" />
            <span className="text-white text-[10px] font-black">AI</span>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="flex-1 space-y-3 mb-6">
        {BENEFITS.map((b, i) => (
          <div key={i} className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
            <span className="text-2xl leading-none">{b.icon}</span>
            <div>
              <div className="text-white font-black text-sm">{b.title}</div>
              <div className="text-white/50 text-xs mt-0.5 leading-relaxed">{b.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Privacy note */}
      <div className="flex items-center gap-2 mb-4 bg-white/5 rounded-xl px-3 py-2.5">
        <Shield size={14} className="text-white/40 flex-shrink-0" />
        <p className="text-white/40 text-[11px]">Photos are processed locally and never stored without your permission.</p>
      </div>

      {/* CTAs */}
      <button
        onClick={handleRequestPermission}
        disabled={requesting}
        className="w-full py-5 bg-[#059669] text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-2xl shadow-[#059669]/40 mb-3"
      >
        {requesting ? (
          <span className="animate-pulse">Requesting Access...</span>
        ) : (
          <>Enable Camera Access <ChevronRight size={20} /></>
        )}
      </button>

      <button onClick={onSkip} className="text-white/30 text-sm font-bold text-center py-2">
        Skip for now — I'll enable it later
      </button>
    </div>
  );
};

export default CameraPermission;
