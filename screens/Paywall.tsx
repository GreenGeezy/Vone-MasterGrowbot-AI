import React, { useState, useEffect } from 'react';
import { X, Check, Shield, Star, Zap, ArrowRight, Lock } from 'lucide-react';
import { Purchases, PurchasesPackage, PACKAGE_TYPE } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
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

  // Load Products (Robust: Tries Offerings -> Fallback to Products)
  useEffect(() => {
    const loadProducts = async () => {
      try {
        if (!Capacitor.isNativePlatform()) {
          // Web Mock for Testing
          setPackages([
            { identifier: 'mg_weekly', packageType: PACKAGE_TYPE.WEEKLY, product: { priceString: '$7.99', title: 'Weekly' } } as any,
            { identifier: 'mg_499_1m', packageType: PACKAGE_TYPE.MONTHLY, product: { priceString: '$29.99', title: 'Monthly' } } as any,
            { identifier: 'mg_2999_1y', packageType: PACKAGE_TYPE.ANNUAL, product: { priceString: '$199.99', title: 'Yearly' } } as any,
          ]);
          setSelectedPkgIdentifier('mg_499_1m');
          setLoading(false);
          return;
        }

        // 1. Try fetching configured Offerings
        const offerings = await Purchases.getOfferings();
        if (offerings.current && offerings.current.availablePackages.length > 0) {
          setPackages(offerings.current.availablePackages);
          const monthly = offerings.current.availablePackages.find(p => p.packageType === PACKAGE_TYPE.MONTHLY);
          if (monthly) setSelectedPkgIdentifier(monthly.identifier);
        } else {
          // 2. Fallback: Fetch specific products if offerings fail
          console.warn("No offerings found, attempting direct product fetch...");
          const products = await Purchases.getProducts(['mg_499_1m', 'mg_2999_1y', 'mg_weekly']); // Add your weekly ID here if different
          // Manually wrap them as packages for consistency
          const fallbackPackages = products.map(p => ({
            identifier: p.identifier,
            packageType: p.identifier.includes('1m') ? PACKAGE_TYPE.MONTHLY : p.identifier.includes('1y') ? PACKAGE_TYPE.ANNUAL : PACKAGE_TYPE.WEEKLY,
            product: p,
            offeringIdentifier: 'default'
          } as PurchasesPackage));
          
          if (fallbackPackages.length > 0) {
            setPackages(fallbackPackages);
            const monthly = fallbackPackages.find(p => p.packageType === PACKAGE_TYPE.MONTHLY);
            if (monthly) setSelectedPkgIdentifier(monthly.identifier);
          } else {
            throw new Error("No products available.");
          }
        }
      } catch (e: any) {
        console.error("Paywall Error:", e);
        setError("Could not load plans. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  const handleStartTrial = async () => {
    if (!selectedPkgIdentifier) return;
    setIsPurchasing(true);
    try {
      if (!Capacitor.isNativePlatform()) {
        setTimeout(onPurchase, 1000); // Simulate success on web
      } else {
        const pkgToBuy = packages.find(p => p.identifier === selectedPkgIdentifier);
        if (!pkgToBuy) throw new Error("Package not found");

        const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkgToBuy });
        if (customerInfo.entitlements.active['pro_access']) {
          onPurchase(); // CRITICAL: Routes to PostPaymentAuth in App.tsx
        }
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        alert(`Purchase failed: ${e.message}`);
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  // Helper to sort packages: Weekly -> Monthly -> Yearly
  const sortedPackages = [...packages].sort((a, b) => {
    const order = { [PACKAGE_TYPE.WEEKLY]: 1, [PACKAGE_TYPE.MONTHLY]: 2, [PACKAGE_TYPE.ANNUAL]: 3 };
    return (order[a.packageType] || 4) - (order[b.packageType] || 4);
  });

  if (loading) {
    return <div className="fixed inset-0 bg-surface flex items-center justify-center z-50"><Growbot size="lg" mood="thinking" /></div>;
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-surface flex flex-col items-center justify-center z-50 p-6 text-center">
        <Growbot size="lg" mood="sad" />
        <p className="text-text-main font-bold mt-4">{error}</p>
        <button onClick={onClose} className="mt-4 text-gray-400 underline">Close</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-surface flex flex-col font-sans h-full">
      {/* 1. Header / Hero */}
      <div className="relative shrink-0">
        <div className="absolute top-4 right-4 z-20">
          <button onClick={onSkip} className="bg-black/10 text-text-sub p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="pt-12 pb-6 px-6 text-center">
          <Growbot size="xl" mood="happy" className="mx-auto mb-4 animate-bounce" />
          <h1 className="text-3xl font-black text-text-main leading-tight mb-2">Unlock Your<br/>Best Harvest</h1>
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <Shield size={12} className="fill-current" /> Verified Expert Logic
          </div>
        </div>
      </div>

      {/* 2. Scrollable Content (Plans & Benefits) */}
      <div className="flex-1 overflow-y-auto px-6 pb-40 no-scrollbar">
        
        {/* Benefits Grid */}
        <div className="grid grid-cols-1 gap-3 mb-8">
          <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0"><Zap size={20} /></div>
            <div><h3 className="font-bold text-text-main">Unlimited AI Diagnosis</h3><p className="text-xs text-gray-500">Identify pests & deficiencies instantly.</p></div>
          </div>
          <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center shrink-0"><Check size={20} strokeWidth={3} /></div>
            <div><h3 className="font-bold text-text-main">24/7 Expert Chatbot</h3><p className="text-xs text-gray-500">Your personal grow coach.</p></div>
          </div>
        </div>

        {/* Plan Selection */}
        <div className="space-y-4">
          {sortedPackages.map((pkg) => {
            const isSelected = selectedPkgIdentifier === pkg.identifier;
            const isMonthly = pkg.packageType === PACKAGE_TYPE.MONTHLY;
            const isYearly = pkg.packageType === PACKAGE_TYPE.ANNUAL;
            const isWeekly = pkg.packageType === PACKAGE_TYPE.WEEKLY;

            return (
              <div 
                key={pkg.identifier}
                onClick={() => setSelectedPkgIdentifier(pkg.identifier)}
                className={`relative p-5 rounded-3xl border-2 transition-all cursor-pointer flex justify-between items-center ${
                  isSelected ? 'border-primary bg-green-50/50 shadow-md transform scale-[1.02]' : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                {/* Badges */}
                {isMonthly && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                    <Star size={10} className="fill-current" /> Most Popular
                  </div>
                )}
                {isYearly && (
                  <div className="absolute -top-3 right-6 bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    Best Value
                  </div>
                )}

                <div>
                  <h4 className="font-black text-text-main text-lg">
                    {isMonthly ? "Monthly" : isYearly ? "Yearly" : "Weekly"}
                  </h4>
                  {isWeekly && <p className="text-xs font-bold text-primary mt-0.5">Dive In – Cancel Anytime</p>}
                  {isYearly && <p className="text-xs font-bold text-orange-600 mt-0.5">Save 50% Long Term</p>}
                </div>

                <div className="text-right">
                  <div className="text-xl font-black text-text-main">{pkg.product.priceString}</div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                    /{isMonthly ? 'mo' : isYearly ? 'yr' : 'wk'}
                  </div>
                </div>

                {/* Radio Circle */}
                <div className={`absolute top-1/2 -translate-y-1/2 left-[-12px] w-6 h-6 bg-white rounded-full border-2 flex items-center justify-center shadow-sm ${isSelected ? 'border-primary' : 'border-gray-200 opacity-0'}`}>
                   {isSelected && <div className="w-3 h-3 bg-primary rounded-full" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Sticky Footer (High Z-Index) */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-6 pb-8 z-50 rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <button 
          onClick={handleStartTrial}
          disabled={isPurchasing || !selectedPkgIdentifier}
          className="w-full bg-primary text-white font-black text-lg py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
        >
          {isPurchasing ? (
            <span className="animate-pulse">Processing...</span>
          ) : (
            <>Start Free 3-Day Free Trial <ArrowRight strokeWidth={3} size={20} /></>
          )}
        </button>
        
        <div className="text-center mt-4 space-y-2">
          <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
            Free 3-day trial. Cancel anytime before trial ends to avoid charges.<br/>
            Billing starts after trial based on the plan you select.
          </p>
          <div className="flex justify-center gap-3 text-[9px] text-gray-400 font-bold uppercase tracking-wider">
            <button className="hover:text-primary">Terms</button>
            <span>•</span>
            <button className="hover:text-primary">Privacy</button>
            <span>•</span>
            <button onClick={async () => { await Purchases.restorePurchases(); alert("Purchases Restored"); }} className="hover:text-primary">Restore</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Paywall;
