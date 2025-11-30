
import React, { useState } from 'react';
import { X, Zap, Crown, ShieldCheck, Infinity, Sprout, Check, Star, Headphones, ArrowRight } from 'lucide-react';
import Growbot from '../components/Growbot';
import { UserProfile } from '../types';

interface PaywallProps {
  onClose: () => void; // Triggered on "Start Free Trial"
  onSkip?: () => void; // Triggered on "Maybe Later"
  isMandatory?: boolean;
  userProfile?: UserProfile | null;
}

const Paywall: React.FC<PaywallProps> = ({ onClose, onSkip, isMandatory = false, userProfile }) => {
  const [selectedPlan, setSelectedPlan] = useState<'week' | 'month' | 'year'>('year');

  const benefits = [
    { icon: Infinity, text: "Unlimited AI Scans & Diagnoses", sub: "Never miss an issue" },
    { icon: Headphones, text: "Personalized Grow Coaching", sub: "24/7 Expert access" },
    { icon: Star, text: "Priority Support", sub: "Skip the line" },
    { icon: Sprout, text: "Daily Grow Tips", sub: "Stage-specific advice" },
    { icon: Crown, text: "Unlock All Features", sub: "Full app access" },
  ];

  return (
    <div className="fixed inset-0 bg-surface z-[60] flex flex-col overflow-hidden font-sans text-text-main">
      {/* Background Effects */}
      <div className="absolute top-[-20%] right-[-20%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      {/* Close Button (Only if not mandatory or if secondary skip exists, but usually hidden on mandatory to force interaction) */}
      {!isMandatory && (
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 bg-white p-2 rounded-full text-text-sub hover:text-text-main shadow-sm border border-gray-100 z-50 transition-colors"
        >
          <X size={24} />
        </button>
      )}

      {/* Header Section */}
      <div className="flex-shrink-0 flex flex-col items-center justify-center text-center px-6 pt-8 pb-4 z-10">
        <div className="relative mb-2 animate-float">
            <div className="absolute inset-0 bg-primary/20 blur-3xl opacity-30 animate-pulse"></div>
            <div className="relative">
              <Growbot size="lg" mood="happy" />
            </div>
        </div>

        <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm border border-gray-200 px-3 py-1 rounded-full mb-3 shadow-sm">
           <ShieldCheck size={14} className="text-primary fill-current bg-white rounded-full" />
           <span className="text-[10px] font-bold uppercase tracking-wider text-text-sub">Trusted by Elite Growers Worldwide</span>
        </div>
        
        <h1 className="text-2xl md:text-3xl font-extrabold mb-1 tracking-tight leading-tight text-text-main">
          Upgrade to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-neon-blue">MasterGrowbot Pro</span>
        </h1>
        <p className="text-primary font-bold text-sm uppercase tracking-widest">
           3-Day Free Trial Available
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 bg-white border-t border-gray-100 rounded-t-[2.5rem] px-6 pt-6 pb-8 relative shadow-[0_-10px_60px_rgba(0,0,0,0.05)] overflow-y-auto no-scrollbar">
        
        {/* Benefits Grid */}
        <div className="mb-6">
           <div className="grid grid-cols-1 gap-3">
             {benefits.map((benefit, idx) => (
               <div key={idx} className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <benefit.icon size={16} />
                 </div>
                 <div>
                    <span className="block text-sm font-bold text-text-main leading-none">{benefit.text}</span>
                    <span className="text-[10px] text-text-sub">{benefit.sub}</span>
                 </div>
               </div>
             ))}
           </div>
        </div>

        {/* Pricing Options */}
        <div className="space-y-3 mb-6">
          {/* Yearly */}
          <div 
            onClick={() => setSelectedPlan('year')}
            className={`relative border-2 p-4 rounded-2xl flex justify-between items-center cursor-pointer overflow-hidden transition-all active:scale-[0.99] ${
              selectedPlan === 'year' ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-100 bg-white hover:border-gray-200'
            }`}
          >
            {selectedPlan === 'year' && (
               <div className="bg-primary text-white text-[9px] font-black px-2 py-0.5 absolute top-0 left-0 rounded-br-lg shadow-sm tracking-wider z-10">
                BEST VALUE
               </div>
            )}
            <div className="pl-1 mt-1">
              <span className="block font-bold text-text-main text-base">Yearly Access</span>
              <span className="text-[10px] text-text-sub line-through">$299.99/yr</span>
            </div>
            <div className="text-right z-10">
              <div className="text-lg font-bold text-text-main">$199.99<span className="text-xs text-text-sub font-medium">/yr</span></div>
              <div className="text-[10px] text-primary font-bold">Save 33%</div>
            </div>
            {selectedPlan === 'year' && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary opacity-10"><Crown size={40} /></div>}
            <div className={`w-5 h-5 rounded-full border-2 absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center ${selectedPlan === 'year' ? 'border-primary bg-primary text-white' : 'border-gray-200'}`}>
                {selectedPlan === 'year' && <Check size={12} />}
            </div>
          </div>

          {/* Monthly */}
          <div 
             onClick={() => setSelectedPlan('month')}
             className={`relative border-2 p-4 rounded-2xl flex justify-between items-center cursor-pointer transition-all active:scale-[0.99] ${
              selectedPlan === 'month' ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-100 bg-white hover:border-gray-200'
            }`}
          >
            <div>
              <span className="block font-bold text-text-main text-sm">Monthly Access</span>
            </div>
            <div className="text-base font-bold text-text-main pr-8">$29.99<span className="text-xs text-text-sub font-medium">/mo</span></div>
            <div className={`w-5 h-5 rounded-full border-2 absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center ${selectedPlan === 'month' ? 'border-primary bg-primary text-white' : 'border-gray-200'}`}>
                {selectedPlan === 'month' && <Check size={12} />}
            </div>
          </div>

          {/* Weekly */}
          <div 
             onClick={() => setSelectedPlan('week')}
             className={`relative border-2 p-4 rounded-2xl flex justify-between items-center cursor-pointer transition-all active:scale-[0.99] ${
              selectedPlan === 'week' ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-100 bg-white hover:border-gray-200'
            }`}
          >
            <div>
              <span className="block font-bold text-text-main text-sm">Weekly Access</span>
            </div>
            <div className="text-base font-bold text-text-main pr-8">$7.99<span className="text-xs text-text-sub font-medium">/wk</span></div>
             <div className={`w-5 h-5 rounded-full border-2 absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center ${selectedPlan === 'week' ? 'border-primary bg-primary text-white' : 'border-gray-200'}`}>
                {selectedPlan === 'week' && <Check size={12} />}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
            <button 
                onClick={onClose}
                className="relative w-full bg-text-main text-white font-black text-lg py-4 rounded-2xl shadow-xl active:scale-[0.98] transition-transform overflow-hidden group"
            >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span className="relative flex items-center justify-center gap-2 tracking-wide">
                    Start Free Trial <ArrowRight size={20} />
                </span>
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
        
        <p className="text-center text-[10px] text-gray-400 mt-6 font-medium leading-relaxed px-2">
          Recurring billing. Cancel anytime. <br/>
          Subscription automatically renews unless auto-renew is turned off at least 24-hours before the end of the current period. Your account will be charged for renewal within 24-hours prior to the end of the current period.
        </p>
      </div>
    </div>
  );
};

export default Paywall;