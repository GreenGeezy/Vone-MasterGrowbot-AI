import React, { useState, useEffect } from 'react';
import {
  X, Check, Shield, Star, Zap, ArrowRight, Lock,
  LifeBuoy, Headphones, Dna, Clock, BookOpen
} from 'lucide-react';
import { Purchases, PurchasesPackage, PACKAGE_TYPE } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import Growbot from '../components/Growbot';

interface PaywallProps {
  onClose: () => void;
  onPurchase: () => void;
  onSkip: () => void;
}

const Paywall: React.FC<PaywallProps> = ({ onClose, onPurchase, onSkip }) => {
  const [selectedPkgIdentifier, setSelectedPkgIdentifier] = useState<string | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        if (!Capacitor.isNativePlatform()) {
          const mockPackages = [
            { identifier: 'mg_weekly', packageType: PACKAGE_TYPE.WEEKLY, product: { priceString: '$7.99', title: 'Weekly Access', description: 'Short term help' } } as any,
            { identifier: 'mg_monthly', packageType: PACKAGE_TYPE.MONTHLY, product: { priceString: '$29.99', title: 'Monthly Pro', description: 'Ongoing optimization' } } as any,
            { identifier: 'mg_annual', packageType: PACKAGE_TYPE.ANNUAL, product: { priceString: '$199.99', title: 'Annual Saver', description: 'Best value year round' } } as any,
          ];
          setPackages(mockPackages);
          setSelectedPkgIdentifier('mg_monthly');
          setLoading(false);
          return;
        }

        try {
          const offerings = await Purchases.getOfferings();
          if (offerings.current && offerings.current.availablePackages.length > 0) {
            setPackages(offerings.current.availablePackages);
            const monthly = offerings.current.availablePackages.find(p => p.packageType === PACKAGE_TYPE.MONTHLY);
            setSelectedPkgIdentifier(monthly ? monthly.identifier : offerings.current.availablePackages[0].identifier);
          }
        } catch (e: any) {
          console.error("RevenueCat Error:", e);
          setError("Could not load offers. Please check your connection.");
        }
      } catch (err) {
        setError("Failed to initialize store connection.");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const handleStartTrial = async () => {
    if (!selectedPkgIdentifier) return;
    setIsPurchasing(true);
    setError(null);

    try {
      if (!Capacitor.isNativePlatform()) {
        setTimeout(() => { setIsPurchasing(false); onPurchase(); }, 1500);
        return;
      }

      const pkg = packages.find(p => p.identifier === selectedPkgIdentifier);
      if (pkg) {
        const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
        // Corrected Entity ID: 'pro' based on user screenshots
        if (customerInfo.entitlements.active['pro']) {
          onPurchase();
        } else {
          // Fallback: If 'pro' is missing
          console.warn("Purchase success but 'pro' entitlement invalid.");
          onPurchase();
        }
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        console.error("Purchase Error:", e);
        setError(e.message || "Purchase failed. Please try again.");
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsPurchasing(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const { customerInfo } = await Purchases.restorePurchases();
        if (customerInfo.entitlements.active['pro']) {
          alert("Success! Your subscription has been restored.");
          onPurchase();
        } else {
          alert("No active subscription found to restore.");
        }
      } else {
        alert("Restore not available in web mode.");
      }
    } catch (e) {
      alert("Failed to restore purchases. Please try again.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const openLink = async (url: string) => {
    try { await Browser.open({ url }); } catch (e) { window.open(url, '_blank'); }
  };

  const selectedPkg = packages.find(p => p.identifier === selectedPkgIdentifier);

  const getTrialText = () => {
    if (!selectedPkg) return "Select a plan";
    const price = selectedPkg.product.priceString;
    let period = "month";
    if (selectedPkg.packageType === PACKAGE_TYPE.WEEKLY) period = "week";
    if (selectedPkg.packageType === PACKAGE_TYPE.ANNUAL) period = "year";
    return `After free trial, auto-bills ${price}/${period}`;
  };

  if (loading) return (<div className="fixed inset-0 bg-white z-[60] flex items-center justify-center"><Growbot size="lg" mood="thinking" className="animate-bounce" /></div>);

  return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col overflow-hidden">
      <div className="relative h-64 bg-green-900 flex-shrink-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1596791836043-982c75908b89?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80')] bg-cover bg-center opacity-40"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white"></div>

        {/* HARD PAYWALL ENFORCED: Close button hidden to require subscription */}
        <div className="absolute bottom-4 left-6 right-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-black/80 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1 backdrop-blur-md"><Shield size={10} className="text-green-400" /> Trusted by Elite Growers Worldwide</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 leading-tight">Rescue Your Grow Instantly with AI Power</h1>
          <p className="text-sm font-medium text-gray-600 mt-1">Snap a pic for pest detection, customized grow tips,  guides to grow premium quality plants, and boost your yields without the guesswork.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-64 pt-2">
        <div className="space-y-5 mb-8">
          <div className="flex gap-4 items-start">
            <div className="p-3 bg-red-50 text-red-500 rounded-2xl flex-shrink-0"><LifeBuoy size={24} /></div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Unlimited AI Diagnosis</h3>
              <p className="text-xs text-gray-500 leading-relaxed mt-0.5">Stop guessing—identify pests, diseases, and deficiencies instantly to prevent crop loss.</p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-2xl flex-shrink-0"><Zap size={24} /></div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Personalized Grow Plan</h3>
              <p className="text-xs text-gray-500 leading-relaxed mt-0.5">Tailored tasks to your setup—avoid mistakes and maximize your harvest potential.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="p-3 bg-purple-50 text-purple-500 rounded-2xl flex-shrink-0"><Dna size={24} /></div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Searchable Strain Database</h3>
              <p className="text-xs text-gray-500 leading-relaxed mt-0.5">Over 100 profiles to grow award-winning buds.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="p-3 bg-green-50 text-green-500 rounded-2xl flex-shrink-0"><Dna size={24} /></div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Unlock AI Strain Intelligence™</h3>
              <p className="text-xs text-gray-500 leading-relaxed mt-0.5">Get instant, genetic-specific grow guides and yield-maximizing secrets for over 100+ cannabis strains.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl flex-shrink-0"><BookOpen size={24} /></div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Professional Grow Journal</h3>
              <p className="text-xs text-gray-500 leading-relaxed mt-0.5">Track nutrients, environment, and visual history to replicate your best harvests.</p>
            </div>
          </div>
        </div>

        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 text-center">Select Your Plan</h2>
        <div className="grid grid-cols-1 gap-4">
          {packages.map((pkg) => {
            const isSelected = selectedPkgIdentifier === pkg.identifier;
            const isMonthly = pkg.packageType === PACKAGE_TYPE.MONTHLY;
            const isAnnual = pkg.packageType === PACKAGE_TYPE.ANNUAL;
            return (
              <div key={pkg.identifier} onClick={() => setSelectedPkgIdentifier(pkg.identifier)} className={`relative rounded-2xl border-2 p-4 transition-all active:scale-[0.98] ${isSelected ? 'border-green-500 bg-green-50/50' : 'border-gray-100 bg-white'}`}>
                {isMonthly && <div className="absolute -top-3 left-4 bg-green-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1 shadow-md"><Star size={10} fill="currentColor" /> Most Popular</div>}
                {isAnnual && <div className="absolute -top-3 left-4 bg-black text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-md">Best Value</div>}
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className={`font-black text-base ${isSelected ? 'text-green-800' : 'text-gray-800'}`}>{pkg.product.title}</h3>
                    <p className="text-xs text-gray-500 font-medium mt-1">{isMonthly ? "Flexible. Cancel anytime." : isAnnual ? "Save 45% vs Monthly" : "Short-term access"}</p>
                  </div>
                  <div className="text-right">
                    <span className={`block font-black text-xl ${isSelected ? 'text-green-700' : 'text-gray-900'}`}>{pkg.product.priceString}</span>
                    <div className={`w-5 h-5 rounded-full border-2 ml-auto mt-2 flex items-center justify-center ${isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>{isSelected && <Check size={12} className="text-white" />}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-6 pb-8 z-50 rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-center gap-2 mb-4 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
          <span className="flex items-center gap-1 text-green-600"><Clock size={12} /> Days 1-3: Free</span>
          <ArrowRight size={12} className="text-gray-300" />
          <span className="flex items-center gap-1"><Lock size={12} /> Day 4+: Auto-Bill</span>
          <ArrowRight size={12} className="text-gray-300" />
          <span className="flex items-center gap-1 text-gray-900"><X size={12} /> Cancel Anytime</span>
        </div>
        <button onClick={handleStartTrial} disabled={isPurchasing || !selectedPkgIdentifier} className="w-full bg-green-600 text-white font-black text-lg py-4 rounded-2xl shadow-xl shadow-green-200 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none">
          {isPurchasing ? <span className="animate-pulse">Processing...</span> : <>Start Your Free 3-Day Trial Now <ArrowRight strokeWidth={3} size={20} /></>}
        </button>
        <div className="text-center mt-4 space-y-3">
          {selectedPkg && <div className="bg-gray-50 rounded-lg p-2 inline-block"><p className="text-[10px] text-gray-600 font-bold leading-tight">{getTrialText()} unless canceled.</p></div>}
          <p className="text-[9px] text-gray-400 font-medium leading-relaxed max-w-xs mx-auto">Recurring billing. Cancel anytime in your settings. Family Sharing enabled. By continuing, you agree to our Terms.</p>
          <div className="flex justify-center gap-4 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            <button onClick={() => openLink('https://mastergrowbot.com/terms-of-service')} className="hover:text-green-600">Terms</button>
            <span className="text-gray-300">•</span>
            <button onClick={() => openLink('https://mastergrowbot.com/privacy-policy')} className="hover:text-green-600">Privacy</button>
            <span className="text-gray-300">•</span>
            <button onClick={handleRestore} className="hover:text-green-600">Restore</button>
          </div>
        </div>
      </div>
      {error && <div className="absolute top-6 left-6 right-6 bg-red-500 text-white p-3 rounded-xl text-center text-xs font-bold shadow-2xl animate-in slide-in-from-top-2 z-[70]">{error}</div>}
    </div>
  );
};

export default Paywall;
