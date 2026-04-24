import React, { useEffect, useState } from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { hapticImpact } from '../../utils/haptics';

interface OnboardingWelcomeProps {
  onGetStarted: () => void;
  onSignIn?: () => void;
}

/**
 * OnboardingWelcome — v2 premium redesign (matches target brief image).
 *
 * Visual targets:
 *  - Airy light-mode background with cannabis-leaf silhouettes blurred into
 *    the four corners (decorative, behind content).
 *  - Rounded-square logo card (iOS app-icon look) with MasterGrowbot mark.
 *  - Hero "scan" disc with animated sweep, corner brackets, and a cannabis
 *    leaf inside — communicates the single most important feature (camera
 *    plant diagnosis) immediately.
 *  - Headline "Grow Healthier Plants." with "Healthier" accented green.
 *  - Primary CTA + optional "Already have an account? Sign In" row.
 *
 * Micro-interactions:
 *  - Staggered fade/slide-in (motion-safe; respects prefers-reduced-motion).
 *  - Scan sweep uses the `animate-scan` keyframe defined in tailwind.config.
 *  - CTA fires a Medium-impact haptic on iOS/Android (no-op on web).
 */
const OnboardingWelcome: React.FC<OnboardingWelcomeProps> = ({ onGetStarted, onSignIn }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handlePrimary = () => {
    hapticImpact();
    onGetStarted();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0FDF4] via-white to-white flex flex-col items-center px-6 pt-14 pb-10 font-sans relative overflow-hidden">
      {/* === Decorative cannabis-leaf corners ============================ */}
      <div aria-hidden className="pointer-events-none absolute -top-16 -left-20 w-72 h-72 rotate-[-18deg] opacity-[0.18] select-none"><CannabisLeafSvg /></div>
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rotate-[22deg] opacity-[0.14] select-none"><CannabisLeafSvg /></div>
      <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-16 w-64 h-64 rotate-[155deg] opacity-[0.12] select-none"><CannabisLeafSvg /></div>
      <div aria-hidden className="pointer-events-none absolute -bottom-16 -right-20 w-72 h-72 rotate-[-155deg] opacity-[0.12] select-none"><CannabisLeafSvg /></div>
      {/* Soft green glow behind hero */}
      <div aria-hidden className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] bg-[#059669]/10 rounded-full blur-3xl pointer-events-none" />

      {/* === App-icon logo + wordmark + trust badge ====================== */}
      <div className={`relative z-10 flex flex-col items-center motion-safe:transition-all motion-safe:duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="w-24 h-24 rounded-[26px] bg-gradient-to-br from-white to-[#ECFDF5] border border-white shadow-xl shadow-emerald-500/20 flex items-center justify-center mb-6 relative">
          <div className="absolute inset-1 rounded-[22px] bg-white" />
          <img src="/assets/mastergrowbot-logo.jpg" alt="MasterGrowbot AI" className="relative w-16 h-16 object-contain" />
        </div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-slate-900 font-black text-[28px] tracking-tight leading-none">MasterGrowbot</span>
          <span className="bg-[#059669] text-white text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest leading-none shadow-md shadow-emerald-500/30">AI</span>
        </div>
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm px-4 py-2 rounded-full">
          <ShieldCheck size={14} className="text-[#059669]" />
          <span className="text-slate-700 text-[12px] font-bold">Trusted by Elite Growers Worldwide</span>
        </div>
      </div>

      {/* === Hero scan disc ============================================== */}
      <div className={`relative z-10 flex-1 flex flex-col items-center justify-center w-full motion-safe:transition-all motion-safe:duration-700 motion-safe:delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="relative w-56 h-56 my-4">
          <div aria-hidden className="absolute inset-0 rounded-full border border-[#059669]/15" />
          <div aria-hidden className="absolute inset-4 rounded-full border border-[#059669]/10 border-dashed" />
          <div className="absolute inset-8 rounded-full bg-white shadow-[0_20px_60px_-20px_rgba(5,150,105,0.35)] border border-emerald-100 flex items-center justify-center overflow-hidden">
            <img src="/assets/cannabis-leaf.jpg" alt="" className="w-28 h-28 object-contain" />
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <div className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-[#059669] to-transparent shadow-[0_0_12px_2px_rgba(5,150,105,0.5)] animate-scan" />
            </div>
          </div>
          <CornerBracket className="absolute top-2 left-2 rotate-0" />
          <CornerBracket className="absolute top-2 right-2 rotate-90" />
          <CornerBracket className="absolute bottom-2 left-2 -rotate-90" />
          <CornerBracket className="absolute bottom-2 right-2 rotate-180" />
        </div>
      </div>

      {/* === Headline + subcopy ========================================== */}
      <div className={`relative z-10 text-center mb-8 motion-safe:transition-all motion-safe:duration-700 motion-safe:delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <h1 className="text-[34px] font-black text-slate-900 leading-[1.1] mb-3 tracking-tight">
          Grow <span className="text-[#059669]">Healthier</span><br />Plants.
        </h1>
        <p className="text-slate-500 text-[15px] leading-relaxed max-w-xs mx-auto">
          AI-powered insights to help you grow stronger, faster, and smarter.
        </p>
      </div>

      {/* === CTA + sign-in ============================================== */}
      <div className={`relative z-10 w-full flex flex-col items-center gap-4 motion-safe:transition-all motion-safe:duration-700 motion-safe:delay-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <button
          onClick={handlePrimary}
          className="w-full py-[18px] bg-[#059669] text-white rounded-2xl font-black text-lg shadow-xl shadow-[#059669]/30 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          Get Started <ArrowRight size={20} strokeWidth={2.5} />
        </button>
        {onSignIn && (
          <button onClick={onSignIn} className="text-slate-500 text-sm font-medium active:opacity-70">
            Already have an account? <span className="text-[#059669] font-bold">Sign In</span>
          </button>
        )}
        {!onSignIn && (
          <p className="text-slate-400 text-[10px] text-center leading-relaxed px-4 max-w-xs">
            For use where cannabis cultivation is legal. Must be 18+.
          </p>
        )}
      </div>
    </div>
  );
};

/* ================================================================= */
/* Inline SVGs — local so the component stays drop-in and no new     */
/* image assets enter the bundle.                                    */
/* ================================================================= */

const CannabisLeafSvg: React.FC = () => (
  <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <defs>
      <linearGradient id="mg-leafGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>
    </defs>
    <g fill="url(#mg-leafGrad)">
      <path d="M100 20 C96 50 94 90 100 125 C106 90 104 50 100 20 Z" />
      <path d="M100 60 C78 55 52 48 32 46 C50 66 74 82 100 90 Z" />
      <path d="M100 60 C122 55 148 48 168 46 C150 66 126 82 100 90 Z" />
      <path d="M100 90 C80 92 54 102 36 118 C58 122 82 115 100 105 Z" />
      <path d="M100 90 C120 92 146 102 164 118 C142 122 118 115 100 105 Z" />
      <path d="M100 110 C86 120 72 138 62 158 C82 150 96 138 102 125 Z" />
      <path d="M100 110 C114 120 128 138 138 158 C118 150 104 138 98 125 Z" />
    </g>
    <path d="M98 125 L98 165 M100 125 L100 170 M102 125 L102 165" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const AppIconMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="mg-iconBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#mg-iconBg)" />
    <g fill="#065F46" opacity="0.9">
      <path d="M32 6 C30 14 30 18 32 22 C34 18 34 14 32 6 Z" />
      <path d="M22 8 C22 16 26 20 32 22 C28 16 26 12 22 8 Z" />
      <path d="M42 8 C42 16 38 20 32 22 C36 16 38 12 42 8 Z" />
    </g>
    <rect x="14" y="22" width="36" height="28" rx="10" fill="#D1FAE5" />
    <circle cx="24" cy="36" r="5" fill="#065F46" />
    <circle cx="24" cy="35" r="1.5" fill="#FFFFFF" />
    <rect x="34" y="30" width="12" height="12" rx="2" fill="#065F46" />
    <path d="M36 36 L40 32 L40 40 Z" fill="#FBBF24" />
    <circle cx="40" cy="18" r="2" fill="#FBBF24" />
  </svg>
);

const CornerBracket: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className={className}>
    <path d="M2 8 V2 H8" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default OnboardingWelcome;
