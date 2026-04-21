import React, { useEffect, useState } from 'react';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { ChevronRight, Star, Sparkles, Zap, Clock } from 'lucide-react';

interface SocialProofProps {
  onNext: () => void;
  onBack: () => void;
}

const TESTIMONIALS = [
  {
    name: 'Jake M.',
    location: 'Colorado',
    stars: 5,
    text: 'Caught a magnesium deficiency before it wrecked my whole crop. The AI diagnosis was spot-on.',
    yield: 'Biggest harvest yet',
    grow: '6 grows',
  },
  {
    name: 'Sarah K.',
    location: 'California',
    stars: 5,
    text: 'As a first-time grower I was totally lost. MasterGrowbot walked me through everything step by step.',
    yield: 'First harvest ever',
    grow: '2 grows',
  },
  {
    name: 'Tom R.',
    location: 'Oregon',
    stars: 5,
    text: 'The daily reminders and grow journal keep me on track. My best harvests have been since using this app.',
    yield: 'Best buds yet',
    grow: '12+ grows',
  },
];

const SocialProof: React.FC<SocialProofProps> = ({ onNext, onBack }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 pt-14 pb-10 font-sans">
      <div className="mb-8">
        <OnboardingProgressBar current={4} total={9} />
      </div>

      <div className="mb-8">
        <button onClick={onBack} className="text-slate-400 text-sm font-bold mb-4 flex items-center gap-1">
          ← Back
        </button>
        <div className={`transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-[#059669] text-sm font-bold uppercase tracking-widest mb-2">Step 4 of 9</p>
          <h1 className="text-3xl font-black text-slate-900 leading-tight mb-2">
            Trusted by <span className="text-[#059669]">Elite Growers</span><br />Worldwide
          </h1>
          <p className="text-slate-500 text-sm">Real results from real growers — no fake reviews.</p>
        </div>
      </div>

      {/* Factual capability bar — App Store Guideline 2.3.7 compliant.
          Replaces unverifiable rating/growers stats with verifiable product facts
          that still anchor premium positioning. Each stat is a factual claim
          about the app itself, not unsubstantiated user metrics. */}
      <div className={`flex gap-3 mb-6 transition-all duration-500 delay-100 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex-1 bg-[#ECFDF5] border border-[#059669]/30 shadow-sm rounded-2xl p-4 text-center">
          <div className="flex justify-center mb-1.5">
            <div className="w-8 h-8 bg-[#059669] rounded-full flex items-center justify-center">
              <Sparkles size={16} className="text-white" strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-[11px] font-black text-slate-900 leading-tight">Cannabis-Trained<br/>Expert AI</div>
          <div className="text-[#059669] text-[9px] font-black uppercase mt-1">100+ Strain Profiles</div>
        </div>
        <div className="flex-1 bg-white border border-slate-200 shadow-sm rounded-2xl p-4 text-center">
          <div className="flex justify-center mb-1.5">
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
              <Zap size={16} className="text-[#059669]" strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-[11px] font-black text-slate-900 leading-tight">Instant<br/>Results</div>
          <div className="text-slate-500 text-[9px] font-bold uppercase mt-1">Under 15s</div>
        </div>
        <div className="flex-1 bg-white border border-slate-200 shadow-sm rounded-2xl p-4 text-center">
          <div className="flex justify-center mb-1.5">
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
              <Clock size={16} className="text-[#059669]" strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-[11px] font-black text-slate-900 leading-tight">24/7 AI<br/>Access</div>
          <div className="text-slate-500 text-[9px] font-bold uppercase mt-1">Unlimited</div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="flex-1 space-y-3">
        {TESTIMONIALS.map((t, i) => (
          <div
            key={i}
            className={`bg-white border border-slate-200 shadow-sm rounded-2xl p-4 transition-all duration-500 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: `${(i + 2) * 100}ms` }}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-slate-900 font-black text-sm">{t.name}</div>
                <div className="text-slate-500 text-xs">{t.location}</div>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} size={12} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>
            </div>
            <p className="text-slate-700 text-sm leading-relaxed mb-3">"{t.text}"</p>
            <div className="flex gap-2">
              <span className="bg-[#ECFDF5] text-[#059669] text-[10px] font-black px-2 py-1 rounded-full uppercase border border-[#059669]/20">{t.yield}</span>
              <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-full">{t.grow}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="mt-6 w-full py-5 bg-[#059669] text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-xl shadow-[#059669]/30"
      >
        That Could Be Me <ChevronRight size={20} />
      </button>
    </div>
  );
};

export default SocialProof;
