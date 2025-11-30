
import React, { useState } from 'react';
import { Settings, RotateCcw, UserPlus, Unlock, Lock } from 'lucide-react';
import { OnboardingStep, UserProfile } from '../types';

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

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-[100] bg-black/80 text-neon-green p-3 rounded-full border border-neon-green/50 shadow-lg hover:scale-110 transition-transform"
      >
        <Settings size={20} className="animate-spin-slow" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-[100] bg-black/90 backdrop-blur-md border border-neon-green/30 rounded-2xl p-4 w-64 shadow-2xl animate-in slide-in-from-right">
      <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
        <span className="text-xs font-bold text-neon-green uppercase tracking-widest">Dev Controls</span>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
          <Settings size={16} />
        </button>
      </div>

      <div className="space-y-3">
        <div className="bg-white/5 p-2 rounded text-[10px] font-mono text-gray-300 mb-3">
          <div>Step: <span className="text-neon-blue">{currentStep}</span></div>
          <div>Trial: <span className={isTrialActive ? "text-neon-green" : "text-alert-red"}>{isTrialActive ? 'ACTIVE' : 'INACTIVE'}</span></div>
        </div>

        <button 
          onClick={onInjectProfile}
          className="w-full flex items-center gap-2 bg-white/10 hover:bg-white/20 text-xs text-white py-2 px-3 rounded transition-colors"
        >
          <UserPlus size={14} className="text-neon-blue" /> Inject Mock Profile
        </button>

        <button 
          onClick={onToggleTrial}
          className="w-full flex items-center gap-2 bg-white/10 hover:bg-white/20 text-xs text-white py-2 px-3 rounded transition-colors"
        >
          {isTrialActive ? <Lock size={14} className="text-alert-red" /> : <Unlock size={14} className="text-neon-green" />}
          {isTrialActive ? 'Revoke Trial' : 'Force Activate Trial'}
        </button>

        <button 
          onClick={onReset}
          className="w-full flex items-center gap-2 bg-alert-red/20 hover:bg-alert-red/40 text-xs text-alert-red py-2 px-3 rounded transition-colors border border-alert-red/20"
        >
          <RotateCcw size={14} /> Restart Onboarding
        </button>
      </div>
    </div>
  );
};

export default DevTools;