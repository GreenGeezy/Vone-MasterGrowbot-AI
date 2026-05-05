import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Check, Shield, Star, Zap, ArrowRight,
  LifeBuoy, Headphones, Dna, Clock, BookOpen, Sparkles
} from 'lucide-react';
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import Growbot from '../components/Growbot';

interface PaywallProps {
  onClose: () => void;
  onPurchase: () => void;
  onSkip: () => void;
}

const TESTIMONIALS = [
  { name: 'Jake M.', text: 'Caught a magnesium deficiency before it wrecked my whole crop.', stars: 5 },
  { name: 'Sarah K.', text: 'As a first-time grower I was totally lost. MasterGrowbot walked me through everything.', stars: 5 },
  { name: 'Tom R.', text: 'My best harvests have been since using this app. The AI is spot-on.', stars: 5 },
];

const FEATURES = [
  { icon: LifeBuoy, title: 'Unlimited AI Diagnosis', desc: 'Identify pests, diseases, and deficiencies instantly to prevent crop loss.' },
  { icon: Zap, title: 'Personalized Grow Plan', desc: 'Tailored tasks to your setup — avoid mistakes and maximize harvest potential.' },
  { icon: Dna, title: 'Searchable Strain Database', desc: 'Over 100 profiles with genetic-specific grow guides.' },
  { icon: Sparkles, title: 'AI Strain Intelligence', desc: 'Instant yield-maximizing secrets for 100+ cannabis strains.' },
  { icon: BookOpen, title: 'Professional Grow Journal', desc: 'Track nutrients, environment, and visual history to replicate your best harvests.' },
];

const Paywall: React.FC<PaywallProps> = ({ onClose, onPurchase }) => {
  const [selectedPkgIdentifier, setSelectedPkgIdentifier] = useState<string | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trialUsed, setTrialUsed] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!Capacitor.isNativePlatform()) {
        const mockPackages = [
          { identifier: 'mg_weekly', packageType: 'WEEKLY', product: { priceString: '$7.99', title: '', description: '' } } as any,
          { identifier: 'mg_monthly', packageType: 'MONTHLY', product: { priceString: '$29.99', title: '', description: '' } } as any,
          { identifier: 'mg_annual', packageType: 'ANNUAL', product: { priceString: '$99.99', title: '', description: '' } } as any,
        ];
        setPackages(mockPackages);
        setSelectedPkgIdentifier('mg_annual');
        setLoading(false);
        return;
      }

      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('App Store connection timed out')), 8000)
      );
      const offeringsPromise = Purchases.getOfferings();
      const offerings = await Promise.race([offeringsPromise, timeoutPromise]) as any;

      if (offerings.current?.availablePackages?.length > 0) {
        const pkgs = offerings.current.availablePackages;
        setPackages(pkgs);
        const annual = pkgs.find((p: any) => p.packageType === 'ANNUAL');
        setSelectedPkgIdentifier(annual ? annual.identifier : pkgs[0].identifier);

        // Check if user already used trial
        const { customerInfo } = await Purchases.getCustomerInfo();
        const hasEverTrialed = !!customerInfo?.originalPurchaseDate;
        setTrialUsed(hasEverTrialed);
      } else {
        setError('No subscription plans found at this time.');
      }
    } catch (e: any) {
      console.error('RevenueCat Error:', e);
      setError(e.message || 'Could not connect to the App Store.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const handleStartTrial = async () => {
    if (!selectedPkgIdentifier) return;
    setIsPurchasing(true);
    setError(null);
    try {
      if (!Capacitor.isNativePlatform()) {
        await new Promise(r => setTimeout(r, 1500));
        onPurchase();
        return;
      }
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const pkg = packages.find(p => p.identifier === selectedPkgIdentifier);
      if (!pkg) { setError('Selected plan unavailable'); return; }
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
      if (customerInfo.entitlements.active['pro']) {
        onPurchase();
      } else {
        setError('Purchase completed but subscription not active. Please restore.');
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        console.error('Purchase Error:', e);
        setError(e.message || 'Purchase failed. Please try again.');
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsPurchasing(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        const { customerInfo } = await Purchases.restorePurchases();
        if (customerInfo.entitlements.active['pro']) {
          alert('Success! Your subscription has been restored.');
          onPurchase();
        } else {
          alert('No active subscription found to restore.');
        }
      }
    } catch (e) {
      alert('Failed to restore purchases. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const openLink = async (url: string) => {
    try { await Browser.open({ url }); } catch { window.open(url, '_blank'); }
  };

  const selectedPkg = packages.find(p => p.identifier === selectedPkgIdentifier);

  const getButtonText = () => {
    if (!selectedPkg) return 'Select a Plan';
    const price = selectedPkg.product.priceString;
    if (trialUsed) return `Subscribe — ${price}`;
    return 'Start Free Trial';
  };

  const getSubtext = () => {
    if (!selectedPkg) return '';
    const price = selectedPkg.product.priceString;
    let period = 'month';
    if (selectedPkg.packageType === 'WEEKLY') period = 'week';
    if (selectedPkg.packageType === 'ANNUAL') period = 'year';
    if (trialUsed) {
      return `Auto-renews at ${price}/${period}. Cancel anytime.`;
    }
    return `24-hour free trial, then ${price}/${period}. Cancel anytime.`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-[60] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-gray-600">Loading Plans...</p>
        </div>
      </div>
    );
  }

  if (error && !packages.length) {
    return (
      <div className="fixed inset-0 bg-white z-[60] flex flex-col items-center justify-center p-8 text-center">
        <Growbot size="xl" mood="alert" className="mb-6 opacity-80" />
        <h2 className="text-xl font-black text-gray-900 mb-2">Connection Issues</h2>
        <p className="text-sm text-gray-500 mb-8 max-w-xs">{error}</p>
        <button onClick={loadProducts} className="bg-green-600 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:bg-green-700 active:scale-95 transition-all">
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col overflow-hidden">
      {/* HERO */}
      <div className="relative flex-shrink-0 bg-green-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1596791836043-982c75908b89?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80')] bg-cover bg-center opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-900/80 to-green-900" />
        <div className="relative px-6 pt-12 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-white/20 backdrop-blur text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1">
              <Shield size={10} className="text-green-300" /> Trusted by Elite Growers
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-2">
            Don't Lose Your Harvest
          </h1>
          <p className="text-sm font-medium text-green-100/90 max-w-sm">
            AI detects plant problems before they cost you your grow
          </p>
        </div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto px-6 pb-[240px]">
        {/* VALUE PROPS */}
        <div className="space-y-4 my-6">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex gap-4 items-start">
              <div className="p-2.5 bg-green-50 text-green-600 rounded-xl flex-shrink-0">
                <f.icon size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* SOCIAL PROOF */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-1 mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={16} className="text-yellow-400 fill-yellow-400" />
            ))}
            <span className="text-xs font-bold text-gray-600 ml-1">4.9 Rating</span>
          </div>
          <div className="space-y-3">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="flex items-center gap-1 mb-1">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} size={10} className="text-yellow-400 fill-yellow-400" />
                  ))}
                  <span className="text-[10px] font-bold text-gray-500 ml-1">{t.name}</span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">&ldquo;{t.text}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>

        {/* PRICING */}
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 text-center">
          Choose Your Plan
        </h2>
        <div className="space-y-3">
          {packages.map((pkg) => {
            const isSelected = selectedPkgIdentifier === pkg.identifier;
            const isAnnual = pkg.packageType === 'ANNUAL';
            const displayPrice = pkg.product.priceString;
            return (
              <div
                key={pkg.identifier}
                onClick={() => setSelectedPkgIdentifier(pkg.identifier)}
                className={`relative rounded-2xl border-2 p-4 transition-all active:scale-[0.98] cursor-pointer ${
                  isSelected ? 'border-green-600 bg-green-50/50' : 'border-gray-100 bg-white'
                }`}
              >
                {isAnnual && (
                  <div className="absolute -top-3 left-4 bg-green-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-md">
                    Best Value
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-0.5">
                      {pkg.packageType === 'WEEKLY' ? 'Weekly' : pkg.packageType === 'MONTHLY' ? 'Monthly' : 'Yearly'}
                    </p>
                    <p className={`font-black text-2xl ${isSelected ? 'text-green-700' : 'text-gray-900'}`}>
                      {displayPrice}
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium">
                      {pkg.packageType === 'WEEKLY' ? 'Billed weekly' : pkg.packageType === 'MONTHLY' ? 'Billed monthly' : 'Billed annually — save vs monthly'}
                    </p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'border-green-600 bg-green-600' : 'border-gray-300'
                  }`}>
                    {isSelected && <Check size={14} className="text-white" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STICKY BOTTOM CTA */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-6 pb-10 z-50 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
        <button
          onClick={handleStartTrial}
          disabled={isPurchasing || !selectedPkgIdentifier}
          className="w-full bg-green-600 text-white font-black text-lg py-4 rounded-2xl shadow-xl shadow-green-200/50 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
        >
          {isPurchasing ? (
            <span className="animate-pulse">Processing...</span>
          ) : (
            <>
              {getButtonText()} <ArrowRight strokeWidth={3} size={20} />
            </>
          )}
        </button>
        <p className="text-center text-[11px] text-gray-500 font-medium mt-3 leading-snug">
          {getSubtext()}
        </p>
        <div className="flex justify-center gap-3 mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
          <button onClick={() => openLink('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')} className="hover:text-green-600 transition-colors">
            Terms
          </button>
          <span className="text-gray-300">•</span>
          <button onClick={() => openLink('https://www.mastergrowbot.com/privacy-policy')} className="hover:text-green-600 transition-colors">
            Privacy
          </button>
          <span className="text-gray-300">•</span>
          <button onClick={handleRestore} className="hover:text-green-600 transition-colors">
            Restore Purchases
          </button>
        </div>
      </div>

      {error && (
        <div className="absolute top-6 left-6 right-6 bg-red-500 text-white p-3 rounded-xl text-center text-xs font-bold shadow-2xl animate-in slide-in-from-top-2 z-[70]">
          {error}
        </div>
      )}
    </div>
  );
};

export default Paywall;
