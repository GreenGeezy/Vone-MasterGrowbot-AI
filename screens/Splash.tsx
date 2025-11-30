
import React from 'react';
import Growbot from '../components/Growbot';
import { ArrowRight, ShieldCheck, TrendingUp } from 'lucide-react';

interface SplashProps {
  onGetStarted: () => void;
}

const Splash: React.FC<SplashProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-surface text-text-main relative overflow-hidden flex flex-col">
      {/* Light Mode Gradients */}
      <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_20%,rgba(52,211,153,0.1),transparent_60%)] pointer-events-none"></div>
      
      {/* Floating Orbs (Softened) */}
      <div className="absolute top-[-10%] left-[-20%] w-96 h-96 bg-primary/5 rounded-full blur-[80px] animate-float"></div>
      <div className="absolute bottom-[-10%] right-[-20%] w-96 h-96 bg-neon-blue/5 rounded-full blur-[80px] animate-pulse-glow"></div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 z-10 relative pt-8 pb-4 overflow-y-auto no-scrollbar">
        
        {/* Hero Character */}
        <div className="mb-4 relative flex-shrink-0">
          <div className="absolute inset-0 bg-primary/20 blur-[50px] opacity-40 animate-pulse"></div>
          <Growbot size="lg" mood="happy" />
          {/* Trust Badge - Updated Text */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-gray-100 whitespace-nowrap shadow-soft">
            <ShieldCheck size={14} className="text-primary" />
            <span className="text-[10px] font-bold tracking-wider text-text-main uppercase">Trusted by Elite Growers Worldwide</span>
          </div>
        </div>

        {/* Headlines */}
        <div className="text-center space-y-3 max-w-md mt-6">
          {/* Headline - Updated */}
          <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-text-main">
            Save Your Cannabis Plants in Seconds Just By Taking a Pic
          </h1>
          
          {/* Sub-headline - Updated */}
          <p className="text-sm font-medium text-text-sub leading-relaxed px-2">
            AI instantly analyzes plant health to detect issues early and help protect yield and quality for all types of growers.
          </p>

          {/* Payoff Line - Updated */}
          <p className="text-primary font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 mt-8">
            <TrendingUp size={16} />
            Grow confidently — no more guessing
          </p>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="p-6 z-20 bg-gradient-to-t from-white via-white/95 to-transparent pt-4 flex-shrink-0">
        <button 
          onClick={onGetStarted}
          className="group relative w-full bg-text-main text-white font-black text-xl py-4 rounded-2xl shadow-xl overflow-hidden active:scale-[0.98] transition-transform"
        >
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
          <span className="relative flex items-center justify-center gap-2">
            GET STARTED <ArrowRight size={24} />
          </span>
        </button>
        <p className="text-center text-[10px] text-text-sub mt-4 font-medium">
          Award-Winning Technology • Secure & Private
        </p>
      </div>
    </div>
  );
};

export default Splash;
