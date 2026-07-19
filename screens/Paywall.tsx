import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  Check, Star, ArrowRight, Lock, RotateCcw, Sparkles
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

// RevenueCat product IDs for reference (not entitlement checks):
// - mastergrowbot_pro_yearly_v3
// - monthly_pro_v2
// - weekly_pro_v2

const TESTIMONIALS = [
  { name: 'Jake M.', text: 'Caught a magnesium deficiency before it wrecked my whole crop.' },
  { name: 'Sarah K.', text: 'As a first-time grower I was totally lost. MasterGrowbot walked me through everything.' },
  { name: 'Tom R.', text: 'My best harvests have been since using this app. The AI is spot-on.' },
  { name: 'Alex D.', text: 'I caught early nutrient burn before it spread through my tent. Saved me a ton of stress.' },
];

const FEATURES = [
  { icon: '🧬', title: 'AI Strain Intelligence', desc: 'Genetic-specific grow guides' },
  { icon: '🌱', title: 'Personalized Grow Plans', desc: 'Tailored to your setup' },
  { icon: '🔬', title: 'Nutrient Deficiency Detection', desc: 'Catch problems early' },
  { icon: '📸', title: 'Unlimited AI Plant Scans', desc: 'Diagnose with photos' },
  { icon: '🪴', title: 'Smart Grow Journal', desc: 'Track every grow cycle' },
  { icon: '⏰', title: 'Daily Reminders & Tasks', desc: 'Never miss a feeding' },
];

const TestimonialCard = memo(({ testimonial, index }: { testimonial: typeof TESTIMONIALS[0]; index: number }) => (
  <div
    key={index}
    className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white/60 flex-shrink-0 w-[260px]"
  >
    <div className="flex gap-0.5 mb-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />
      ))}
    </div>
    <p className="text-sm text-gray-700 font-medium leading-relaxed mb-3">
      &ldquo;{testimonial.text}&rdquo;
    </p>
    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
      {testimonial.name}
    </p>
  </div>
));
TestimonialCard.displayName = 'TestimonialCard';

function hasActivePaidAccess(customerInfo: any): boolean {
  if (!customerInfo) return false;
  const hasProEntitlement = Boolean(customerInfo.entitlements?.active?.pro);
  const hasSubscriptions = (customerInfo.activeSubscriptions?.length || 0) > 0;
  return hasProEntitlement || hasSubscriptions;
}

async function waitForPurchasesConfiguration(Purchases: any, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const { isConfigured } = await Purchases.isConfigured();
      if (isConfigured) return;
    } catch {
      // The background initializer may still be loading the native plugin.
    }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error('Subscription service is still starting. Please try again.');
}

function parsePackagePrice(pkg?: PurchasesPackage): number | null {
  if (!pkg) return null;
  const product = pkg.product as any;
  if (typeof product.price === 'number' && Number.isFinite(product.price)) {
    return product.price;
  }
  const parsed = Number(String(product.priceString || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

const Paywall: React.FC<PaywallProps> = ({ onClose, onPurchase }) => {
  const [selectedPkgIdentifier, setSelectedPkgIdentifier] = useState<string | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trialEligibleProductIds, setTrialEligibleProductIds] = useState<string[]>([]);
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTestimonialIndex(prev => (prev + 1) % TESTIMONIALS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

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
      await waitForPurchasesConfiguration(Purchases);
      await Purchases.invalidateCustomerInfoCache();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('App Store connection timed out')), 8000)
      );
      const offeringsPromise = Purchases.getOfferings();
      const offerings = await Promise.race([offeringsPromise, timeoutPromise]) as any;

      if (offerings.current?.availablePackages?.length > 0) {
        const pkgs = offerings.current.availablePackages;
        setPackages(pkgs);
        const annual = pkgs.find((p: any) => p.packageType === 'ANNUAL');
        const defaultPkg = annual || pkgs[0];
        setSelectedPkgIdentifier(defaultPkg.identifier);

        try {
          const freeTrialProductIds = pkgs
            .filter((pkg: any) => pkg.product?.introPrice?.price === 0)
            .map((pkg: any) => pkg.product.identifier);
          const eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility({
            productIdentifiers: freeTrialProductIds,
          });
          setTrialEligibleProductIds(
            freeTrialProductIds.filter((productId: string) => eligibility[productId]?.status === 2)
          );
        } catch {
          setTrialEligibleProductIds([]);
        }
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

      const purchaseResult = await Purchases.purchasePackage({ aPackage: pkg });

      if (hasActivePaidAccess(purchaseResult.customerInfo)) {
        onPurchase();
        return;
      }

      await Purchases.invalidateCustomerInfoCache();
      await Purchases.syncPurchases();

      const { customerInfo: freshInfo } = await Purchases.getCustomerInfo();
      if (hasActivePaidAccess(freshInfo)) {
        onPurchase();
        return;
      }

      for (let attempt = 1; attempt <= 10; attempt++) {
        setError(`Activating your subscription... (${attempt}/10)`);
        await new Promise(r => setTimeout(r, 2000));
        await Purchases.invalidateCustomerInfoCache();
        await Purchases.syncPurchases();
        const { customerInfo: retryInfo } = await Purchases.getCustomerInfo();
        if (hasActivePaidAccess(retryInfo)) {
          setError(null);
          onPurchase();
          return;
        }
      }

      setError('Subscription activation is taking longer than expected. Please tap "Restore Purchases" or try again later.');
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
    setError(null);
    try {
      if (Capacitor.isNativePlatform()) {
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        await Purchases.restorePurchases();
        await Purchases.invalidateCustomerInfoCache();
        await Purchases.syncPurchases();
        const { customerInfo } = await Purchases.getCustomerInfo();
        if (hasActivePaidAccess(customerInfo)) {
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
  const trialEligible = Boolean(
    selectedPkg && trialEligibleProductIds.includes(selectedPkg.product.identifier)
  );
  const annualPkg = packages.find((p: any) => p.packageType === 'ANNUAL');
  const monthlyPkg = packages.find((p: any) => p.packageType === 'MONTHLY');

  const getAnnualValueText = () => {
    const annualPrice = parsePackagePrice(annualPkg);
    const monthlyPrice = parsePackagePrice(monthlyPkg);

    if (annualPrice && monthlyPrice) {
      const savings = Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100);
      const weeklyEquivalent = annualPrice / 52;
      if (Number.isFinite(savings) && savings > 0 && Number.isFinite(weeklyEquivalent)) {
        return {
          badge: `Save ${savings}% vs monthly`,
          subtext: `Equivalent to $${weeklyEquivalent.toFixed(2)}/week, billed yearly`,
        };
      }
    }

    return {
      badge: 'Save 72% vs monthly',
      subtext: 'Equivalent to $1.92/week, billed yearly',
    };
  };

  const getSubtext = () => {
    if (!selectedPkg) return '';
    const price = selectedPkg.product.priceString;
    let period = 'month';
    if (selectedPkg.packageType === 'WEEKLY') period = 'week';
    if (selectedPkg.packageType === 'ANNUAL') period = 'year';
    if (trialEligible) {
      return `Free trial, then ${price}/${period} unless canceled.`;
    }
    return `Auto-renews at ${price}/${period} unless canceled.`;
  };

  const getPlanMeta = (pkg: any) => {
    if (pkg.packageType === 'ANNUAL') {
      const annualValue = getAnnualValueText();
      return {
        badge: annualValue.badge,
        badgeColor: 'bg-gradient-to-r from-green-600 to-emerald-500',
        subtext: annualValue.subtext,
        emphasis: true,
      };
    }
    if (pkg.packageType === 'MONTHLY') {
      return {
        badge: 'MOST POPULAR',
        badgeColor: 'bg-gradient-to-r from-amber-500 to-orange-400',
        subtext: 'Best balance of flexibility and savings',
        emphasis: false,
      };
    }
    return {
      badge: null,
      badgeColor: '',
      subtext: 'Perfect for urgent grow issues',
      emphasis: false,
    };
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

      {/* ===== HERO ===== */}
      <div className="relative flex-shrink-0 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-900 via-emerald-800 to-green-950" />
        {/* Subtle glow orbs */}
        <div className="absolute top-[-20%] right-[-10%] w-[300px] h-[300px] bg-emerald-400/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[250px] h-[250px] bg-green-300/10 rounded-full blur-[80px]" />
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative px-6 pt-10 pb-8">
          <div className="flex items-center gap-2 mb-5">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-2">
              <Sparkles size={18} className="text-emerald-300" />
            </div>
            <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
              AI-Powered Grow Assistant
            </span>
          </div>
          <h1 className="text-[2rem] sm:text-[2.5rem] font-black leading-[1.1] mb-3 tracking-tight text-white">
            Grow Like a Pro.<br />
            <span className="text-emerald-300">Starting Today.</span>
          </h1>
          <p className="text-sm font-medium text-green-100/80 max-w-sm leading-relaxed">
            Unlimited AI plant scans, personalized grow plans, and expert cannabis guidance in your pocket.
          </p>
        </div>
      </div>

      {/* ===== SCROLLABLE CONTENT ===== */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white">

        {/* Features Grid */}
        <div className="px-5 pt-6 pb-2">
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-gray-100">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 text-center">
              Everything You Get
            </p>
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <span className="text-lg leading-none mt-0.5">{f.icon}</span>
                  <div>
                    <p className="text-[11px] font-bold text-gray-800 leading-tight">{f.title}</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="px-5 py-5">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
            What growers are saying
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <TestimonialCard testimonial={TESTIMONIALS[testimonialIndex]} index={testimonialIndex} />
            <TestimonialCard testimonial={TESTIMONIALS[(testimonialIndex + 1) % TESTIMONIALS.length]} index={(testimonialIndex + 1) % TESTIMONIALS.length} />
          </div>
          <div className="flex justify-center gap-1.5 mt-2">
            {TESTIMONIALS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === testimonialIndex ? 'bg-green-600 w-4' : 'bg-gray-300 w-1.5'}`}
              />
            ))}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="px-5 pb-4 space-y-3">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 text-center">
            Choose Your Plan
          </p>
          {packages.map((pkg) => {
            const isSelected = selectedPkgIdentifier === pkg.identifier;
            const meta = getPlanMeta(pkg);
            const displayPrice = pkg.product.priceString;

            return (
              <div
                key={pkg.identifier}
                onClick={() => setSelectedPkgIdentifier(pkg.identifier)}
                className={`relative rounded-2xl border-2 p-4 transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? meta.emphasis
                      ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50/50 shadow-lg shadow-green-100/80'
                      : 'border-green-400 bg-green-50/40 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                {meta.badge && (
                  <div className={`absolute -top-3 left-5 ${meta.badgeColor} text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md`}>
                    {meta.badge}
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-0.5">
                      {pkg.packageType === 'WEEKLY' ? 'Weekly' : pkg.packageType === 'MONTHLY' ? 'Monthly' : 'Yearly'}
                    </p>
                    <p className={`font-black text-3xl tracking-tight ${isSelected ? 'text-green-700' : 'text-gray-900'}`}>
                      {displayPrice}
                    </p>
                    <p className="text-[11px] text-gray-500 font-semibold mt-0.5">
                      {meta.subtext}
                    </p>
                  </div>
                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected ? 'border-green-600 bg-green-600' : 'border-gray-250 bg-gray-50'
                  }`}>
                    {isSelected && <Check size={15} className="text-white" strokeWidth={3} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust elements */}
        <div className="px-5 pb-2 flex flex-col items-center gap-2">
          <div className="flex items-center gap-5 text-[11px] text-gray-500 font-medium">
            <span className="flex items-center gap-1">
              <Lock size={11} className="text-gray-400" /> Secure payment via Apple
            </span>
            <span className="flex items-center gap-1">
              <RotateCcw size={11} className="text-gray-400" /> Cancel anytime
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
            <Star size={11} className="text-amber-400 fill-amber-400" /> Premium AI grow guidance
          </div>
        </div>
      </div>

      {/* ===== STICKY BOTTOM CTA ===== */}
      <div className="flex-shrink-0 bg-white/90 backdrop-blur-md border-t border-gray-100 p-5 pb-8 z-50">
        <button
          onClick={handleStartTrial}
          disabled={isPurchasing || !selectedPkgIdentifier}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-black text-[17px] py-4 rounded-2xl shadow-lg shadow-green-200/50 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:shadow-none"
        >
          {isPurchasing && error?.includes('Activating') ? (
            <span className="animate-pulse">{error}</span>
          ) : isPurchasing ? (
            <span className="animate-pulse">Processing...</span>
          ) : trialEligible ? (
            <>Start Free Trial <ArrowRight strokeWidth={3} size={20} /></>
          ) : (
            <>Subscribe Now <ArrowRight strokeWidth={3} size={20} /></>
          )}
        </button>

        <p className="text-center text-[12px] text-gray-600 font-semibold mt-3 leading-snug">
          {getSubtext()}
        </p>

        <div className="flex justify-center items-center gap-2 mt-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
          <button onClick={() => openLink('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')} className="hover:text-green-600 transition-colors px-1 py-0.5">
            Terms
          </button>
          <span className="text-gray-300">•</span>
          <button onClick={() => openLink('https://www.mastergrowbot.com/privacy-policy')} className="hover:text-green-600 transition-colors px-1 py-0.5">
            Privacy
          </button>
          <span className="text-gray-300">•</span>
          <button onClick={handleRestore} className="hover:text-green-600 transition-colors px-1 py-0.5">
            Restore Purchases
          </button>
        </div>
      </div>

      {/* Error toast */}
      {error && !error.includes('Activating') && (
        <div className="absolute top-4 left-4 right-4 bg-red-500 text-white p-3.5 rounded-xl text-center text-xs font-bold shadow-xl z-[70]">
          {error}
        </div>
      )}
    </div>
  );
};

export default Paywall;
