import React, { useState } from 'react';
import { X, Zap, Crown, ShieldCheck, Infinity, Sprout, Check, Search, Headphones, ArrowRight } from 'lucide-react';
import Growbot from '../components/Growbot';
import { UserProfile } from '../types';

interface PaywallProps {
  onClose: () => void; // Triggered on "Start Free Trial"
  onSkip?: () => void; // Triggered on "Maybe Later"
  isMandatory?: boolean;
  userProfile?: UserProfile | null;
}

const Paywall: React.FC<PaywallProps> = ({ onClose, onSkip, isMandatory = false, userProfile }) => {
  const [selectedPlan, setSelectedPlan] = useState<'week' | 'month' | 'year'>('month');

  const benefits = [
    { icon: Infinity, text: "Perfect Plant Health", sub: "Unlimited AI scans & fast diagnoses." },
    { icon: Headphones, text: "24/7 Grow Coach", sub: "On-demand help and strain-specific tips." },
    { icon: Sprout, text: "Data-Driven Decisions", sub: "Strain database, grow logs, and alerts." },
  ];

  return (
    <div className="fixed inset-0 bg-surface z-[60] flex flex-col overflow-hidden font-sans text-text-main">
      {/* Background Effects */}
      <div className="absolute top-[-20%] right-[-20%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      {/* Close Button */}
      {!isMandatory && (
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 bg-white p-2 rounded-full text-text-sub hover:text-text-main shadow-sm border border-gray-100 z-50 transition-colors"
        >
          <X size={20} />
        </button>
      )}

      {/* Header Section - COMPACTED (~40% height reduction via scaling and margins) */}
      <div className="flex-shrink-0 flex flex-col items-center justify-center text-center px-6 pt-2 pb-1 z-10">
        <div className="relative mb-0 animate-float scale-[0.55] origin-center -mt-2">
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
        
        {/* Benefit-Focused Subheadline */}
        <p className="text-text-sub text-xs font-medium leading-relaxed px-4 mb-3 max-w-xs mx-auto">
          Grow healthier, bigger plants with your personal AI grow coach. Zero guesswork. Zero stress.
        </p>

        {/* 1. Primary CTA Above Pricing */}
        <div className="w-full mb-1 relative group">
             {/* 5. Subtle Pulse/Glow Animation (Respects Reduced Motion) */}
             <div className="absolute -inset-0.5 bg-primary/30 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse motion-reduce:animate-none"></div>
             
             <button 
                onClick={onClose}
                className="relative w-full bg-text-main text-white font-black text-lg py-3 rounded-2xl shadow-xl active:scale-[0.98] transition-transform overflow-hidden z-10 group"
            >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span className="relative flex items-center justify-center gap-2 tracking-wide">
                    Start Free Trial <ArrowRight size={20} />
                </span>
            </button>
            
            {/* 2. Risk-Free Reassurance Line */}
            <p className="text-center text-xs text-text-sub mt-2 font-medium">
                Cancel anytime. No risk — 3-day free trial.
            </p>
        </div>
      </div>

      {/* Scrollable Content Wrapper */}
      <div className="flex-1 bg-white border-t border-gray-100 rounded-t-[1.5rem] relative shadow-[0_-10px_60px_rgba(0,0,0,0.05)] overflow-y-auto no-scrollbar flex flex-col">
        
        <div className="px-6 pt-5 pb-8">
            {/* 3 Grouped Benefits */}
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
              
              {/* Monthly (Now Highlighted/Dominant) */}
              <div 
                 onClick={() => setSelectedPlan('month')}
                 className={`relative border-[3px] p-4 rounded-2xl flex flex-col justify-center cursor-pointer overflow-hidden transition-all active:scale-[0.99] ${
                  selectedPlan === 'month' 
                    ? 'border-primary bg-primary/5 shadow-card scale-[1.02]' 
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                {selectedPlan === 'month' && (
                   <div className="bg-primary text-white text-[9px] font-black px-2 py-0.5 absolute top-0 left-0 rounded-br-lg shadow-sm tracking-wider z-10">
                    BEST VALUE
                   </div>
                )}
                
                <div className="flex justify-between items-center w-full">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="block font-bold text-text-main text-lg">Monthly Access</span>
                        {/* Most Popular Badge (Moved here) */}
                        <span className="bg-orange-100 text-orange-600 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide border border-orange-200">
                            Most Popular
                        </span>
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
                <div className="flex justify-between items-center w-full mb-1">
                    <div className="pl-1 mt-1">
                        <div className="flex items-center gap-2 mb-0.5">
                             <span className="block font-bold text-text-main text-base">Yearly Access</span>
                        </div>
                        {/* Updated crossed-out price to $350 */}
                        <span className="text-[10px] text-text-sub line-through">$350/yr</span>
                    </div>
                    
                    <div className="text-right z-10">
                        <div className="text-lg font-bold text-text-main">$199.99<span className="text-xs text-text-sub font-medium">/yr</span></div>
                        <div className="text-[10px] text-primary font-black uppercase tracking-wide">Save Over $150/year</div>
                    </div>
                </div>

                {/* Apple-safe value calculation line (Kept visible) */}
                <div className="w-full bg-white/50 rounded-lg py-1 px-2 border border-primary/10 mt-1">
                     <p className="text-[10px] text-center text-text-main font-semibold">
                        Avoid costly mistakes and boost your harvest.
                     </p>
                </div>

                {/* Selection Check */}
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

        {/* Secondary Buttons */}
        <div className="px-6 pb-6 bg-white z-20 mt-auto">
            <div className="space-y-3">
                <button 
                    onClick={onClose}
                    className="w-full bg-primary/10 text-primary font-bold text-lg py-3 rounded-2xl shadow-none active:scale-[0.98] transition-transform border border-primary/20"
                >
                    Start Free Trial
                </button>
                
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
    </div>
  );
};

export default Paywall;