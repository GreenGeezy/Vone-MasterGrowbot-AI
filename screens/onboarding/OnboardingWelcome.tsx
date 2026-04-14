import React, { useEffect, useState } from 'react';
import { ScanLine, Leaf, Shield, Zap } from 'lucide-react';

interface OnboardingWelcomeProps {
  onGetStarted: () => void;
}

const OnboardingWelcome: React.FC<OnboardingWelcomeProps> = ({ onGetStarted }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-between px-6 pt-16 pb-10 font-sans relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#059669]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-900/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top: Logo */}
      <div className={`flex flex-col items-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="w-20 h-20 bg-[#059669] rounded-[24px] flex items-center justify-center shadow-2xl shadow-[#059669]/40 mb-4">
          <ScanLine size={40} color="white" strokeWidth={2.5} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white font-black text-2xl tracking-tight">MasterGrowbot</span>
          <span className="bg-[#059669] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">AI</span>
        </div>
      </div>

      {/* Center: Headline */}
      <div className={`flex flex-col items-center text-center transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Plant mockup illustration */}
        <div className="relative w-64 h-64 mb-8">
          <div className="absolute inset-0 bg-gradient-to-b from-[#059669]/5 to-transparent rounded-full" />
          {/* Stylized plant icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#059669]/20 to-emerald-900/30 flex items-center justify-center border border-[#059669]/20">
                <Leaf size={64} className="text-[#059669]" strokeWidth={1.5} />
              </div>
              {/* Scan line */}
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div className="w-full h-0.5 bg-[#059669]/60 animate-scan" />
              </div>
              {/* Corner dots */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#059669] rounded-tl-md" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#059669] rounded-tr-md" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#059669] rounded-bl-md" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#059669] rounded-br-md" />
            </div>
          </div>
        </div>

        <h1 className="text-4xl font-black text-white leading-tight mb-4">
          Grow Healthier Plants.<br />
          <span className="text-[#059669]">Guaranteed.</span>
        </h1>
        <p className="text-white/60 text-base leading-relaxed max-w-xs">
          AI-powered plant diagnosis, personalized grow schedules, and expert guidance — all in your pocket.
        </p>

        {/* Feature pills */}
        <div className="flex gap-3 mt-6 flex-wrap justify-center">
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            <Zap size={12} className="text-[#059669]" />
            <span className="text-white/70 text-xs font-semibold">AI Diagnosis</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            <Shield size={12} className="text-[#059669]" />
            <span className="text-white/70 text-xs font-semibold">Expert Guidance</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            <Leaf size={12} className="text-[#059669]" />
            <span className="text-white/70 text-xs font-semibold">Grow Journal</span>
          </div>
        </div>
      </div>

      {/* Bottom: CTA + Legal */}
      <div className={`w-full flex flex-col items-center gap-3 transition-all duration-700 delay-400 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <button
          onClick={onGetStarted}
          className="w-full py-5 bg-[#059669] text-white rounded-2xl font-black text-lg shadow-2xl shadow-[#059669]/40 active:scale-95 transition-transform"
        >
          Get Started — It's Free
        </button>
        <p className="text-white/30 text-[10px] text-center leading-relaxed px-4">
          By continuing, you agree to our Terms of Service and Privacy Policy.
          Free trial available. Subscription required for full access.
        </p>
      </div>
    </div>
  );
};

export default OnboardingWelcome;
