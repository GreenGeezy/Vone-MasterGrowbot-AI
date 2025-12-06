import React from 'react';
import { UserProfile } from '../types';
import Growbot from '../components/Growbot';
import { CheckCircle2, ArrowRight, Zap, Target, Sprout, Sparkles, ShieldCheck, BrainCircuit, ListChecks } from 'lucide-react';

interface SummaryProps {
  profile: UserProfile;
  onContinue: () => void;
}

const OnboardingSummary: React.FC<SummaryProps> = ({ profile, onContinue }) => {
  
  // Logic to generate ONE concise, accurate personalized insight based on quiz answers
  const getInsight = () => {
    // Priority 1: Experience Level (Novice needs guidance)
    if (profile.experience === 'Novice') {
        return "We’ll give step-by-step tasks and simplified guidance so you avoid common beginner mistakes.";
    }
    
    // Priority 2: Space Constraints (Small space needs specific care)
    if (profile.space === 'Small') {
        return "Small space: we’ll prioritize compact training and airflow tips to keep plants healthy.";
    }

    // Priority 3: Specific Goals (Yield)
    if (profile.goal === 'Maximize Yield') {
        return "Focus on consistent nutrient schedules and targeted lighting cycles to boost yields in a small space.";
    }

    // Priority 4: Environment Specifics (Indoor)
    if (profile.grow_mode === 'Indoor') {
        return "Indoor setup: watch VPD and airflow closely — we’ll surface timely alerts when conditions drift.";
    }
    
    // Fallback/General
    return `Your plan is uniquely calibrated to your ${profile.grow_mode} setup for optimal plant health.`;
  };

  const insight = getInsight();

  // Dynamic value prop based on selection
  const getValueProp = () => {
    if (profile.goal === 'Maximize Yield') return "Boosting Yields";
    if (profile.goal === 'Improve Quality') return "Maximizing Potency";
    return "Expert Education";
  };

  return (
    <div className="h-screen bg-surface text-text-main flex flex-col relative overflow-hidden font-sans">
      {/* Soft Light Background */}
      <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-20%] w-[400px] h-[400px] bg-neon-blue/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Step Indicator (Micro-progress) */}
      <div className="w-full text-center pt-6 pb-2 z-20">
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-sub opacity-80">
            Step 3 of 3 — Activate Your Grow Plan
        </span>
      </div>

      <div className="flex-1 flex flex-col px-6 pt-2 overflow-y-auto no-scrollbar z-10 pb-32">
        
        {/* Hero Area */}
        <div className="flex flex-col items-center justify-center mb-6 flex-shrink-0 animate-in fade-in duration-700">
           
           {/* Social Proof Microcopy */}
           <div className="mb-4 flex items-center gap-1.5 opacity-80">
              <ShieldCheck size={12} className="text-primary" />
              <span className="text-[10px] font-medium text-text-sub">Used by beginners and experts worldwide</span>
           </div>

           {/* Hero with Subtle Animation (Respects Reduced Motion) */}
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

           {/* Value Summary */}
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
        <div className="bg-gradient-to-br from-white to-[#F0FDF4] rounded-[2rem] p-6 shadow-card border border-emerald-100/80 mb-4 flex-shrink-0 relative overflow-hidden animate-in slide-in-from-bottom-8 duration-700 delay-100">
           {/* Decorative background blob */}
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
                      Monitoring calibrated for a {profile.space.toLowerCase()} scale operation.
                    </p>
                 </div>
              </div>

              <div className="flex items-start gap-4">
                 <div className="bg-purple-50 p-3.5 rounded-2xl text-deep-purple shadow-sm ring-1 ring-purple-100/50">
                    <Zap size={26} strokeWidth={2.5} />
                 </div>
                 <div className="pt-0.5">
                    <h4 className="font-black text-text-main text-base tracking-tight">24/7 AI Coach</h4>
                    <p className="text-xs text-text-sub mt-1.5 font-medium leading-relaxed opacity-90">
                      Instant diagnosis for pests, deficiencies, and environmental stress.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-8 pb-12 z-20 bg-gradient-to-t from-surface via-surface/95 to-transparent">
          <button 
            onClick={onContinue}
            className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-95 active:shadow-sm hover:scale-[1.02] hover:shadow-2xl transition-all duration-300 group"
          >
            Continue — View plan options <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
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