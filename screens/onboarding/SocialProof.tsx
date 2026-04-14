import React, { useEffect, useState } from 'react';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { ChevronRight, Star } from 'lucide-react';

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
    yield: '+34% yield',
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
    yield: '+52% quality',
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
    <div className="min-h-screen bg-[#0A1628] flex flex-col px-6 pt-14 pb-10 font-sans">
      {/* Progress */}
      <div className="mb-8">
        <OnboardingProgressBar current={4} total={9} />
      </div>

      {/* Header */}
      <div className="mb-8">
        <button onClick={onBack} className="text-white/40 text-sm font-bold mb-4 flex items-center gap-1">
          ← Back
        </button>
        <div className={`transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-[#059669] text-sm font-bold uppercase tracking-widest mb-2">Step 4 of 9</p>
          <h1 className="text-3xl font-black text-white leading-tight mb-2">
            Join <span className="text-[#059669]">2,847 growers</span><br />already thriving
          </h1>
          <p className="text-white/50 text-sm">Real results from real growers — no fake reviews.</p>
        </div>
      </div>

      {/* Social Stats Bar */}
      <div className={`flex gap-3 mb-6 transition-all duration-500 delay-100 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-black text-white">4.9</div>
          <div className="flex justify-center mt-1">
            {[1,2,3,4,5].map(i => <Star key={i} size={10} className="text-yellow-400 fill-yellow-400" />)}
          </div>
          <div className="text-white/40 text-[10px] mt-1 uppercase font-bold">App Store</div>
        </div>
        <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-black text-white">2,847</div>
          <div className="text-[#059669] text-[10px] font-black uppercase mt-1">Active Growers</div>
        </div>
        <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-black text-white">94%</div>
          <div className="text-white/40 text-[10px] mt-1 uppercase font-bold">Success Rate</div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="flex-1 space-y-3">
        {TESTIMONIALS.map((t, i) => (
          <div
            key={i}
            className={`bg-white/5 border border-white/10 rounded-2xl p-4 transition-all duration-500 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: `${(i + 2) * 100}ms` }}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-white font-black text-sm">{t.name}</div>
                <div className="text-white/40 text-xs">{t.location}</div>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} size={12} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>
            </div>
            <p className="text-white/70 text-sm leading-relaxed mb-3">"{t.text}"</p>
            <div className="flex gap-2">
              <span className="bg-[#059669]/20 text-[#059669] text-[10px] font-black px-2 py-1 rounded-full uppercase">{t.yield}</span>
              <span className="bg-white/5 text-white/50 text-[10px] font-bold px-2 py-1 rounded-full">{t.grow}</span>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onNext}
        className="mt-6 w-full py-5 bg-[#059669] text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-2xl shadow-[#059669]/40"
      >
        That Could Be Me <ChevronRight size={20} />
      </button>
    </div>
  );
};

export default SocialProof;
