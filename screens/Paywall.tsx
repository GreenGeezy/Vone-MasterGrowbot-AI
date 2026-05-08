import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  Check, Shield, Star, ArrowRight, Lock, RotateCcw
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
  'Unlimited AI plant diagnosis',
  'Personalized grow plan & tasks',
  '100+ strain database & guides',
  'Professional grow journal',
];

const TestimonialCard = memo(({ testimonial, index }: { testimonial: typeof TESTIMONIALS[0]; index: number }) => (
  <div
    key={index}
    className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex-shrink-0 w-[260px]"
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

/**
 * Check if user has ANY active subscription or entitlement.
 * RevenueCat may report subscriptions via activeSubscriptions even if
 * entitlements haven't synced yet (especially in sandbox).
 */
function hasAnyActiveSubscription(customerInfo: any): boolean {
  if (!customerInfo) return false;
  const hasEntitlements = Object.keys(customerInfo.entitlements?.active || {}).length > 0;
  const hasSubscriptions = (customerInfo.activeSubscriptions?.length || 0) > 0;
  const hasProducts = (customerInfo.allPurchasedProductIdentifiers?.length || 0) > 0;
  console.log('[Paywall] hasAnyActiveSubscription check:', { hasEntitlements, hasSubscriptions, hasProducts });
  return hasEntitlements || hasSubscriptions || hasProducts;
}

const Paywall: React.FC<PaywallProps> = ({ onClose, onPurchase }) => {
  const [selectedPkgIdentifier, setSelectedPkgIdentifier] = useState<string | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trialUsed, setTrialUsed] = useState(false);
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  // Auto-rotate testimonials every 4s
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

      // Force refresh offerings to avoid stale cache
      console.log('[Paywall] Forcing offerings refresh...');
      await Purchases.invalidateCustomerInfoCache();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('App Store connection timed out')), 8000)
      );
      const offeringsPromise = Purchases.getOfferings();
      const offerings = await Promise.race([offeringsPromise, timeoutPromise]) as any;

      console.log('[Paywall] Offerings loaded:', offerings);
      console.log('[Paywall] Current offering packages:', offerings.current?.availablePackages?.map((p: any) => ({
        identifier: p.identifier,
        packageType: p.packageType,
        productId: p?.product?.identifier,
        priceString: p?.product?.priceString,
      })));

      if (offerings.current?.availablePackages?.length > 0) {
        const pkgs = offerings.current.availablePackages;
        setPackages(pkgs);
        const annual = pkgs.find((p: any) => p.packageType === 'ANNUAL');
        setSelectedPkgIdentifier(annual ? annual.identifier : pkgs[0].identifier);

        const { customerInfo } = await Purchases.getCustomerInfo();
        console.log('[Paywall] CustomerInfo on load:', JSON.stringify(customerInfo, null, 2));
        console.log('[Paywall] Active entitlements keys:', Object.keys(customerInfo?.entitlements?.active || {}));
        console.log('[Paywall] Active subscriptions:', customerInfo?.activeSubscriptions);
        console.log('[Paywall] All purchased products:', customerInfo?.allPurchasedProductIdentifiers);
        console.log('[Paywall] originalAppUserId:', customerInfo?.originalAppUserId);
        console.log('[Paywall] originalPurchaseDate:', customerInfo?.originalPurchaseDate);

        // Trial eligibility: if they've ever purchased (originalPurchaseDate exists), trial is used
        const hasEverTrialed = !!customerInfo?.originalPurchaseDate;
        setTrialUsed(hasEverTrialed);
        console.log('[Paywall] Trial used:', hasEverTrialed);
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

      console.log('[Paywall] Purchasing package:', pkg.identifier, 'product:', (pkg as any)?.product?.identifier);
      console.log('[Paywall] Current appUserID before purchase:', await Purchases.getAppUserID());

      const purchaseResult = await Purchases.purchasePackage({ aPackage: pkg });
      console.log('[Paywall] Purchase result customerInfo:', JSON.stringify(purchaseResult.customerInfo, null, 2));
      console.log('[Paywall] Active entitlements after purchase:', Object.keys(purchaseResult.customerInfo?.entitlements?.active || {}));
      console.log('[Paywall] Active subscriptions after purchase:', purchaseResult.customerInfo?.activeSubscriptions);
      console.log('[Paywall] All purchased products after purchase:', purchaseResult.customerInfo?.allPurchasedProductIdentifiers);

      // Immediately check if purchase succeeded
      if (hasAnyActiveSubscription(purchaseResult.customerInfo)) {
        console.log('[Paywall] SUCCESS — subscription detected immediately after purchase');
        onPurchase();
        return;
      }

      // Invalidate cache and sync to get fresh state
      await Purchases.invalidateCustomerInfoCache();
      await Purchases.syncPurchases();

      // Fetch fresh customer info
      const { customerInfo: freshInfo } = await Purchases.getCustomerInfo();
      console.log('[Paywall] Fresh customerInfo after sync:', JSON.stringify(freshInfo, null, 2));
      console.log('[Paywall] Fresh active entitlements:', Object.keys(freshInfo?.entitlements?.active || {}));
      console.log('[Paywall] Fresh active subscriptions:', freshInfo?.activeSubscriptions);

      if (hasAnyActiveSubscription(freshInfo)) {
        console.log('[Paywall] SUCCESS — subscription detected after cache sync');
        onPurchase();
        return;
      }

      // SANDBOX RETRY: TestFlight can delay entitlement propagation
      // Retry up to 10 times with 2s delay (20 seconds total)
      console.log('[Paywall] No active subscription immediately. Starting sandbox retry (10 attempts)...');

      for (let attempt = 1; attempt <= 10; attempt++) {
        setError(`Activating your subscription... (${attempt}/10)`);
        await new Promise(r => setTimeout(r, 2000));

        await Purchases.invalidateCustomerInfoCache();
        await Purchases.syncPurchases();
        const { customerInfo: retryInfo } = await Purchases.getCustomerInfo();

        console.log(`[Paywall] Retry ${attempt} — customerInfo:`, JSON.stringify(retryInfo, null, 2));
        console.log(`[Paywall] Retry ${attempt} — active entitlements:`, Object.keys(retryInfo?.entitlements?.active || {}));
        console.log(`[Paywall] Retry ${attempt} — active subscriptions:`, retryInfo?.activeSubscriptions);
        console.log(`[Paywall] Retry ${attempt} — purchased products:`, retryInfo?.allPurchasedProductIdentifiers);

        if (hasAnyActiveSubscription(retryInfo)) {
          console.log('[Paywall] SUCCESS on retry', attempt);
          setError(null);
          onPurchase();
          return;
        }
      }

      // All retries exhausted — show failure
      console.error('[Paywall] All 10 retries exhausted. No active subscription found.');
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
        console.log('[Paywall] Starting restore purchases...');
        console.log('[Paywall] Current appUserID:', await Purchases.getAppUserID());

        await Purchases.restorePurchases();
        await Purchases.invalidateCustomerInfoCache();
        await Purchases.syncPurchases();

        const { customerInfo } = await Purchases.getCustomerInfo();
        console.log('[Paywall] Restore — customerInfo:', JSON.stringify(customerInfo, null, 2));
        console.log('[Paywall] Restore — active entitlements:', Object.keys(customerInfo?.entitlements?.active || {}));
        console.log('[Paywall] Restore — active subscriptions:', customerInfo?.activeSubscriptions);
        console.log('[Paywall] Restore — purchased products:', customerInfo?.allPurchasedProductIdentifiers);

        if (hasAnyActiveSubscription(customerInfo)) {
          alert('Success! Your subscription has been restored.');
          onPurchase();
        } else {
          alert('No active subscription found to restore.');
        }
      }
    } catch (e) {
      console.error('[Paywall] Restore error:', e);
      alert('Failed to restore purchases. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const openLink = async (url: string) => {
    try { await Browser.open({ url }); } catch { window.open(url, '_blank'); }
  };

  const selectedPkg = packages.find(p => p.identifier === selectedPkgIdentifier);

  const getSubtext = () => {
    if (!selectedPkg) return '';
    const price = selectedPkg.product.priceString;
    let period = 'month';
    if (selectedPkg.packageType === 'WEEKLY') period = 'week';
    if (selectedPkg.packageType === 'ANNUAL') period = 'year';
    if (trialUsed) {
      return `Auto-renews at ${price}/${period} unless canceled.`;
    }
    return `3-day free trial, then ${price}/${period} unless canceled.`;
  };

  const getPlanMeta = (pkg: any) => {
    if (pkg.packageType === 'ANNUAL') {
      return {
        badge: 'BEST VALUE',
        badgeColor: 'bg-green-600',
        subtext: 'Just $1.92/week • Save over 60%',
        emphasis: true,
      };
    }
    if (pkg.packageType === 'MONTHLY') {
      return {
        badge: 'MOST POPULAR',
        badgeColor: 'bg-amber-500',
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
      <div className="relative flex-shrink-0 bg-green-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1596791836043-982c75908b89?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80')] bg-cover bg-center opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-900/85 to-green-900" />
        <div className="relative px-6 pt-10 pb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-white/15 backdrop-blur text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Shield size={10} className="text-green-300" /> Trusted by Elite Growers
            </span>
          </div>
          <h1 className="text-3xl sm:text-[2.5rem] font-black leading-[1.15] mb-3 tracking-tight">
            Don't Lose Your Harvest
          </h1>
          <p className="text-sm font-medium text-green-100/85 max-w-sm leading-relaxed">
            AI detects cannabis plant problems before they damage your grow
          </p>
        </div>
      </div>

      {/* ===== SCROLLABLE CONTENT ===== */}
      <div className="flex-1 overflow-y-auto">

        {/* Features */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex flex-wrap gap-2">
            {FEATURES.map((f, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-[11px] font-bold px-3 py-1.5 rounded-full border border-green-100"
              >
                <Check size={12} className="text-green-500" strokeWidth={3} />
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="px-6 py-5">
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
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === testimonialIndex ? 'bg-green-600 w-4' : 'bg-gray-300'}`}
              />
            ))}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="px-6 pb-4 space-y-3">
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
                      ? 'border-green-600 bg-green-50/60 shadow-lg shadow-green-100'
                      : 'border-green-500 bg-green-50/40 shadow-md'
                    : 'border-gray-150 bg-white hover:border-gray-300'
                }`}
              >
                {meta.badge && (
                  <div className={`absolute -top-3 left-5 ${meta.badgeColor} text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md`}>
                    {meta.badge}
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                        {pkg.packageType === 'WEEKLY' ? 'Weekly' : pkg.packageType === 'MONTHLY' ? 'Monthly' : 'Yearly'}
                      </p>
                    </div>
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

        {/* Trust elements above CTA */}
        <div className="px-6 pb-2 flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
            <Lock size={12} className="text-gray-400" />
            Secure payment via Apple
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
            <RotateCcw size={12} className="text-gray-400" />
            Cancel anytime in App Store settings
          </div>
        </div>
      </div>

      {/* ===== STICKY BOTTOM CTA ===== */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 p-5 pb-8 z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
        <button
          onClick={handleStartTrial}
          disabled={isPurchasing || !selectedPkgIdentifier}
          className="w-full bg-green-600 text-white font-black text-[17px] py-4 rounded-2xl shadow-lg shadow-green-200/40 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:shadow-none"
        >
          {isPurchasing && error?.includes('Activating') ? (
            <span className="animate-pulse">{error}</span>
          ) : isPurchasing ? (
            <span className="animate-pulse">Processing...</span>
          ) : trialUsed ? (
            <>Subscribe Now <ArrowRight strokeWidth={3} size={20} /></>
          ) : (
            <>Start 3-Day Free Trial <ArrowRight strokeWidth={3} size={20} /></>
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

      {/* Error toast — only non-retry errors */}
      {error && !error.includes('Activating') && (
        <div className="absolute top-4 left-4 right-4 bg-red-500 text-white p-3.5 rounded-xl text-center text-xs font-bold shadow-xl z-[70]">
          {error}
        </div>
      )}
    </div>
  );
};

export default Paywall;
