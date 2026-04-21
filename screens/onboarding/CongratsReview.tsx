import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { ChevronRight, CheckCircle, Sparkles } from 'lucide-react';

interface CongratsReviewProps {
  onNext: () => void;
  experienceLevel: string;
  scanImage?: string;
}

const CONFETTI_COLORS = ['#059669', '#34D399', '#6EE7B7', '#FCD34D', '#60A5FA', '#F472B6'];

const Confetti: React.FC = () => {
  const pieces = Array.from({ length: 30 });
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {pieces.map((_, i) => {
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const left = `${Math.random() * 100}%`;
        const delay = `${Math.random() * 1.5}s`;
        const size = `${Math.random() * 8 + 4}px`;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '-10px',
              left,
              width: size,
              height: size,
              backgroundColor: color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              animationName: 'fall',
              animationDuration: `${Math.random() * 2 + 2}s`,
              animationDelay: delay,
              animationTimingFunction: 'linear',
              animationFillMode: 'forwards',
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        );
      })}
    </div>
  );
};

const CongratsReview: React.FC<CongratsReviewProps> = ({ onNext, experienceLevel, scanImage }) => {
  const [ctaEnabled, setCtaEnabled] = useState(false);
  const [reviewRequested, setReviewRequested] = useState(false);
  const [countDown, setCountDown] = useState(3);

  useEffect(() => {
    const reviewTimer = setTimeout(async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const { InAppReview } = await import('@capacitor-community/in-app-review');
          await InAppReview.requestReview();
        } catch (e) {
          console.warn('In-app review failed:', e);
        }
      }
      setReviewRequested(true);
    }, 1000);

    const ctaTimer = setTimeout(() => setCtaEnabled(true), 3000);

    const interval = setInterval(() => {
      setCountDown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(reviewTimer);
      clearTimeout(ctaTimer);
      clearInterval(interval);
    };
  }, []);

  const MILESTONES = [
    'Personalized grow plan built',
    'AI plant scanner ready',
    'Grow journal activated',
    'Your first diagnosis complete',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#ECFDF5] via-white to-white flex flex-col items-center px-6 pt-14 pb-10 font-sans relative overflow-hidden">
      <Confetti />

      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#059669]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Plant photo badge (or sparkle fallback) */}
      <div className="relative mb-6 z-10">
        {scanImage ? (
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-2xl shadow-emerald-500/30 ring-4 ring-[#059669]/30">
              <img src={scanImage} alt="Your plant" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-11 h-11 bg-[#059669] rounded-full flex items-center justify-center shadow-lg shadow-[#059669]/40 border-2 border-white">
              <CheckCircle size={22} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="absolute -top-2 -left-2 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
              <Sparkles size={16} className="text-yellow-900" strokeWidth={2.5} />
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="w-32 h-32 bg-gradient-to-br from-[#059669] to-emerald-700 rounded-full flex items-center justify-center shadow-2xl shadow-[#059669]/40">
              <Sparkles size={56} className="text-white" strokeWidth={1.8} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-11 h-11 bg-[#059669] rounded-full flex items-center justify-center shadow-lg border-2 border-white">
              <CheckCircle size={22} className="text-white" strokeWidth={2.5} />
            </div>
          </div>
        )}
      </div>

      {/* Headline */}
      <div className="text-center mb-8 z-10">
        <div className="inline-block bg-[#059669] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-3 shadow-lg shadow-[#059669]/30">
          Setup Complete
        </div>
        <h1 className="text-4xl font-black text-slate-900 mb-2">
          You're all set!
        </h1>
        <p className="text-[#059669] font-bold text-lg">
          {experienceLevel === 'first_grow' ? 'Your first grow is going to be legendary. 🌱' :
           experienceLevel === 'beginner' ? 'Time to level up your grows! 🚀' :
           experienceLevel === 'expert' ? 'Ready to optimize and dominate! 💪' :
           'Your best grows are ahead of you! 🌿'}
        </p>
        <p className="text-slate-500 text-sm mt-2">MasterGrowbot is ready to guide every step.</p>
      </div>

      {/* Milestones */}
      <div className="w-full space-y-2.5 mb-6 z-10">
        {MILESTONES.map((m, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-white border border-slate-200 shadow-sm rounded-xl p-3.5"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="w-7 h-7 rounded-full bg-[#ECFDF5] border border-[#059669]/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle size={16} className="text-[#059669]" strokeWidth={2.5} />
            </div>
            <span className="text-slate-800 text-sm font-semibold">{m}</span>
          </div>
        ))}
      </div>

      {/* Neutral follow-up after the Apple review sheet appears. We do NOT
          assume the user rated — Apple Guideline 5.6.1 prohibits implying or
          thanking users for reviews they may not have submitted. */}
      {reviewRequested && (
        <div className="w-full bg-[#ECFDF5] border border-[#059669]/20 rounded-2xl p-4 mb-6 text-center z-10 shadow-sm">
          <div className="flex justify-center mb-2">
            <div className="w-9 h-9 rounded-full bg-[#059669] flex items-center justify-center">
              <Sparkles size={18} className="text-white" strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-slate-700 text-sm font-semibold">You're all set — let's build your personalized grow plan.</p>
        </div>
      )}

      <div className="flex-1" />

      {/* CTA */}
      <button
        onClick={onNext}
        disabled={!ctaEnabled}
        className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 z-10 ${
          ctaEnabled
            ? 'bg-[#059669] text-white shadow-xl shadow-[#059669]/30'
            : 'bg-slate-100 text-slate-400'
        }`}
      >
        {ctaEnabled ? (
          <>Unlock Your Full Grow Plan <ChevronRight size={20} /></>
        ) : (
          <>Get ready... ({countDown})</>
        )}
      </button>

      {/* Confetti CSS */}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default CongratsReview;
