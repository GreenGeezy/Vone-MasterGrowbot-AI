import React, { useState, useEffect } from 'react';
import { X, Check, ArrowRight, Infinity, Headphones, Sprout, ShieldCheck } from 'lucide-react';
import Growbot from '../components/Growbot';
import { Purchases, PACKAGE_TYPE, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

interface PaywallProps {
  onClose: () => void;
  onSkip?: () => void; 
  onPurchase: () => void;
  isMandatory?: boolean;
}

const Paywall: React.FC<PaywallProps> = ({ onClose, onSkip, onPurchase, isMandatory = false }) => {
  const [selectedPlan, setSelectedPlan] = useState<'week' | 'month' | 'year'>('month');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [offeringsLoaded, setOfferingsLoaded] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);

  useEffect(() => {
    const loadOfferings = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
           const offerings = await Purchases.getOfferings();
           // Load the 'Default' offering configured in RevenueCat
           if (offerings.current && offerings.current.availablePackages.length > 0) {
               setPackages(offerings.current.availablePackages);
           }
        }
      } catch (e) {
        console.error("Failed to load offerings", e);
      } finally {
        setOfferingsLoaded(true);
      }
    };
    loadOfferings();
  }, []);

  const handleStartTrial = async () => {
    setIsPurchasing(true);
    try {
        if (!Capacitor.isNativePlatform()) {
            await new Promise((r) => setTimeout(r, 1000));
            onPurchase();
            return;
        } 
        
        if (packages.length > 0) {
             let packageToBuy: PurchasesPackage | undefined;
             
             if (selectedPlan === 'month') {
                packageToBuy = packages.find(p => p.packageType === PACKAGE_TYPE.MONTHLY || p.identifier === 'Monthly');
             } else if (selectedPlan === 'year') {
                packageToBuy = packages.find(p => p.packageType === PACKAGE_TYPE.ANNUAL || p.identifier === 'Annual');
             } else if (selectedPlan === 'week') {
                packageToBuy = packages.find(p => p.packageType === PACKAGE_TYPE.WEEKLY || p.identifier === 'Weekly');
             }

             if (!packageToBuy) packageToBuy = packages[0];

             const { customerInfo } = await Purchases.purchasePackage({ aPackage: packageToBuy });
             
             // Check if 'pro' entitlement is active OR any active subscription exists
             if (customerInfo.entitlements.active['pro'] || customerInfo.activeSubscriptions.length > 0) {
                 onPurchase(); 
             }
        } else {
            alert("No products found. Ensure you attached Google Play products to your Default Offering in RevenueCat.");
        }
    } catch (error: any) {
        if (!error.userCancelled) {
            console.error("Purchase Error:", JSON.stringify(error));
            let msg = error.message;
            if (error.code === 23) msg = "Merchant Setup Incomplete. Check tax forms in Google Play Console.";
            alert(`Store Error: ${msg}`);
        }
    } finally {
        setIsPurchasing(false);
    }
  };

  if (!offeringsLoaded) {
      return <div className="fixed inset-0 bg-surface z-[60] flex items-center justify-center"><Growbot size="lg" mood="neutral" /></div>;
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden font-sans text-text-main bg-surface w-full max-w-[768px] mx-auto shadow-2xl border-x border-gray-100">
      <div className="absolute top-[-20%] right-[-20%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      {!isMandatory && (
        <button onClick={onClose} className="absolute top-4 right-4 bg-white p-2 rounded-full text-text-sub hover:text-text-main shadow-sm border border-gray-100 z-50 transition-colors">
          <X size={20} />
        </button>
      )}

      <div className="flex-shrink-0 flex flex-col items-center justify-center text-center px-6 pt-2 pb-1 z-10 mt-6">
        <div className="relative mb-0 animate-float scale-[0.6] origin-center -mt-2">
            <div className="absolute inset-0 bg-primary/20 blur-3xl opacity-30 animate-pulse"></div>
            <div className="relative"><Growbot size="lg" mood="happy" /></div>
        </div>
        <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm border border-gray-200 px-3 py-0.5 rounded-full mb-1 shadow-sm -mt-2">
           <ShieldCheck size={10} className="text-primary fill-current bg-white rounded-full" />
           <span className="text-[8px] font-bold uppercase tracking-wider text-text-sub">Trusted by Elite Growers Worldwide</span>
        </div>
        <h1 className="text-xl font-extrabold mb-1 tracking-tight leading-tight text-text-main">
        Upgrade to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-neon-blue">Pro</span>
        </h1>
      </div>

      <div className="flex-1 bg-white border-t border-gray-100 rounded-t-[1.5rem] relative shadow-[0_-10px_60px_rgba(0,0,0,0.05)] overflow-y-auto no-scrollbar flex flex-col">
        <div className="px-6 pt-5 pb-8 flex-1 flex flex-col">
            <div className="space-y-3 mb-4">
                <div onClick={() => setSelectedPlan('month')} className={`relative border-[3px] p-4 rounded-2xl flex flex-col justify-center cursor-pointer transition-all active:scale-[0.99] ${selectedPlan === 'month' ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-gray-100 bg-white'}`}>
                    <div className="flex justify-between items-center w-full">
                        <div>
                            <span className="block font-bold text-text-main text-lg">Monthly</span>
                            <span className="text-xs text-text-sub">Flexible billing.</span>
                        </div>
                        <div className="text-right pr-8">
                            <div className="text-xl font-black text-text-main">$29.99<span className="text-xs text-text-sub">/mo</span></div>
                        </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center ${selectedPlan === 'month' ? 'border-primary bg-primary text-white' : 'border-gray-200'}`}>{selectedPlan === 'month' && <Check size={12} />}</div>
                </div>

                <div onClick={() => setSelectedPlan('year')} className={`relative border-2 p-3 rounded-2xl flex flex-col justify-center cursor-pointer transition-all active:scale-[0.99] ${selectedPlan === 'year' ? 'border-primary bg-primary/5' : 'border-gray-100 bg-white'}`}>
                    <div className="bg-primary text-white text-[9px] font-black px-2 py-0.5 absolute top-0 left-0 rounded-br-lg z-10">BEST VALUE</div>
                    <div className="flex justify-between items-center w-full">
                        <div className="mt-1">
                            <span className="block font-bold text-text-main text-base">Yearly Access</span>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-bold text-text-main">$199.99<span className="text-xs text-text-sub">/yr</span></div>
                        </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 absolute right-4 top-[35%] -translate-y-1/2 flex items-center justify-center ${selectedPlan === 'year' ? 'border-primary bg-primary text-white' : 'border-gray-200'}`}>{selectedPlan === 'year' && <Check size={12} />}</div>
                </div>

                <div onClick={() => setSelectedPlan('week')} className={`relative border-2 p-3 rounded-2xl flex justify-between items-center cursor-pointer transition-all active:scale-[0.99] ${selectedPlan === 'week' ? 'border-primary bg-primary/5' : 'border-gray-100 bg-white'}`}>
                    <div><span className="block font-bold text-text-main text-sm">Weekly Access</span></div>
                    <div className="text-base font-bold text-text-main pr-8">$7.99<span className="text-[10px] text-text-sub">/wk</span></div>
                    <div className={`w-5 h-5 rounded-full border-2 absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center ${selectedPlan === 'week' ? 'border-primary bg-primary text-white' : 'border-gray-200'}`}>{selectedPlan === 'week' && <Check size={12} />}</div>
                </div>
            </div>
        </div>
        
        <div className="px-6 pb-6 bg-white z-20 mt-auto">
            <div className="space-y-3">
                <button onClick={handleStartTrial} disabled={isPurchasing} className="relative w-full bg-text-main text-white font-black text-lg py-3 rounded-2xl shadow-xl active:scale-[0.98] transition-transform group disabled:opacity-80">
                    {isPurchasing ? "Processing..." : <span className="flex items-center justify-center gap-2">Start Free Trial <ArrowRight size={20} /></span>}
                </button>
                <p className="text-center text-[10px] text-text-sub font-medium">Cancel anytime. 3-day free trial.</p>
                {(onSkip || !isMandatory) && (
                    <button onClick={onSkip || onClose} className="w-full py-2 text-sm font-bold text-text-sub hover:text-text-main transition-colors">Maybe Later</button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Paywall;
