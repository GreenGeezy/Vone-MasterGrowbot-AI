import React, { useState, useEffect } from 'react';
import { X, Check, ArrowRight, Infinity, Headphones, Sprout, ShieldCheck } from 'lucide-react';
import Growbot from '../components/Growbot';
import { UserProfile } from '../types';
import { supabase } from '../services/supabaseClient';
import { Purchases, PACKAGE_TYPE } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

interface PaywallProps {
  onClose: () => void;
  onAuthRedirect?: () => void;
  onSkip?: () => void; 
  onPurchase?: () => void;
  isMandatory?: boolean;
  userProfile?: UserProfile | null;
}

const syncRevenueCatUserID = async (userId: string) => {
  if (Capacitor.isNativePlatform()) {
     try {
        await Purchases.logIn({ appUserID: userId });
     } catch (e) {
        console.error("RC Sync Error:", e);
     }
  }
};

const Paywall: React.FC<PaywallProps> = ({ onClose, onAuthRedirect, onSkip, onPurchase, isMandatory = false }) => {
  const [selectedPlan, setSelectedPlan] = useState<'week' | 'month' | 'year'>('month');
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    if (!supabase) { setIsLoading(false); return; }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });
  }, []);

  const handleStartTrial = async () => {
    setIsPurchasing(true);
    try {
        if (!Capacitor.isNativePlatform()) {
            // Web Mock
            await new Promise<void>((resolve) => setTimeout(resolve, 1000));
            if (onPurchase) onPurchase();
            else onClose();
            return;
        } 

        // Real Purchase
        const offerings = await Purchases.getOfferings();
        if (offerings.current && offerings.current.availablePackages.length > 0) {
             let packageToBuy = offerings.current.availablePackages[0];
             
             if (selectedPlan === 'month') {
                const monthly = offerings.current.availablePackages.find(p => p.packageType === PACKAGE_TYPE.MONTHLY);
                if (monthly) packageToBuy = monthly;
             } else if (selectedPlan === 'year') {
                const annual = offerings.current.availablePackages.find(p => p.packageType === PACKAGE_TYPE.ANNUAL);
                if (annual) packageToBuy = annual;
             } else if (selectedPlan === 'week') {
                  const weekly = offerings.current.availablePackages.find(p => p.packageType === PACKAGE_TYPE.WEEKLY);
                  if (weekly) packageToBuy = weekly;
             }

             await Purchases.purchasePackage({ aPackage: packageToBuy });
             
             // Success Flow
             if (session) await syncRevenueCatUserID(session.user.id);
             
             if (onPurchase) onPurchase(); // Notify App to unlock
             else if (onAuthRedirect && !session) onAuthRedirect(); // Go to Auth if not logged in
             else onClose();

        } else {
            throw new Error("No offerings found in RevenueCat. Check Google Play Console.");
        }
    } catch (error: any) {
        if (!error.userCancelled) {
            // Show specific error to help debugging
            alert(`Purchase failed: ${error.message}`);
        }
    } finally {
        setIsPurchasing(false);
    }
  };

  const benefits = [
    { icon: Infinity, text: "Perfect Plant Health", sub: "Unlimited AI scans & fast diagnoses." },
    { icon: Headphones, text: "24/7 Grow Coach", sub: "On-demand help and strain-specific tips." },
    { icon: Sprout, text: "Data-Driven Decisions", sub: "Strain database, grow logs, and alerts." },
  ];

  if (isLoading) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden font-sans text-text-main bg-surface w-full max-w-[768px] mx-auto shadow-2xl border-x border-gray-100">
      <div className="absolute top-[-20%] right-[-20%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      {!isMandatory && (
        <button onClick={onClose} className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-sm border border-gray-100 z-50">
          <X size={20} className="text-text-sub" />
        </button>
      )}

      <div className="flex-shrink-0 flex flex-col items-center justify-center text-center px-6 pt-2 pb-1 z-10 mt-6">
        <div className="relative mb-0 animate-float scale-[0.6] origin-center -mt-2">
            <div className="absolute inset-0 bg-primary/20 blur-3xl opacity-30 animate-pulse"></div>
            <Growbot size="lg" mood="happy" />
        </div>
        
        <h1 className="text-xl font-extrabold mb-1 text-text-main">
        Upgrade to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-neon-blue">Pro</span>
        </h1>
        <p className="text-text-sub text-xs font-medium px-4 mb-3 max-w-xs mx-auto">
        Grow healthier, bigger plants with your personal AI grow coach.
        </p>
      </div>

      <div className="flex-1 bg-white border-t border-gray-100 rounded-t-[1.5rem] relative shadow-top overflow-y-auto no-scrollbar flex flex-col">
        <div className="px-6 pt-5 pb-8 flex-1 flex flex-col">
            <div className="mb-5 space-y-3">
                {benefits.map((b, idx) => (
                <div key={idx} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><b.icon size={16} /></div>
                    <div><div className="font-bold text-sm">{b.text}</div><div className="text-xs text-text-sub">{b.sub}</div></div>
                </div>
                ))}
            </div>

            <div className="space-y-3 mb-4">
                {/* Monthly */}
                <div onClick={() => setSelectedPlan('month')} className={`relative border-[3px] p-4 rounded-2xl flex flex-col cursor-pointer transition-all ${selectedPlan === 'month' ? 'border-primary bg-primary/5' : 'border-gray-100'}`}>
                    <div className="flex justify-between w-full">
                        <div><span className="block font-bold text-lg">Monthly Access</span><span className="text-xs text-text-sub">Flexible billing.</span></div>
                        <div className="text-right"><div className="text-xl font-black">$29.99<span className="text-xs text-text-sub">/mo</span></div></div>
                    </div>
                    {selectedPlan === 'month' && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary"><Check size={20} /></div>}
                </div>

                {/* Yearly */}
                <div onClick={() => setSelectedPlan('year')} className={`relative border-2 p-3 rounded-2xl flex flex-col cursor-pointer transition-all ${selectedPlan === 'year' ? 'border-primary bg-primary/5' : 'border-gray-100'}`}>
                    <div className="bg-primary text-white text-[9px] font-black px-2 py-0.5 absolute top-0 left-0 rounded-br-lg">BEST VALUE</div>
                    <div className="flex justify-between w-full mt-2">
                        <div><span className="block font-bold text-base">Yearly Access</span><span className="text-[10px] text-text-sub line-through">$350/yr</span></div>
                        <div className="text-right"><div className="text-lg font-bold">$199.99<span className="text-xs text-text-sub">/yr</span></div></div>
                    </div>
                    {selectedPlan === 'year' && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary"><Check size={20} /></div>}
                </div>

                {/* Weekly */}
                <div onClick={() => setSelectedPlan('week')} className={`relative border-2 p-3 rounded-2xl flex justify-between items-center cursor-pointer transition-all ${selectedPlan === 'week' ? 'border-primary bg-primary/5' : 'border-gray-100'}`}>
                    <span className="font-bold text-sm">Weekly Access</span>
                    <div className="text-base font-bold">$7.99<span className="text-[10px] text-text-sub">/wk</span></div>
                    {selectedPlan === 'week' && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary"><Check size={20} /></div>}
                </div>
            </div>
        </div>
        
        <div className="px-6 pb-6 bg-white z-20 mt-auto">
            <button onClick={handleStartTrial} disabled={isPurchasing} className="w-full bg-text-main text-white font-black text-lg py-3 rounded-2xl shadow-xl active:scale-[0.98] transition-transform">
                {isPurchasing ? "Processing..." : <span className="flex items-center justify-center gap-2">Start Free Trial <ArrowRight size={20}/></span>}
            </button>
            {(onSkip || !isMandatory) && <button onClick={onSkip || onClose} className="w-full py-2 text-sm font-bold text-text-sub mt-2">Maybe Later</button>}
        </div>
      </div>
    </div>
  );
};

export default Paywall;
