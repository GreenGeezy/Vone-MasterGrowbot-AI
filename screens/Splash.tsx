import React, { useEffect } from 'react';
import Growbot from '../components/Growbot';
import { ArrowRight, ShieldCheck, TrendingUp } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface SplashProps {
  onGetStarted: () => void;
  onSessionActive?: () => void;
}

const Splash: React.FC<SplashProps> = ({ onGetStarted, onSessionActive }) => {
  
  // Check for existing Supabase session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && onSessionActive) {
          console.log("Active session found, redirecting to home...");
          onSessionActive();
        }
      } catch (error) {
        console.error("Session check failed", error);
      }
    };
    
    checkSession();
  }, [onSessionActive]);

  return (
    <div className="h-screen bg-surface text-text-main relative overflow-hidden flex flex-col">
      {/* Light Mode Gradients */}
      <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_20%,rgba(52,211,153,0.1),transparent_60%)] pointer-events-none"></div>
      
      {/* Floating Orbs */}
      <div className="absolute top-[-10%] left-[-20%] w-96 h-96 bg-primary/5 rounded-full blur-[80px] animate-float"></div>
      <div className="absolute bottom-[-10%] right-[-20%] w-96 h-96 bg-neon-blue/5 rounded-full blur-[80px] animate-pulse-glow"></div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 z-10 relative overflow-y-auto no-scrollbar py-6">
        
        {/* LOGO */}
        <img 
            src="https://cdn-icons-png.flaticon.com/512/3456/3456426.png" 
            alt="MasterGrowbot Logo" 
            className="w-20 h-20 mb-6 drop-shadow-lg flex-shrink-0"
        />

        <div className="flex flex-col items-center max-w-md text-center">
            
            {/* HERO GROWBOT DIV */}
            <div className="relative mb-6 flex-shrink-0">
                 <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full animate-pulse"></div>
                 <Growbot size="2xl" mood="happy" className="relative z-10" />
            </div>

            {/* Trust Badge */}
            <div className="mb-6 flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-gray-100 shadow-soft">
                <ShieldCheck size={14} className="text-primary" />
                <span className="text-[10px] font-bold tracking-wider text-text-main uppercase">Trusted by Elite Growers</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-[1.1] tracking-tight text-text-main mb-4 sm:mb-6">
                Your Personal AI <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-neon-blue">Grow Coach</span>
            </h1>
            
            {/* Sub-headline */}
            <p className="text-base sm:text-lg font-medium text-text-sub leading-relaxed px-1 mb-6 sm:mb-8 max-w-xs sm:max-w-md">
                Get plant care guidance, identify early stress signs, and improve overall plant health using AI-powered insights.
            </p>

            {/* Payoff Line */}
            <p className="text-primary font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                <TrendingUp size={16} />
                Trusted by Growers Worldwide
            </p>
        </div>
      </div>

      {/* Bottom Section - Fixed at bottom */}
      <div className="w-full p-6 pb-12 z-20 bg-gradient-to-t from-white via-white/95 to-transparent flex-shrink-0">
        <button 
          onClick={onGetStarted}
          className="group relative w-full bg-text-main text-white font-black text-xl py-4 rounded-2xl shadow-xl overflow-hidden active:scale-[0.98] transition-transform"
        >
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
          <span className="relative flex items-center justify-center gap-2">
            Start My Grow <ArrowRight size={24} />
          </span>
        </button>
        <p className="text-center text-[10px] text-text-sub mt-4 font-medium">
          Secure • Private • AI-Powered
        </p>
      </div>
    </div>
  );
};

export default Splash;