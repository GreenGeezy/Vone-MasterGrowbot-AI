import React from 'react';
import { UserProfile } from '../types';
import Growbot from '../components/Growbot';
import { CheckCircle2, ArrowRight, Target, Sprout, Zap, ShieldCheck, BrainCircuit, Sparkles, ListChecks, Star } from 'lucide-react';

interface SummaryProps {
  profile: UserProfile;
  onContinue: () => void;
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

const OnboardingSummary: React.FC<SummaryProps> = ({ profile, onContinue }) => {

  const getInsight = () => {
    if (profile.experience === 'Novice') {
      return "We'll give step-by-step tasks and simplified guidance so you avoid common beginner mistakes.";
    }
    if (profile.space === 'Small') {
      return "Small space: we'll prioritize compact training and airflow tips to keep plants healthy.";
    }
    if (profile.goal === 'Maximize Yield') {
      return "Focus on consistent nutrient schedules and targeted lighting cycles to boost yields in a small space.";
    }
    if (profile.grow_mode === 'Indoor') {
      return "Indoor setup: watch VPD and airflow closely — we'll surface timely alerts when conditions drift.";
    }
    return `Your plan is uniquely calibrated to your ${profile.grow_mode} setup for optimal plant health.`;
  };

  const insight = getInsight();

  const getValueProp = () => {
    if (profile.goal === 'Maximize Yield') return "Boosting Yields";
    if (profile.goal === 'Improve Quality') return "Maximizing Potency";
    return "Expert Education";
  };

  return (
    <div className="h-screen bg-surface text-text-main flex flex-col relative overflow-hidden font-sans">
      {/* Soft Light Background */}
      <div className="absolute top-[-20%] right-[-20%] w-full max-w-[500px] aspect-square bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-20%] w-full max-w-[400px] aspect-square bg-neon-blue/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Step Indicator */}
      <div className="w-full text-center pt-6 pb-2 z-20">
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-sub opacity-80">
          Step 3 of 3 — Activate Your Grow Plan
        </span>
      </div>

      <div className="flex-1 flex flex-col px-6 pt-2 overflow-y-auto no-scrollbar z-10 pb-40">

        {/* Hero Area */}
        <div className="flex flex-col items-center justify-center mb-6 flex-shrink-0 animate-in fade-in duration-700">

          {/* Social Proof Microcopy */}
          <div className="mb-4 flex items-center gap-1.5 opacity-80">
            <ShieldCheck size={12} className="text-primary" />
            <span className="text-[10px] font-medium text-text-sub">Used by beginners and experts worldwide</span>
          </div>

          {/* Hero */}
          <div className="relative mb-6 motion-safe:animate-[scale-in_1.2s_cubic-bezier(0.25,1,0.5,1)]">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl motion-safe:animate-pulse"></div>
            <Growbot size="xl" mood="happy" />
            <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg border border-gray-100">
              <CheckCircle2 size={24} className="text-primary fill-current bg-white rounded-full" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-center text-text-main mb-3 tracking-tight leading-tight">
            Your Personalized Grow Plan Is Ready!
          </h1>

          <p className="text-center text-text-sub text-sm font-medium leading-relaxed px-4 mb-6 max-w-md">
            Your grow is now optimized for healthier plants and a smoother harvest. Your plan is uniquely calibrated to your setup and experience.
          </p>

          {/* Concise Personalized Insight */}
          <div className="bg-primary/5 border-l-4 border-primary/20 pl-4 pr-3 py-3 rounded-r-xl max-w-sm mb-5 shadow-sm">
            <p className="text-text-main text-left font-bold text-sm leading-snug">
              {insight}
            </p>
          </div>

          {/* AI Personalization Badges */}
          <div className="flex flex-wrap justify-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1.5 rounded-full text-[10px] font-bold text-text-sub shadow-sm">
              <BrainCircuit size={12} className="text-neon-blue" /> AI-Tuned
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1.5 rounded-full text-[10px] font-bold text-text-sub shadow-sm">
              <Sparkles size={12} className="text-deep-purple" /> Personalized to You
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1.5 rounded-full text-[10px] font-bold text-text-sub shadow-sm">
              <ListChecks size={12} className="text-primary" /> Actionable Steps
            </span>
          </div>
        </div>

        {/* Personalized Plan Card */}
        <div className="bg-gradient-to-br from-white to-[#F0FDF4] rounded-[2rem] p-6 shadow-card border border-emerald-100/80 mb-6 flex-shrink-0 relative overflow-hidden animate-in slide-in-from-bottom-8 duration-700 delay-100">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/30 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

          <h3 className="text-xs font-black text-text-sub uppercase tracking-wider mb-5 border-b border-emerald-100 pb-3 relative z-10 flex items-center gap-2">
            Your Personalized Settings:
          </h3>

          <div className="space-y-6 relative z-10">
            <div className="flex items-start gap-4">
              <div className="bg-blue-50 p-3.5 rounded-2xl text-neon-blue shadow-sm ring-1 ring-blue-100/50">
                <Target size={26} strokeWidth={2.5} />
              </div>
              <div className="pt-0.5">
                <h4 className="font-black text-text-main text-base tracking-tight">Goal: {profile.goal}</h4>
                <p className="text-xs text-text-sub mt-1.5 font-medium leading-relaxed opacity-90">
                  AI will prioritize nutrients and lighting tips specifically for {getValueProp()}.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-green-50 p-3.5 rounded-2xl text-primary shadow-sm ring-1 ring-green-100/50">
                <Sprout size={26} strokeWidth={2.5} />
              </div>
              <div className="pt-0.5">
                <h4 className="font-black text-text-main text-base tracking-tight">Space: {profile.space}</h4>
                <p className="text-xs text-text-sub mt-1.5 font-medium leading-relaxed opacity-90">
                  Monitoring calibrated for a {profile.space?.toLowerCase()} scale operation.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-purple-50 p-3.5 rounded-2xl text-deep-purple shadow-sm ring-1 ring-purple-100/50">
                <Zap size={26} strokeWidth={2.5} />
              </div>
              <div className="pt-0.5">
                <h4 className="font-black text-text-main text-base tracking-tight">Strain Intelligence</h4>
                <p className="text-xs text-text-sub mt-1.5 font-medium leading-relaxed opacity-90">
                  Tailored advice for your specific genetics and environment.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SOCIAL PROOF SECTION — extracted from old onboarding flow */}
        <div className="mb-4">
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-1 mb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={16} className="text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            <h3 className="text-sm font-black text-text-main">
              Trusted by Elite Growers
            </h3>
            <p className="text-[10px] text-text-sub font-medium mt-1">
              Real results from real growers
            </p>
          </div>

          <div className="space-y-3">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-text-main font-black text-sm">{t.name}</div>
                    <div className="text-text-sub text-xs">{t.location}</div>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.stars }).map((_, j) => (
                      <Star key={j} size={12} className="text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                </div>
                <p className="text-text-main text-sm leading-relaxed mb-3">"{t.text}"</p>
                <div className="flex gap-2">
                  <span className="bg-[#ECFDF5] text-[#059669] text-[10px] font-black px-2 py-1 rounded-full uppercase border border-[#059669]/20">{t.yield}</span>
                  <span className="bg-gray-100 text-text-sub text-[10px] font-bold px-2 py-1 rounded-full">{t.grow}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="absolute bottom-0 left-0 right-0 p-8 pb-12 z-20 bg-gradient-to-t from-surface via-surface/95 to-transparent">
        <button
          onClick={onContinue}
          className="w-full py-4 bg-text-main text-white font-bold rounded-2xl shadow-xl shadow-gray-300/30 flex items-center justify-center gap-2 active:scale-95 hover:scale-[1.02] transition-all duration-300 group"
        >
          View My Personalized Plan <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <style>{`
        @keyframes scale-in {
          0% { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default OnboardingSummary;
