import React, { useState } from 'react';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { ChevronRight } from 'lucide-react';
import { hapticSelect, hapticImpact } from '../../utils/haptics';

interface ExperienceLevelProps {
  onNext: (level: string) => void;
}

const OPTIONS = [
  { id: 'first_grow', emoji: '🌱', label: 'First Grow', sub: 'Never grown before' },
  { id: 'beginner', emoji: '🪴', label: 'Beginner', sub: '1–2 grows under my belt' },
  { id: 'intermediate', emoji: '🌿', label: 'Intermediate', sub: '3–10 successful grows' },
  { id: 'advanced', emoji: '🌲', label: 'Advanced', sub: '10+ grows, dialing it in' },
  { id: 'expert', emoji: '🏆', label: 'Expert', sub: 'Commercial or master grower' },
];

const ExperienceLevel: React.FC<ExperienceLevelProps> = ({ onNext }) => {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 pt-14 pb-10 font-sans">
      {/* Progress */}
      <div className="mb-8">
        <OnboardingProgressBar current={1} total={9} />
      </div>

      {/* Header */}
      <div className="mb-8">
        <p className="text-[#059669] text-sm font-bold uppercase tracking-widest mb-2">Step 1 of 9</p>
        <h1 className="text-3xl font-black text-slate-900 leading-tight">
          What's your<br />
          <span className="text-[#059669]">experience level?</span>
        </h1>
        <p className="text-slate-500 text-sm mt-2">We'll personalize your grow plan around where you are right now.</p>
      </div>

      {/* Options */}
      <div className="flex-1 space-y-3">
        {OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => { hapticSelect(); setSelected(opt.id); }}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all active:scale-[0.98] text-left ${
              selected === opt.id
                ? 'bg-[#ECFDF5] border-[#059669] shadow-lg shadow-emerald-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
            }`}
          >
            <span className="text-3xl leading-none">{opt.emoji}</span>
            <div className="flex-1">
              <div className={`font-black text-base ${selected === opt.id ? 'text-slate-900' : 'text-slate-800'}`}>
                {opt.label}
              </div>
              <div className="text-slate-500 text-xs mt-0.5">{opt.sub}</div>
            </div>
            {selected === opt.id && (
              <div className="w-6 h-6 rounded-full bg-[#059669] flex items-center justify-center flex-shrink-0">
                <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                  <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={() => { if (selected) { hapticImpact(); onNext(selected); } }}
        disabled={!selected}
        className={`mt-6 w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
          selected
            ? 'bg-[#059669] text-white shadow-xl shadow-[#059669]/30'
            : 'bg-slate-100 text-slate-400'
        }`}
      >
        Continue <ChevronRight size={20} />
      </button>
    </div>
  );
};

export default ExperienceLevel;
