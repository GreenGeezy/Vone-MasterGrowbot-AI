import React, { useState } from 'react';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { ChevronRight } from 'lucide-react';
import { hapticSelect, hapticImpact } from '../../utils/haptics';

interface GrowingGoalsProps {
  onNext: (goal: string) => void;
  onBack: () => void;
}

const OPTIONS = [
  { id: 'max_yield', emoji: '⚖️', label: 'Maximize Yield', sub: 'Get the most out of every grow' },
  { id: 'top_quality', emoji: '💎', label: 'Top-Shelf Quality', sub: 'Potency, flavor, and bag appeal' },
  { id: 'learn_skills', emoji: '📚', label: 'Learn & Improve', sub: 'Build expertise and master growing' },
  { id: 'low_maintenance', emoji: '😌', label: 'Low Maintenance', sub: 'Simple grows with great results' },
  { id: 'stealth', emoji: '🕵️', label: 'Discreet Growing', sub: 'Compact, odor-controlled setups' },
];

const GrowingGoals: React.FC<GrowingGoalsProps> = ({ onNext, onBack }) => {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 pt-14 pb-10 font-sans">
      <div className="mb-8">
        <OnboardingProgressBar current={2} total={9} />
      </div>

      <div className="mb-8">
        <button onClick={onBack} className="text-slate-400 text-sm font-bold mb-4 flex items-center gap-1">
          ← Back
        </button>
        <p className="text-[#059669] text-sm font-bold uppercase tracking-widest mb-2">Step 2 of 9</p>
        <h1 className="text-3xl font-black text-slate-900 leading-tight">
          What's your<br />
          <span className="text-[#059669]">main goal?</span>
        </h1>
        <p className="text-slate-500 text-sm mt-2">Your AI grow coach will focus on what matters most to you.</p>
      </div>

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

export default GrowingGoals;
