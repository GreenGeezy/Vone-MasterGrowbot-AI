import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { CheckCircle, Zap, Lock, ChevronRight } from 'lucide-react';
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor';

interface OnboardingPaywallProps {
  onPurchase: () => void;
}

interface PackageOption {
  id: string;
  label: string;
  badge?: string;
  price: string;
  perDay: string;
  features: string[];
  rcPackage?: PurchasesPackage;
}

const FALLBACK_PACKAGES: PackageOption[] = [
  {
    id: 'weekly',
    label: 'Weekly',
    price: '$9.99/week',
    perDay: '$1.43 / day',
    features: ['Full AI plant scanning', 'AI strain intelligence', 'Grow journal AI analysis', 'Unlimited grow tracking'],
  },
  {
    id: 'yearly',
    label: 'Annual',
    badge: 'Best Value',
    price: '$99.99/year',
    perDay: '$0.27 / day',
    features: ['Everything in Weekly', 'Save 81% vs weekly', 'Priority AI analysis', '1 full year of grows'],
  },
  {
    id: 'lifetime',
    label: 'Lifetime',
    badge: 'One-time',
    price: '$199.99',
    perDay: 'Pay once, own forever',
    features: ['Everything in Annual', 'Never pay again', 'All future features included', 'True ownership'],
  },
];

const INCLUDED_FEATURES = [
  'AI plant health diagnosis',
  'Nutrient deficiency detection',
  'Personalized grow schedules',
  'AI strain intelligence database',
  'Grow journal with AI analysis',
  'Daily reminders & tasks',
];

const OnboardingPaywall: React.FC<OnboardingPaywallProps> = ({ onPurchase }) => {
  const [packages, setPackages] = useState<PackageOption[]>(FALLBACK_PACKAGES);
  const [selected, setSelected] = useState<string>('yearly');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    if (!Capacitor.isNativePlatform()) return; // RevenueCat only works on native
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      if (!current?.availablePackages?.length) return;

      const loaded: PackageOption[] = [];

      // Map RC packages to display options
      const weeklyPkg = current.availablePackages.find(p =>
        p.identifier.includes('weekly') || p.identifier === '$rc_weekly'
      );
      const yearlyPkg = current.availablePackages.find(p =>
        p.identifier.includes('yearly') || p.identifier.includes('annual') || p.identifier === '$rc_annual'
      );
      const lifetimePkg = current.availablePackages.find(p =>
        p.identifier.includes('lifetime')
      );

      if (weeklyPkg) {
        const price = weeklyPkg.product.priceString;
        const priceNum = weeklyPkg.product.price;
        loaded.push({
          id: 'weekly',
          label: 'Weekly',
          price: `${price}/week`,
          perDay: `$${(priceNum / 7).toFixed(2)} / day`,
          features: FALLBACK_PACKAGES[0].features,
          rcPackage: weeklyPkg,
        });
      }

      if (yearlyPkg) {
        const price = yearlyPkg.product.priceString;
        const priceNum = yearlyPkg.product.price;
        loaded.push({
          id: 'yearly',
          label: 'Annual',
          badge: 'Best Value',
          price: `${price}/year`,
          perDay: `$${(priceNum / 365).toFixed(2)} / day`,
          features: FALLBACK_PACKAGES[1].features,
          rcPackage: yearlyPkg,
        });
      }

      if (lifetimePkg) {
        const price = lifetimePkg.product.priceString;
        loaded.push({
          id: 'lifetime',
          label: 'Lifetime',
          badge: 'One-time',
          price: price,
          perDay: 'Pay once, own forever',
          features: FALLBACK_PACKAGES[2].features,
          rcPackage: lifetimePkg,
        });
      }

      if (loaded.length > 0) {
        setPackages(loaded);
        // Default to yearly if available, else first
        const hasYearly = loaded.find(p => p.id === 'yearly');
        setSelected(hasYearly ? 'yearly' : loaded[0].id);
      }
    } catch (e) {
      console.warn('Failed to load RevenueCat packages:', e);
      // Use fallback packages — already set in state
    }
  };

  const handlePurchase = async () => {
    const selectedPkg = packages.find(p => p.id === selected);
    if (!selectedPkg) return;

    setPurchasing(true);
    setError('');

    // On web, skip payment and proceed directly (testing / web preview)
    if (!Capacitor.isNativePlatform()) {
      setTimeout(() => { setPurchasing(false); onPurchase(); }, 800);
      return;
    }

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      if (selectedPkg.rcPackage) {
        const { customerInfo } = await Purchases.purchasePackage({ aPackage: selectedPkg.rcPackage });
        if (typeof customerInfo.entitlements.active['pro'] !== 'undefined') {
          onPurchase();
          return;
        }
      }
      onPurchase();
    } catch (err: any) {
      if (err?.userCancelled || err?.code === '1') {
        // User cancelled — silent
      } else {
        setError(err?.message || 'Purchase failed. Please try again.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (!Capacitor.isNativePlatform()) return;
    setRestoring(true);
    setError('');
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { customerInfo } = await Purchases.restorePurchases();
      if (typeof customerInfo.entitlements.active['pro'] !== 'undefined') {
        onPurchase();
      } else {
        setError('No previous purchases found.');
      }
    } catch (err: any) {
      setError(err?.message || 'Restore failed. Try again.');
    } finally {
      setRestoring(false);
    }
  };

  const selectedPkg = packages.find(p => p.id === selected);

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col font-sans">
      {/* Header */}
      <div className="px-6 pt-14 pb-6 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-56 bg-[#059669]/8 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-center mb-2">
          <div className="bg-[#059669] rounded-2xl p-3 shadow-2xl shadow-[#059669]/40">
            <Zap size={28} color="white" />
          </div>
        </div>

        <h1 className="text-3xl font-black text-white text-center leading-tight mt-3">
          Unlock Full Access
        </h1>
        <p className="text-white/50 text-sm text-center mt-2">
          Start your journey with unlimited AI grow coaching.
        </p>
      </div>

      {/* Included features */}
      <div className="px-6 mb-5">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-3">Everything included:</div>
          <div className="grid grid-cols-2 gap-1.5">
            {INCLUDED_FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle size={12} className="text-[#059669] flex-shrink-0" />
                <span className="text-white/70 text-xs">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Plan selector */}
      <div className="px-6 space-y-3 flex-1">
        {packages.map(pkg => (
          <button
            key={pkg.id}
            onClick={() => setSelected(pkg.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left active:scale-[0.98] ${
              selected === pkg.id
                ? 'bg-[#059669]/15 border-[#059669] shadow-lg shadow-[#059669]/20'
                : 'bg-white/5 border-white/10'
            }`}
          >
            {/* Radio */}
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              selected === pkg.id ? 'border-[#059669] bg-[#059669]' : 'border-white/30'
            }`}>
              {selected === pkg.id && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`font-black text-base ${selected === pkg.id ? 'text-white' : 'text-white/80'}`}>
                  {pkg.label}
                </span>
                {pkg.badge && (
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    pkg.id === 'yearly' ? 'bg-[#059669] text-white' : 'bg-white/20 text-white/70'
                  }`}>{pkg.badge}</span>
                )}
              </div>
              <div className="text-white/40 text-xs mt-0.5">{pkg.perDay}</div>
            </div>

            <div className="text-right">
              <div className={`font-black text-sm ${selected === pkg.id ? 'text-[#059669]' : 'text-white/60'}`}>
                {pkg.price}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="px-6 mt-3">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5">
            <p className="text-red-400 text-xs font-semibold">{error}</p>
          </div>
        </div>
      )}

      {/* Purchase CTA */}
      <div className="px-6 pt-5 pb-10">
        <button
          onClick={handlePurchase}
          disabled={purchasing}
          className="w-full py-5 bg-[#059669] text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-2xl shadow-[#059669]/40 mb-3"
        >
          {purchasing ? (
            <span className="animate-pulse">Processing...</span>
          ) : (
            <>
              <Lock size={18} />
              {selectedPkg ? `Start with ${selectedPkg.label} — ${selectedPkg.price}` : 'Continue'}
            </>
          )}
        </button>

        <button
          onClick={handleRestore}
          disabled={restoring}
          className="w-full text-white/30 text-sm font-bold py-2 text-center"
        >
          {restoring ? 'Restoring...' : 'Restore Previous Purchase'}
        </button>

        <p className="text-white/20 text-[10px] text-center mt-3 leading-relaxed px-4">
          Subscriptions auto-renew. Cancel anytime in App Store settings.
          Payment charged to Apple ID account at confirmation of purchase.
        </p>
      </div>
    </div>
  );
};

export default OnboardingPaywall;
