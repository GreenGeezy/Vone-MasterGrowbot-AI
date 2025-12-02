import React from 'react';
import { UserProfile } from '../types';
import Growbot from '../components/Growbot';
import { CheckCircle2, ArrowRight, Zap, Target, Sprout, Sparkles } from 'lucide-react';

interface SummaryProps {
  profile: UserProfile;
  onContinue: () => void;
}

const OnboardingSummary: React.FC<SummaryProps> = ({ profile, onContinue }) => {
  
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

      <div className="flex-1 flex flex-col px-6 pt-10 overflow-y-auto no-scrollbar z-10">
        
        {/* Success Animation Area */}
        <div className="flex flex-col items-center justify-center mb-8 animate-in scale-in duration-500 flex-shrink-0">
           
           {/* Top Badge */}
           <div className="mb-6 flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-gray-200/50 shadow-sm animate-in fade-in slide-in-from-top-4 duration-700">
               <Sparkles size={12} className="text-primary fill-primary/20" />
               <span className="text-[10px] font-bold tracking-wider text-text-sub uppercase">Your Personalized Grow Plan Is Ready</span>
           </div>

           <div className="relative mb-6">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse"></div>
              <Growbot size="xl" mood="happy" />
              <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg border border-gray-100">
                 <CheckCircle2 size={24} className="text-primary fill-current bg-white rounded-full" />
              </div>
           </div>
           
           <h1 className="text-3xl font-extrabold text-center text-text-main mb-2 tracking-tight">
             Profile Calibrated!
           </h1>
           
           {/* Enhanced Profile Line */}
           <div className="flex flex-col items-center gap-2 mt-1">
               <p className="text-text-sub text-center font-medium text-sm">
                 I've customized your protocol for:
               </p>
               <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 border border-emerald-100 rounded-full shadow-sm text-primary text-sm font-bold animate-in zoom-in-95 duration-500 delay-100">
                  <span>Setup: {profile.grow_mode}</span>
                  <span className="text-emerald-300">•</span>
                  <span>Experience: {profile.experience}</span>
               </div>
           </div>
        </div>

        {/* The Value Card - Enhanced Styles */}
        <div className="bg-gradient-to-br from-white to-[#F0FDF4] rounded-[2rem] p-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-emerald-100/60 mb-4 animate-in slide-in-from-bottom-10 duration-700 delay-200 flex-shrink-0 relative overflow-hidden">
           {/* Subtle decorative background blob in card */}
           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

           <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 border-b border-gray-100 pb-3 relative z-10">
             Your Personalized Plan
           </h3>
           
           <div className="space-y-6 relative z-10">
              <div className="flex items-start gap-5">
                 <div className="bg-blue-50 p-3 rounded-2xl text-neon-blue shadow-sm">
                    <Target size={22} />
                 </div>
                 <div className="pt-0.5">
                    <h4 className="font-bold text-text-main text-base">Goal: {profile.goal}</h4>
                    <p className="text-xs text-text-sub mt-1.5 font-medium leading-relaxed">
                      AI will prioritize nutrients and lighting tips specifically for {getValueProp()}.
                    </p>
                 </div>
              </div>

              <div className="flex items-start gap-5">
                 <div className="bg-green-50 p-3 rounded-2xl text-primary shadow-sm">
                    <Sprout size={22} />
                 </div>
                 <div className="pt-0.5">
                    <h4 className="font-bold text-text-main text-base">Space: {profile.space}</h4>
                    <p className="text-xs text-text-sub mt-1.5 font-medium leading-relaxed">
                      Monitoring calibrated for a {profile.space.toLowerCase()} scale operation.
                    </p>
                 </div>
              </div>

              <div className="flex items-start gap-5">
                 <div className="bg-purple-50 p-3 rounded-2xl text-deep-purple shadow-sm">
                    <Zap size={22} />
                 </div>
                 <div className="pt-0.5">
                    <h4 className="font-bold text-text-main text-base">24/7 AI Coach</h4>
                    <p className="text-xs text-text-sub mt-1.5 font-medium leading-relaxed">
                      Instant diagnosis for pests, deficiencies, and environmental stress.
                    </p>
                 </div>
              </div>
           </div>
        </div>
        
        {/* Helper Text */}
        <p className="text-center text-xs font-semibold text-gray-400/80 mb-6">
            Continue to unlock your full AI grow coach.
        </p>
        
        {/* Spacer for button */}
        <div className="h-24 flex-shrink-0"></div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-8 pb-12 z-20 bg-gradient-to-t from-surface via-surface/95 to-transparent">
          <button 
            onClick={onContinue}
            className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-95 active:shadow-sm hover:scale-[1.02] hover:shadow-2xl transition-all duration-300 group"
          >
            Access Dashboard <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
      </div>

    </div>
  );
};

export default OnboardingSummary;