
import React from 'react';
import { UserProfile } from '../types';
import Growbot from '../components/Growbot';
import { CheckCircle2, ArrowRight, Zap, Target, Sprout } from 'lucide-react';

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
    <div className="min-h-screen bg-surface text-text-main flex flex-col relative overflow-hidden">
      {/* Soft Light Background */}
      <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-20%] w-[400px] h-[400px] bg-neon-blue/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="flex-1 flex flex-col px-8 pt-16 pb-8 z-10">
        
        {/* Success Animation Area */}
        <div className="flex flex-col items-center justify-center mb-8 animate-in scale-in duration-500">
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
           <p className="text-text-sub text-center font-medium">
             I've customized your protocol for an <br/>
             <span className="text-primary font-bold">{profile.grow_mode} {profile.experience}</span> setup.
           </p>
        </div>

        {/* The Value Card */}
        <div className="bg-white rounded-3xl p-6 shadow-card border border-gray-100 mb-8 animate-in slide-in-from-bottom-10 duration-700 delay-200">
           <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
             Your Personalized Plan
           </h3>
           
           <div className="space-y-4">
              <div className="flex items-start gap-4">
                 <div className="bg-blue-50 p-2 rounded-xl text-neon-blue">
                    <Target size={20} />
                 </div>
                 <div>
                    <h4 className="font-bold text-text-main text-sm">Goal: {profile.goal}</h4>
                    <p className="text-xs text-text-sub mt-1">
                      AI will prioritize nutrients and lighting tips specifically for {getValueProp()}.
                    </p>
                 </div>
              </div>

              <div className="flex items-start gap-4">
                 <div className="bg-green-50 p-2 rounded-xl text-primary">
                    <Sprout size={20} />
                 </div>
                 <div>
                    <h4 className="font-bold text-text-main text-sm">Space: {profile.space}</h4>
                    <p className="text-xs text-text-sub mt-1">
                      Monitoring calibrated for a {profile.space.toLowerCase()} scale operation.
                    </p>
                 </div>
              </div>

              <div className="flex items-start gap-4">
                 <div className="bg-purple-50 p-2 rounded-xl text-deep-purple">
                    <Zap size={20} />
                 </div>
                 <div>
                    <h4 className="font-bold text-text-main text-sm">24/7 AI Coach</h4>
                    <p className="text-xs text-text-sub mt-1">
                      Instant diagnosis for pests, deficiencies, and environmental stress.
                    </p>
                 </div>
              </div>
           </div>
        </div>

        <div className="mt-auto">
          <button 
            onClick={onContinue}
            className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform group"
          >
            Access Dashboard <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default OnboardingSummary;