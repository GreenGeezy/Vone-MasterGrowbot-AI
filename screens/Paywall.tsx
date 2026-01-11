import React, { useState } from 'react';
import { X, Check, Infinity, Headphones, Sprout } from 'lucide-react';
import Growbot from '../components/Growbot';
import { Purchases, PACKAGE_TYPE } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

interface PaywallProps {
  onClose: () => void;
  onPurchase: () => void;
  onAuthRedirect: () => void;
}

const Paywall: React.FC<PaywallProps> = ({ onClose, onPurchase, onAuthRedirect }) => {
  const [selectedPlan, setSelectedPlan] = useState<'month' | 'year'>('month');
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handleStartTrial = async () => {
    setIsPurchasing(true);
    try {
        if (!Capacitor.isNativePlatform()) {
            setTimeout(() => onPurchase(), 1000); 
            return;
        }

        const offerings = await Purchases.getOfferings();
        if (offerings.current && offerings.current.availablePackages.length > 0) {
             let packageToBuy = offerings.current.availablePackages[0];
             if (selectedPlan === 'year') {
                const annual = offerings.current.availablePackages.find(p => p.packageType === PACKAGE_TYPE.ANNUAL);
                if (annual) packageToBuy = annual;
             }
             
             await Purchases.purchasePackage({ aPackage: packageToBuy });
             onPurchase();
        } else {
            alert("No offerings found. Ensure you are testing on a licensed device/account.");
        }
    } catch (error: any) {
        if (!error.userCancelled) {
            console.error(error);
            alert("Purchase failed. Please try again.");
        }
    } finally {
        setIsPurchasing(false);
    }
  };

  const benefits = [
    { icon: Infinity, text: "Perfect Plant Health", sub: "Unlimited AI scans." },
    { icon: Headphones, text: "24/7 Grow Coach", sub: "Expert help anytime." },
    { icon: Sprout, text: "Advanced Journaling", sub: "Track every detail." },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-surface font-sans text-text-main shadow-2xl">
      <button onClick={onClose} className="absolute top-4 right-4 bg-white p-2 rounded-full shadow z-50">
          <X size={20} />
      </button>

      <div className="flex flex-col items-center justify-center pt-8 pb-4 bg-surface">
        <Growbot size="lg" mood="happy" />
        <h1 className="text-2xl font-black mt-4">Upgrade to <span className="text-primary">Pro</span></h1>
      </div>

      <div className="flex-1 bg-white rounded-t-[2rem] p-6 shadow-top flex flex-col">
        <div className="space-y-4 mb-6">
            {benefits.map((b, i) => (
                <div key={i} className="flex gap-3 items-center">
                    <div className="bg-primary/10 p-2 rounded-xl text-primary"><b.icon size={20}/></div>
                    <div><div className="font-bold">{b.text}</div><div className="text-xs text-text-sub">{b.sub}</div></div>
                </div>
            ))}
        </div>

        <div className="space-y-3 mb-auto">
            <div onClick={() => setSelectedPlan('year')} className={`p-4 border-2 rounded-2xl flex justify-between items-center cursor-pointer ${selectedPlan === 'year' ? 'border-primary bg-primary/5' : 'border-gray-100'}`}>
                <div><span className="font-bold">Yearly</span> <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full ml-2">Best Value</span></div>
                <div className="font-bold">$199.99/yr</div>
            </div>
            <div onClick={() => setSelectedPlan('month')} className={`p-4 border-2 rounded-2xl flex justify-between items-center cursor-pointer ${selectedPlan === 'month' ? 'border-primary bg-primary/5' : 'border-gray-100'}`}>
                <span className="font-bold">Monthly</span>
                <div className="font-bold">$19.99/mo</div>
            </div>
        </div>

        <button onClick={handleStartTrial} disabled={isPurchasing} className="w-full bg-text-main text-white py-4 rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform mt-4">
            {isPurchasing ? "Processing..." : "Start Free Trial"}
        </button>
        
        <p className="text-center text-xs text-text-sub mt-4 cursor-pointer" onClick={onAuthRedirect}>
            Already have an account? <span className="text-primary font-bold">Log In</span>
        </p>
      </div>
    </div>
  );
};

export default Paywall;
