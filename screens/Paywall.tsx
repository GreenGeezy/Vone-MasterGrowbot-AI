import React, { useState, useEffect } from 'react';
import { X, Check, ArrowRight, Mail, Infinity, Headphones, Sprout, ShieldCheck, Lock } from 'lucide-react';
import Growbot from '../components/Growbot';
import { UserProfile } from '../types';
import { supabase, signInWithGoogle } from '../services/supabaseClient';

interface PaywallProps {
  onClose: () => void; // Triggered on "Start Free Trial" (after auth)
  onSkip?: () => void; // Triggered on "Maybe Later"
  isMandatory?: boolean;
  userProfile?: UserProfile | null;
}

const Paywall: React.FC<PaywallProps> = ({ onClose, onSkip, isMandatory = false, userProfile }) => {
  const [selectedPlan, setSelectedPlan] = useState<'week' | 'month' | 'year'>('month');
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (session && showAuthModal) {
            // Automatically close auth modal and proceed if user logs in while it's open
            setShowAuthModal(false);
            onClose();
        }
    });

    return () => subscription.unsubscribe();
  }, [showAuthModal, onClose]);

  const handleStartTrial = () => {
      if (session) {
          // User is logged in, proceed to trial/app
          onClose();
      } else {
          // User needs to sign in first to secure the plan
          setShowAuthModal(true);
      }
  };

  const handleAppleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'apple' });
  };

  const handleGoogleLogin = async () => {
    await signInWithGoogle();
  };

  const handleEmailLogin = () => {
    console.log("Navigating to Email Signup/Login");
    window.location.hash = "#signup"; 
  };

  const benefits = [
    { icon: Infinity, text: "Perfect Plant Health", sub: "Unlimited AI scans & fast diagnoses." },
    { icon: Headphones, text: "24/7 Grow Coach", sub: "On-demand help and strain-specific tips." },
    { icon: Sprout, text: "Data-Driven Decisions", sub: "Strain database, grow logs, and alerts." },
  ];

  if (isLoading) {
      return <div className="fixed inset-0 bg-surface z-[60] flex items-center justify-center"><Growbot mood="thinking" /></div>;
  }

  return (
    <div className="fixed inset-0 bg-surface z-[60] flex flex-col overflow-hidden font-sans text-text-main">
      {/* Background Effects */}
      <div className="absolute top-[-20%] right-[-20%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      {/* Close Button - Only show if not mandatory */}
      {!isMandatory && !showAuthModal && (
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 bg-white p-2 rounded-full text-text-sub hover:text-text-main shadow-sm border border-gray-100 z-50 transition-colors"
        >
          <X size={20} />
        </button>
      )}

      {/* Header Section */}
      <div className="flex-shrink-0 flex flex-col items-center justify-center text-center px-6 pt-2 pb-1 z-10 mt-6">
        <div className="relative mb-0 animate-float scale-[0.6] origin-center -mt-2">
            <div className="absolute inset-0 bg-primary/20 blur-3xl opacity-30 animate-pulse"></div>
            <div className="relative">
              <Growbot size="lg" mood="happy" />
            </div>
        </div>

        <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm border border-gray-200 px-3 py-0.5 rounded-full mb-1 shadow-sm -mt-2">
           <ShieldCheck size={10} className="text-primary fill-current bg-white rounded-full" />
           <span className="text-[8px] font-bold uppercase tracking-wider text-text-sub">Trusted by Elite Growers Worldwide</span>
        </div>
        
        <h1 className="text-xl font-extrabold mb-1 tracking-tight leading-tight text-text-main">
        Upgrade to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-neon-blue">Pro</span>
        </h1>
        <p className="text-text-sub text-xs font-medium leading-relaxed px-4 mb-3 max-w-xs mx-auto">
        Grow healthier, bigger plants with your personal AI grow coach. Zero guesswork. Zero stress.
        </p>
      </div>

      {/* Scrollable Content Wrapper */}
      <div className="flex-1 bg-white border-t border-gray-100 rounded-t-[1.5rem] relative shadow-[0_-10px_60px_rgba(0,0,0,0.05)] overflow-y-auto no-scrollbar flex flex-col">
        
        <div className="px-6 pt-5 pb-8 flex-1 flex flex-col">
            
            {/* Benefits List */}
            <div className="mb-5">
            <div className="grid grid-cols-1 gap-3">
                {benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                        <benefit.icon size={16} />
                    </div>
                    <div className="pt-0.5">
                        <span className="block text-sm font-bold text-text-main leading-tight">{benefit.text}</span>
                        <span className="text-xs text-text-sub leading-snug">{benefit.sub}</span>
                    </div>
                </div>
                ))}
            </div>
            </div>

            {/* Pricing Options */}
            <div className="space-y-3 mb-4">
            
            {/* Monthly (Highlighted) */}
            <div 
                onClick={() => setSelectedPlan('month')}
                className={`relative border-[3px] p-4 rounded-2xl flex flex-col justify-center cursor-pointer overflow-hidden transition-all active:scale-[0.99] ${
                selectedPlan === 'month' 
                    ? 'border-primary bg-primary/5 shadow-card scale-[1.02]' 
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
            >
                <div className="flex justify-between items-center w-full">
                    <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="block font-bold text-text-main text-lg">Monthly Access</span>
                    </div>
                    <span className="text-xs text-text-sub">Flexible billing.</span>
                    </div>
                    
                    <div className="text-right z-10 pr-8">
                        <div className="text-xl font-black text-text-main">$29.99<span className="text-xs text-text-sub font-medium">/mo</span></div>
                        <div className="text-[9px] text-primary font-bold">Save $5 per Month</div>
                    </div>
                </div>
                
                <div className={`w-5 h-5 rounded-full border-2 absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center ${selectedPlan === 'month' ? 'border-primary bg-primary text-white' : 'border-gray-200'}`}>
                    {selectedPlan === 'month' && <Check size={12} />}
                </div>
            </div>

            {/* Yearly */}
            <div 
                onClick={() => setSelectedPlan('year')}
                className={`relative border-2 p-3 rounded-2xl flex flex-col justify-center cursor-pointer overflow-hidden transition-all active:scale-[0.99] ${
                selectedPlan === 'year' 
                    ? 'border-primary bg-primary/5 shadow-card' 
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
            >
                <div className="bg-primary text-white text-[9px] font-black px-2 py-0.5 absolute top-0 left-0 rounded-br-lg shadow-sm tracking-wider z-10">
                    BEST VALUE
                </div>

                <div className="flex justify-between items-center w-full mb-1">
                    <div className="pl-1 mt-1">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="block font-bold text-text-main text-base">Yearly Access</span>
                        </div>
                        <span className="text-[10px] text-text-sub line-through">$350/yr</span>
                    </div>
                    
                    <div className="text-right z-10">
                        <div className="text-lg font-bold text-text-main">$199.99<span className="text-xs text-text-sub font-medium">/yr</span></div>
                        <div className="text-[10px] text-primary font-black uppercase tracking-wide">Save Over $150/year</div>
                    </div>
                </div>

                <div className="w-full bg-white/50 rounded-lg py-1 px-2 border border-primary/10 mt-1">
                    <p className="text-[10px] text-center text-text-main font-semibold">
                        Avoid costly mistakes and boost your harvest.
                    </p>
                </div>

                <div className={`w-5 h-5 rounded-full border-2 absolute right-4 top-[35%] -translate-y-1/2 flex items-center justify-center ${selectedPlan === 'year' ? 'border-primary bg-primary text-white' : 'border-gray-200'}`}>
                    {selectedPlan === 'year' && <Check size={12} />}
                </div>
            </div>

            {/* Weekly */}
            <div 
                onClick={() => setSelectedPlan('week')}
                className={`relative border-2 p-3 rounded-2xl flex justify-between items-center cursor-pointer transition-all active:scale-[0.99] ${
                selectedPlan === 'week' ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
            >
                <div>
                <span className="block font-bold text-text-main text-sm">Weekly Access</span>
                </div>
                <div className="text-base font-bold text-text-main pr-8">$7.99<span className="text-[10px] text-text-sub font-medium">/wk</span></div>
                <div className={`w-5 h-5 rounded-full border-2 absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center ${selectedPlan === 'week' ? 'border-primary bg-primary text-white' : 'border-gray-200'}`}>
                    {selectedPlan === 'week' && <Check size={12} />}
                </div>
            </div>
            </div>
        </div>
        
        {/* Footer Actions */}
        <div className="px-6 pb-6 bg-white z-20 mt-auto">
            <div className="space-y-3">
                {/* Main CTA */}
                <div className="w-full relative group">
                    <div className="absolute -inset-0.5 bg-primary/30 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse motion-reduce:animate-none"></div>
                    <button 
                        onClick={handleStartTrial}
                        className="relative w-full bg-text-main text-white font-black text-lg py-3 rounded-2xl shadow-xl active:scale-[0.98] transition-transform overflow-hidden z-10 group"
                    >
                        <span className="relative flex items-center justify-center gap-2 tracking-wide">
                            Start Free Trial <ArrowRight size={20} />
                        </span>
                    </button>
                    <p className="text-center text-[10px] text-text-sub mt-2 font-medium">
                        Cancel anytime. No risk — 3-day free trial.
                    </p>
                </div>
                
                {(onSkip || !isMandatory) && (
                    <button 
                        onClick={onSkip || onClose}
                        className="w-full py-2 text-sm font-bold text-text-sub hover:text-text-main transition-colors"
                    >
                        Maybe Later
                    </button>
                )}
            </div>
        </div>

      </div>

      {/* AUTH MODAL OVERLAY */}
      {showAuthModal && (
         <div className="absolute inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 relative">
                 
                 <button 
                    onClick={() => setShowAuthModal(false)}
                    className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-text-sub hover:text-text-main transition-colors"
                 >
                    <X size={20} />
                 </button>

                 <div className="text-center mb-6 pt-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-3">
                       <Lock size={24} />
                    </div>
                    <h2 className="text-xl font-extrabold text-text-main leading-tight mb-2">
                       Secure Your Plan
                    </h2>
                    <p className="text-sm text-text-sub font-medium leading-relaxed max-w-xs mx-auto">
                       Sign in to save your personalized grow plan and activate your free trial.
                    </p>
                 </div>

                 <div className="space-y-3 mb-4">
                    <button 
                        onClick={handleAppleLogin}
                        className="w-full bg-black text-white font-bold text-lg py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
                    >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 384 512">
                            <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z"/>
                        </svg>
                        Continue with Apple
                    </button>

                    <button 
                        onClick={handleGoogleLogin}
                        className="w-full bg-white text-text-main border border-gray-200 font-bold text-lg py-3.5 rounded-2xl shadow-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-transform hover:bg-gray-50"
                    >
                        <img 
                           src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                           alt="Google" 
                           className="w-5 h-5" 
                        />
                        Continue with Google
                    </button>

                    <button 
                        onClick={handleEmailLogin}
                        className="w-full bg-white text-text-main border border-gray-200 font-bold text-lg py-3.5 rounded-2xl shadow-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-transform hover:bg-gray-50"
                    >
                        <Mail size={20} className="text-text-main" />
                        Continue with Email
                    </button>
                 </div>

                 <p className="text-center text-[10px] text-text-sub">
                    By continuing, you agree to our Terms and Privacy Policy.
                 </p>
             </div>
         </div>
      )}

    </div>
  );
};

export default Paywall;