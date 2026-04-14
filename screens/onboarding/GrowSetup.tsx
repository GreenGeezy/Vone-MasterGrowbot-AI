import React, { useState } from 'react';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { ChevronRight } from 'lucide-react';

interface GrowSetupData {
  environment: string;
  medium: string;
  lighting: string;
}

interface GrowSetupProps {
  onNext: (data: GrowSetupData) => void;
  onBack: () => void;
}

const ENVIRONMENTS = [
  { id: 'indoor_tent', emoji: '⛺', label: 'Indoor Tent', sub: 'Grow tent setup' },
  { id: 'indoor_room', emoji: '🏠', label: 'Indoor Room', sub: 'Dedicated grow room' },
  { id: 'outdoor', emoji: '🌤️', label: 'Outdoor', sub: 'Natural sunlight' },
  { id: 'greenhouse', emoji: '🌡️', label: 'Greenhouse', sub: 'Controlled outdoor' },
];

const MEDIUMS = [
  { id: 'soil', emoji: '🪨', label: 'Soil', sub: 'Classic potting mix' },
  { id: 'coco', emoji: '🌴', label: 'Coco Coir', sub: 'Coconut fiber substrate' },
  { id: 'hydro', emoji: '💧', label: 'Hydroponics', sub: 'Water-based system' },
  { id: 'living_soil', emoji: '🦠', label: 'Living Soil', sub: 'Organic no-till' },
];

const LIGHTING = [
  { id: 'led', emoji: '💡', label: 'LED', sub: 'Full-spectrum LED panels' },
  { id: 'hps', emoji: '🔆', label: 'HPS / MH', sub: 'High-pressure sodium' },
  { id: 'cmh', emoji: '☀️', label: 'CMH / LEC', sub: 'Ceramic metal halide' },
  { id: 'natural', emoji: '🌞', label: 'Natural Sun', sub: 'Outdoor / greenhouse' },
];

const SelectRow = ({ options, selected, onSelect }: { options: typeof ENVIRONMENTS; selected: string | null; onSelect: (id: string) => void }) => (
  <div className="grid grid-cols-2 gap-2">
    {options.map(opt => (
      <button
        key={opt.id}
        onClick={() => onSelect(opt.id)}
        className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all active:scale-[0.97] text-left ${
          selected === opt.id
            ? 'bg-[#059669]/15 border-[#059669]'
            : 'bg-white/5 border-white/10'
        }`}
      >
        <span className="text-xl mb-1">{opt.emoji}</span>
        <span className={`font-black text-sm ${selected === opt.id ? 'text-white' : 'text-white/80'}`}>{opt.label}</span>
        <span className="text-white/40 text-[10px]">{opt.sub}</span>
      </button>
    ))}
  </div>
);

const GrowSetup: React.FC<GrowSetupProps> = ({ onNext, onBack }) => {
  const [environment, setEnvironment] = useState<string | null>(null);
  const [medium, setMedium] = useState<string | null>(null);
  const [lighting, setLighting] = useState<string | null>(null);

  const canContinue = environment && medium && lighting;

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col px-6 pt-14 pb-10 font-sans overflow-y-auto">
      {/* Progress */}
      <div className="mb-8">
        <OnboardingProgressBar current={6} total={9} />
      </div>

      {/* Header */}
      <div className="mb-6">
        <button onClick={onBack} className="text-white/40 text-sm font-bold mb-4 flex items-center gap-1">
          ← Back
        </button>
        <p className="text-[#059669] text-sm font-bold uppercase tracking-widest mb-2">Step 6 of 9</p>
        <h1 className="text-3xl font-black text-white leading-tight mb-2">
          Tell us about<br />
          <span className="text-[#059669]">your setup</span>
        </h1>
        <p className="text-white/50 text-sm">This lets us give you setup-specific advice and schedules.</p>
      </div>

      {/* Environment */}
      <div className="mb-5">
        <div className="text-white/60 text-xs font-black uppercase tracking-widest mb-3">
          🏡 Growing Environment
        </div>
        <SelectRow options={ENVIRONMENTS} selected={environment} onSelect={setEnvironment} />
      </div>

      {/* Medium */}
      <div className="mb-5">
        <div className="text-white/60 text-xs font-black uppercase tracking-widest mb-3">
          🌱 Growing Medium
        </div>
        <SelectRow options={MEDIUMS} selected={medium} onSelect={setMedium} />
      </div>

      {/* Lighting */}
      <div className="mb-6">
        <div className="text-white/60 text-xs font-black uppercase tracking-widest mb-3">
          💡 Light Source
        </div>
        <SelectRow options={LIGHTING} selected={lighting} onSelect={setLighting} />
      </div>

      {/* CTA */}
      <button
        onClick={() => canContinue && onNext({ environment: environment!, medium: medium!, lighting: lighting! })}
        disabled={!canContinue}
        className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
          canContinue
            ? 'bg-[#059669] text-white shadow-2xl shadow-[#059669]/40'
            : 'bg-white/10 text-white/30'
        }`}
      >
        Continue <ChevronRight size={20} />
      </button>
    </div>
  );
};

export default GrowSetup;
