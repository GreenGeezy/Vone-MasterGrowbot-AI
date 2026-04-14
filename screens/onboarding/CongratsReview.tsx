import React, { useEffect, useState } from 'react';
import { InAppReview } from '@capacitor-community/in-app-review';
import { ChevronRight, Star, CheckCircle } from 'lucide-react';

interface CongratsReviewProps {
  onNext: () => void;
  experienceLevel: string;
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

const CongratsReview: React.FC<CongratsReviewProps> = ({ onNext, experienceLevel }) => {
  const [ctaEnabled, setCtaEnabled] = useState(false);
  const [reviewRequested, setReviewRequested] = useState(false);
  const [countDown, setCountDown] = useState(3);

  useEffect(() => {
    // Request in-app review after 1 second
    const reviewTimer = setTimeout(async () => {
      try {
        await InAppReview.requestReview();
        setReviewRequested(true);
      } catch (e) {
        console.warn('In-app review failed:', e);
        setReviewRequested(true);
      }
    }, 1000);

    // Enable CTA after 3 seconds
    const ctaTimer = setTimeout(() => setCtaEnabled(true), 3000);

    // Countdown
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
    <div className="min-h-screen bg-[#0A1628] flex flex-col items-center px-6 pt-16 pb-10 font-sans relative overflow-hidden">
      {/* Confetti */}
      <Confetti />

      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#059669]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Badge */}
      <div className="relative mb-6">
        <div className="w-28 h-28 bg-gradient-to-br from-[#059669] to-emerald-700 rounded-full flex items-center justify-center shadow-2xl shadow-[#059669]/50">
          <span className="text-5xl">🏆</span>
        </div>
        <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
          <Star size={18} className="text-yellow-900 fill-yellow-900" />
        </div>
      </div>

      {/* Headline */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-white mb-2">
          You're all set!
        </h1>
        <p className="text-[#059669] font-bold text-lg">
          {experienceLevel === 'first_grow' ? 'Your first grow is going to be legendary. 🌱' :
           experienceLevel === 'beginner' ? 'Time to level up your grows! 🚀' :
           experienceLevel === 'expert' ? 'Ready to optimize and dominate! 💪' :
           'Your best grows are ahead of you! 🌿'}
        </p>
        <p className="text-white/50 text-sm mt-2">MasterGrowbot is ready to guide every step.</p>
      </div>

      {/* Milestones */}
      <div className="w-full space-y-2.5 mb-8">
        {MILESTONES.map((m, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3.5"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <CheckCircle size={18} className="text-[#059669] flex-shrink-0" />
            <span className="text-white/80 text-sm font-semibold">{m}</span>
          </div>
        ))}
      </div>

      {/* Review prompt (shown after review dialog closes) */}
      {reviewRequested && (
        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 text-center">
          <div className="flex justify-center gap-1 mb-2">
            {[1,2,3,4,5].map(i => <Star key={i} size={20} className="text-yellow-400 fill-yellow-400" />)}
          </div>
          <p className="text-white/60 text-sm">Thanks for rating MasterGrowbot! Your review helps other growers find us.</p>
        </div>
      )}

      <div className="flex-1" />

      {/* CTA */}
      <button
        onClick={onNext}
        disabled={!ctaEnabled}
        className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
          ctaEnabled
            ? 'bg-[#059669] text-white shadow-2xl shadow-[#059669]/40'
            : 'bg-white/10 text-white/40'
        }`}
      >
        {ctaEnabled ? (
          <>Start Growing with AI <ChevronRight size={20} /></>
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
