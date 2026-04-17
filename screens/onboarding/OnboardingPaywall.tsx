import React, { useEffect, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { CheckCircle, Zap, Lock, Star, Shield, Crown } from 'lucide-react';
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor';

interface OnboardingPaywallProps {
  onPurchase: () => void;
}

interface PackageOption {
  id: string;
  label: string;
  badge?: string;
  badgeStyle?: 'green' | 'gold';
  price: string;
  perDay: string;
  subtext?: string;
  anchorPrice?: string; // strikethrough comparison price
  rcPackage?: PurchasesPackage;
}

// Fallback prices shown when RevenueCat is unavailable (web preview / no network)
// Order: Yearly first (highlighted/recommended), Weekly, Lifetime (anchor)
const FALLBACK_PACKAGES: PackageOption[] = [
  {
    id: 'yearly',
    label: 'Yearly',
    badge: 'SAVE 80%',
    badgeStyle: 'green',
    price: '$99.99',
    perDay: 'Just $1.92/week',
    subtext: 'Billed annually · Best for serious growers',
    anchorPrice: '$519.48',
  },
  {
    id: 'weekly',
    label: 'Weekly',
    price: '$9.99',
    perDay: '$1.43/day',
    subtext: 'Billed weekly · Cancel anytime',
  },
  {
    id: 'lifetime',
    label: 'Lifetime',
    badge: 'FOREVER',
    badgeStyle: 'gold',
    price: '$199',
    perDay: 'One-time',
    subtext: 'Pay once · Unlock forever',
  },
];

const INCLUDED_FEATURES = [
  'Unlimited AI plant scans',
  'Personalized grow plans',
  'AI strain intelligence',
  'Smart grow journal',
  'Nutrient deficiency detection',
  'Daily reminders & tasks',
];

const TESTIMONIALS = [
  { name: 'Sarah K.', location: 'California', text: 'Caught a cal-mag issue I completely missed. Saved my whole harvest.', stars: 5 },
  { name: 'Jake M.', location: 'Colorado', text: 'This app literally saved my first grow. Zero problems start to finish.', stars: 5 },
  { name: 'Mike R.', location: 'Oregon', text: 'Better than asking Reddit. Instant answers, every time.', stars: 5 },
];

const TRUST_BADGES = [
  { icon: Shield, label: 'Secure Payment' },
  { icon: Lock, label: 'Cancel Anytime' },
  { icon: Star, label: 'Premium Support' },
];

const OnboardingPaywall: React.FC<OnboardingPaywallProps> = ({ onPurchase }) => {
  const [packages, setPackages] = useState<PackageOption[]>(FALLBACK_PACKAGES);
  const [selected, setSelected] = useState<string>('yearly');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState('');
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const testimonialTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    testimonialTimer.current = setInterval(() => {
      setTestimonialIndex(i => (i + 1) % TESTIMONIALS.length);
    }, 4000);
    return () => { if (testimonialTimer.current) clearInterval(testimonialTimer.current); };
  }, []);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      if (!current?.availablePackages?.length) return;

      const loaded: PackageOption[] = [];

      const yearlyPkg = current.availablePackages.find(p =>
        p.identifier === '$rc_annual' ||
        p.identifier.includes('annual') ||
        p.identifier.includes('yearly')
      );
      const weeklyPkg = current.availablePackages.find(p =>
        p.identifier === '$rc_weekly' ||
        p.identifier.includes('weekly')
      );
      const lifetimePkg = current.availablePackages.find(p =>
        p.identifier === 'lifetime' ||
        p.identifier.includes('lifetime')
      );

      // Compute anchor (yearly-equivalent cost of weekly plan) for price comparison
      const weeklyPrice = weeklyPkg?.product.price;
      const anchorStr = weeklyPkg && weeklyPrice
        ? `${weeklyPkg.product.currencyCode === 'USD' ? '$' : ''}${(weeklyPrice * 52).toFixed(2)}`
        : '$519.48';

      if (yearlyPkg) {
        const priceNum = yearlyPkg.product.price;
        loaded.push({
          id: 'yearly',
          label: 'Yearly',
          badge: 'SAVE 80%',
          badgeStyle: 'green',
          price: yearlyPkg.product.priceString,
          perDay: `Just $${(priceNum / 52).toFixed(2)}/week`,
          subtext: 'Billed annually · Best for serious growers',
          anchorPrice: anchorStr,
          rcPackage: yearlyPkg,
        });
      }

      if (weeklyPkg) {
        const priceNum = weeklyPkg.product.price;
        loaded.push({
          id: 'weekly',
          label: 'Weekly',
          price: weeklyPkg.product.priceString,
          perDay: `$${(priceNum / 7).toFixed(2)}/day`,
          subtext: 'Billed weekly · Cancel anytime',
          rcPackage: weeklyPkg,
        });
      }

      if (lifetimePkg) {
        loaded.push({
          id: 'lifetime',
          label: 'Lifetime',
          badge: 'FOREVER',
          badgeStyle: 'gold',
          price: lifetimePkg.product.priceString,
          perDay: 'One-time',
          subtext: 'Pay once · Unlock forever',
          rcPackage: lifetimePkg,
        });
      }

      if (loaded.length > 0) {
        setPackages(loaded);
        setSelected(loaded.find(p => p.id === 'yearly') ? 'yearly' : loaded[0].id);
      }
    } catch (e) {
      console.warn('Failed to load RevenueCat packages, using fallback:', e);
    }
  };

  const handlePurchase = async () => {
    const selectedPkg = packages.find(p => p.id === selected);
    if (!selectedPkg) return;

    setPurchasing(true);
    setError('');

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
        // silent
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#ECFDF5] via-white to-white flex flex-col font-sans">

      {/* Header */}
      <div className="px-6 pt-14 pb-4 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-56 bg-[#059669]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Trust bar — qualitative only (App Store safe for new apps) */}
        <div className="flex justify-center mb-4 relative z-10">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-full">
            <Shield size={11} className="text-[#059669]" />
            <span className="text-slate-700 text-[11px] font-bold ml-0.5">Loved by Elite Growers</span>
          </div>
        </div>

        <div className="flex items-center justify-center mb-3 relative z-10">
          <div className="bg-gradient-to-br from-[#059669] to-emerald-700 rounded-2xl p-3 shadow-xl shadow-[#059669]/30">
            <Zap size={28} color="white" strokeWidth={2.2} />
          </div>
        </div>
        <h1 className="text-[32px] font-black text-slate-900 text-center leading-[1.1] mt-2 relative z-10 tracking-tight">
          Grow Like a Pro.<br />
          <span className="text-[#059669]">Starting Today.</span>
        </h1>
        <p className="text-slate-500 text-sm text-center mt-3 relative z-10 px-4 leading-relaxed">
          Unlimited AI scans, personalized grow plans, and expert guidance — all in your pocket.
        </p>
      </div>

      {/* Included features — 2 col grid */}
      <div className="px-6 mb-4">
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4">
          <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3">Everything Included:</div>
          <div className="grid grid-cols-2 gap-y-2 gap-x-3">
            {INCLUDED_FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle size={13} className="text-[#059669] flex-shrink-0" strokeWidth={2.5} />
                <span className="text-slate-700 text-xs font-medium">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonial carousel */}
      <div className="px-6 mb-4">
        <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm min-h-[96px] flex items-center">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className="absolute inset-0 flex flex-col justify-center px-4 py-3 transition-opacity duration-700"
              style={{ opacity: i === testimonialIndex ? 1 : 0, pointerEvents: i === testimonialIndex ? 'auto' : 'none' }}
            >
              <div className="flex gap-0.5 mb-1.5">
                {Array.from({ length: t.stars }).map((_, s) => (
                  <Star key={s} size={11} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-slate-700 text-xs leading-relaxed italic">"{t.text}"</p>
              <p className="text-slate-500 text-[10px] font-bold mt-1.5">— {t.name}, {t.location}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-1.5 mt-2">
          {TESTIMONIALS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${i === testimonialIndex ? 'w-5 h-1.5 bg-[#059669]' : 'w-1.5 h-1.5 bg-slate-300'}`}
            />
          ))}
        </div>
      </div>

      {/* Plan selector — yearly / weekly / lifetime */}
      <div className="px-6 space-y-3 flex-1">
        {packages.map(pkg => {
          const isSelected = selected === pkg.id;
          const isYearly = pkg.id === 'yearly';
          const isLifetime = pkg.id === 'lifetime';

          return (
            <button
              key={pkg.id}
              onClick={() => setSelected(pkg.id)}
              className={`relative w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left active:scale-[0.98] ${
                isSelected
                  ? isLifetime
                    ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-400 shadow-lg shadow-amber-500/20'
                    : 'bg-[#ECFDF5] border-[#059669] shadow-lg shadow-emerald-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
              }`}
            >
              {/* Floating badge — top-right */}
              {pkg.badge && (
                <div className={`absolute -top-2.5 right-4 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md ${
                  pkg.badgeStyle === 'gold'
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-900 border border-amber-300'
                    : 'bg-gradient-to-r from-[#059669] to-emerald-600 text-white'
                }`}>
                  {pkg.badge}
                </div>
              )}

              {/* Radio dot */}
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                isSelected
                  ? isLifetime
                    ? 'border-amber-500 bg-amber-500'
                    : 'border-[#059669] bg-[#059669]'
                  : 'border-slate-300'
              }`}>
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>

              {/* Label + subtext */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-black text-base ${
                    isSelected ? 'text-slate-900' : 'text-slate-800'
                  }`}>
                    {pkg.label}
                  </span>
                  {isLifetime && (
                    <Crown size={13} className="text-amber-500" />
                  )}
                </div>
                <div className="text-slate-500 text-xs mt-0.5 leading-snug">{pkg.subtext}</div>
                {/* per-day on second line for emphasis */}
                <div className={`text-[11px] font-black mt-1 ${
                  isYearly ? 'text-[#059669]' : 'text-slate-500'
                }`}>
                  {pkg.perDay}
                </div>
              </div>

              {/* Price column */}
              <div className="text-right flex-shrink-0">
                {pkg.anchorPrice && (
                  <div className="text-slate-400 text-[10px] line-through mb-0.5">
                    {pkg.anchorPrice}
                  </div>
                )}
                <div className={`font-black text-lg leading-none ${
                  isSelected
                    ? isLifetime ? 'text-amber-700' : 'text-[#059669]'
                    : 'text-slate-800'
                }`}>
                  {pkg.price}
                </div>
                {isYearly && (
                  <div className="text-slate-500 text-[10px] mt-0.5">per year</div>
                )}
                {pkg.id === 'weekly' && (
                  <div className="text-slate-500 text-[10px] mt-0.5">per week</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Trust badges strip */}
      <div className="px-6 mt-5">
        <div className="flex items-center justify-center gap-5">
          {TRUST_BADGES.map((b, i) => {
            const Icon = b.icon;
            return (
              <div key={i} className="flex items-center gap-1.5">
                <Icon size={12} className="text-slate-400" />
                <span className="text-slate-500 text-[10px] font-semibold">{b.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-6 mt-3">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
            <p className="text-red-600 text-xs font-semibold">{error}</p>
          </div>
        </div>
      )}

      {/* CTA + legal */}
      <div className="px-6 pt-4 pb-10">
        <button
          onClick={handlePurchase}
          disabled={purchasing}
          className="w-full py-5 bg-gradient-to-b from-[#10B981] to-[#059669] text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-xl shadow-[#059669]/40 mb-2 disabled:opacity-70"
        >
          {purchasing ? (
            <span className="animate-pulse">Processing...</span>
          ) : (
            <>
              Start Growing Smarter
            </>
          )}
        </button>

        {/* Reassurance line */}
        <p className="text-slate-500 text-[11px] text-center font-semibold mb-2">
          🔒 Secure checkout · Cancel anytime in App Store
        </p>

        <button
          onClick={handleRestore}
          disabled={restoring}
          className="w-full text-slate-400 text-xs font-bold py-2 text-center disabled:opacity-50"
        >
          {restoring ? 'Restoring...' : 'Restore Purchases'}
        </button>

        <p className="text-slate-400 text-[10px] text-center mt-3 leading-relaxed px-2">
          Subscription automatically renews unless canceled at least 24 hours before the end of the current period.
          Cancel anytime in App Store settings. Payment charged to Apple ID account at confirmation of purchase.
        </p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <a
            href="https://mastergrowbotai.com/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 text-[10px] underline"
          >
            Terms of Service
          </a>
          <span className="text-slate-300 text-[10px]">·</span>
          <a
            href="https://mastergrowbotai.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 text-[10px] underline"
          >
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPaywall;
