
import React, { useState } from 'react';
import { Settings, RotateCcw, UserPlus, Unlock, Lock, LogOut } from 'lucide-react';
import { OnboardingStep } from '../types';
import { supabase } from '../services/supabaseClient';

interface DevToolsProps {
  onReset: () => void;
  onInjectProfile: () => void;
  onToggleTrial: () => void;
  isTrialActive: boolean;
  currentStep: OnboardingStep;
}

const DevTools: React.FC<DevToolsProps> = ({ 
  onReset, 
  onInjectProfile, 
  onToggleTrial, 
  isTrialActive, 
  currentStep 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleHardLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-[100] bg-black/80 text-primary-light p-3 rounded-full border border-white/20 shadow-lg hover:scale-110 transition-transform"
      >
        <Settings size={20} className="animate-spin-slow" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 z-[100] bg-[#0A0A0A] border border-white/10 rounded-2xl p-4 w-64 shadow-[0_0_30px_rgba(0,0,0,0.5)] animate-in slide-in-from-right duration-300">
      <div className="flex justify-between items-center mb-4">
        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Dev Controls</span>
        <button onClick={() => setIsOpen(false)} className="text-white/20 hover:text-white transition-colors">
          <Settings size={16} />
        </button>
      </div>

      <div className="space-y-3">
        {/* Status Box */}
        <div className="bg-[#141414] p-3 rounded-xl text-[11px] font-mono text-white/60 border border-white/5 mb-2 leading-relaxed">
          <div>Step: <span className="text-neon-blue">{currentStep}</span></div>
          <div>Trial: <span className={isTrialActive ? "text-white" : "text-alert-red"}>{isTrialActive ? 'ACTIVE' : 'INACTIVE'}</span></div>
        </div>

        {/* Action Buttons */}
        <button 
          onClick={onInjectProfile}
          className="w-full flex items-center gap-3 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-[11px] font-bold text-white py-3 px-4 rounded-xl transition-all active:scale-95"
        >
          <UserPlus size={16} className="text-neon-blue" /> Inject Mock Profile
        </button>

        <button 
          onClick={onToggleTrial}
          className="w-full flex items-center gap-3 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-[11px] font-bold text-white py-3 px-4 rounded-xl transition-all active:scale-95"
        >
          {isTrialActive ? <Lock size={16} className="text-alert-red" /> : <Unlock size={16} className="text-primary-light" />}
          {isTrialActive ? 'Revoke Trial' : 'Force Activate Trial'}
        </button>

        <button 
          onClick={onReset}
          className="w-full flex items-center gap-3 bg-[#2A1616] hover:bg-[#3D1A1A] text-[11px] font-bold text-alert-red py-3 px-4 rounded-xl transition-all active:scale-95 border border-alert-red/10"
        >
          <RotateCcw size={16} /> Restart Onboarding
        </button>

        <button 
          onClick={handleHardLogout}
          className="w-full flex items-center justify-center gap-3 bg-[#1B212A] hover:bg-[#242C38] text-[11px] font-black text-white py-3.5 px-4 rounded-xl transition-all active:scale-95 border border-white/5 uppercase tracking-wide mt-2"
        >
          <LogOut size={16} className="text-orange-400" /> SUPABASE HARD LOGOUT
        </button>
      </div>
    </div>
  );
};

export default DevTools;
