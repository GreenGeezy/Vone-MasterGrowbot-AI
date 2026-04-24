import React, { useState } from 'react';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { ChevronRight } from 'lucide-react';
import { hapticSelect, hapticImpact } from '../../utils/haptics';

interface PainPointsProps {
  onNext: (painPoints: string[]) => void;
  onBack: () => void;
}

const OPTIONS = [
  { id: 'nutrient_deficiencies', emoji: '🍂', label: 'Nutrient Deficiencies', sub: 'Yellow leaves, spots, burn tips' },
  { id: 'pests_disease', emoji: '🐛', label: 'Pests & Disease', sub: 'Spider mites, mold, root rot' },
  { id: 'poor_yield', emoji: '📉', label: 'Disappointing Yields', sub: 'Not getting what I expected' },
  { id: 'overwatering', emoji: '💧', label: 'Watering Issues', sub: 'Overwatering or underwatering' },
  { id: 'light_problems', emoji: '☀️', label: 'Light Stress', sub: 'Too much, too little, wrong spectrum' },
  { id: 'training', emoji: '✂️', label: 'Training Techniques', sub: 'LST, topping, scrog confusion' },
];

const PainPoints: React.FC<PainPointsProps> = ({ onNext, onBack }) => {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    hapticSelect();
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 pt-14 pb-10 font-sans">
      <div className="mb-8">
        <OnboardingProgressBar current={3} total={9} />
      </div>

      <div className="mb-6">
        <button onClick={onBack} className="text-slate-400 text-sm font-bold mb-4 flex items-center gap-1">
          ← Back
        </button>
        <p className="text-[#059669] text-sm font-bold uppercase tracking-widest mb-2">Step 3 of 9</p>
        <h1 className="text-3xl font-black text-slate-900 leading-tight">
          What challenges<br />
          <span className="text-[#059669]">do you face?</span>
        </h1>
        <p className="text-slate-500 text-sm mt-2">Select all that apply. We'll build solutions around your specific struggles.</p>
      </div>

      <div className="flex-1 space-y-3">
        {OPTIONS.map(opt => {
          const isSelected = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all active:scale-[0.98] text-left ${
                isSelected
                  ? 'bg-[#ECFDF5] border-[#059669] shadow-lg shadow-emerald-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
              }`}
            >
              <span className="text-3xl leading-none">{opt.emoji}</span>
              <div className="flex-1">
                <div className={`font-black text-base ${isSelected ? 'text-slate-900' : 'text-slate-800'}`}>
                  {opt.label}
                </div>
                <div className="text-slate-500 text-xs mt-0.5">{opt.sub}</div>
              </div>
              <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                isSelected ? 'bg-[#059669] border-[#059669]' : 'border-slate-300'
              }`}>
                {isSelected && (
                  <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                    <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => { hapticImpact(); onNext(selected.length > 0 ? selected : ['none']); }}
        className="mt-6 w-full py-5 bg-[#059669] text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-[#059669]/30"
      >
        {selected.length === 0 ? 'Skip' : `Continue (${selected.length} selected)`} <ChevronRight size={20} />
      </button>
    </div>
  );
};

export default PainPoints;
