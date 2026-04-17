import React, { useEffect, useState } from 'react';
import { ScanLine, Leaf, Shield, Zap, Sparkles } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-b from-[#ECFDF5] via-white to-white flex flex-col items-center justify-between px-6 pt-14 pb-10 font-sans relative overflow-hidden">
      {/* Soft background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] bg-[#059669]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top: Logo + trust shield */}
      <div className={`flex flex-col items-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="w-20 h-20 bg-[#059669] rounded-[24px] flex items-center justify-center shadow-xl shadow-[#059669]/30 mb-4">
          <ScanLine size={40} color="white" strokeWidth={2.5} />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-slate-900 font-black text-2xl tracking-tight">MasterGrowbot</span>
          <span className="bg-[#059669] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">AI</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-full">
          <Shield size={12} className="text-[#059669]" />
          <span className="text-slate-600 text-[11px] font-bold">Trusted by Elite Growers Worldwide</span>
        </div>
      </div>

      {/* Center: Headline + scan mockup */}
      <div className={`flex flex-col items-center text-center transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Scan illustration */}
        <div className="relative w-56 h-56 mb-8">
          <div className="absolute inset-0 bg-gradient-to-b from-[#059669]/10 to-transparent rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-white shadow-lg shadow-emerald-500/20 border border-emerald-100 flex items-center justify-center">
                <Leaf size={64} className="text-[#059669]" strokeWidth={1.5} />
              </div>
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div className="absolute w-full h-0.5 bg-[#059669]/60 animate-scan" />
              </div>
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-[#059669] rounded-tl-md" />
              <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-[#059669] rounded-tr-md" />
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-[#059669] rounded-bl-md" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-[#059669] rounded-br-md" />
            </div>
          </div>
        </div>

        <h1 className="text-4xl font-black text-slate-900 leading-tight mb-4">
          Grow Healthier Plants.<br />
          <span className="text-[#059669]">Guaranteed.</span>
        </h1>
        <p className="text-slate-600 text-base leading-relaxed max-w-xs">
          AI-powered plant diagnosis, personalized grow schedules, and expert guidance — all in your pocket.
        </p>

        {/* Feature pills */}
        <div className="flex gap-2 mt-6 flex-wrap justify-center">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-full">
            <Zap size={12} className="text-[#059669]" />
            <span className="text-slate-700 text-xs font-semibold">AI-Tuned</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-full">
            <Sparkles size={12} className="text-[#059669]" />
            <span className="text-slate-700 text-xs font-semibold">Personalized</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-full">
            <Leaf size={12} className="text-[#059669]" />
            <span className="text-slate-700 text-xs font-semibold">Actionable Steps</span>
          </div>
        </div>
      </div>

      {/* Bottom: CTA + Legal */}
      <div className={`w-full flex flex-col items-center gap-3 transition-all duration-700 delay-400 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <button
          onClick={onGetStarted}
          className="w-full py-5 bg-[#059669] text-white rounded-2xl font-black text-lg shadow-xl shadow-[#059669]/30 active:scale-95 transition-transform"
        >
          Get Started
        </button>
        <p className="text-slate-400 text-[10px] text-center leading-relaxed px-4 max-w-xs">
          For use where cannabis cultivation is legal. Must be 18+.
        </p>
      </div>
    </div>
  );
};

export default OnboardingWelcome;
