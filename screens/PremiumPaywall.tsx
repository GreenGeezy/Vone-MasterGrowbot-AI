import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Film, Lock, RotateCcw, Sparkles } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { initializeSubscriptions, withTimeout } from '../services/appInitializer';
import {
  annualSavingsPercent,
  hasPremiumAccess,
  PREMIUM_OFFERING,
  preferredPremiumCadence,
  validatedPremiumPackages,
} from '../services/premiumCatalog';
import {
  beginPremiumRevenueCatBinding,
  completePremiumRevenueCatBinding,
  RevenueCatBinding,
  rollbackPremiumRevenueCatBinding,
} from '../services/revenueCatIdentity';

interface PremiumPaywallProps {
  onClose: () => void;
  onUnlocked: () => void;
}

const labelFor = (pkg: PurchasesPackage) =>
  pkg.identifier === 'weekly' ? 'Weekly' : pkg.identifier === 'monthly' ? 'Monthly' : 'Yearly';

const periodFor = (pkg: PurchasesPackage) =>
  pkg.identifier === 'weekly' ? 'week' : pkg.identifier === 'monthly' ? 'month' : 'year';

const PremiumPaywall: React.FC<PremiumPaywallProps> = ({ onClose, onUnlocked }) => {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!Capacitor.isNativePlatform()) {
        const mock = [
          { identifier: 'weekly', product: { identifier: 'mastergrowbot_premium_weekly_v1', price: 12.99, priceString: '$12.99', currencyCode: 'USD' } },
          { identifier: 'monthly', product: { identifier: 'mastergrowbot_premium_monthly_v1', price: 49.99, priceString: '$49.99', currencyCode: 'USD' } },
          { identifier: 'annual', product: { identifier: 'mastergrowbot_premium_yearly_v1', price: 199, priceString: '$199.00', currencyCode: 'USD' } },
        ] as PurchasesPackage[];
        setPackages(mock);
        setSelected('annual');
        return;
      }

      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      await initializeSubscriptions();
      const [offerings, { customerInfo }] = await Promise.all([
        withTimeout(Purchases.getOfferings(), 8000, 'Premium plans'),
        withTimeout(Purchases.getCustomerInfo(), 8000, 'Subscription status'),
      ]);
      if (hasPremiumAccess(customerInfo)) {
        onUnlocked();
        return;
      }
      const offering = offerings.all[PREMIUM_OFFERING];
      const verified = validatedPremiumPackages((offering?.availablePackages || []) as any) as PurchasesPackage[];
      if (verified.length !== 3) throw new Error('Premium plans are not available from the App Store yet. Please try again shortly.');
      const cadence = preferredPremiumCadence(customerInfo);
      setPackages(verified);
      setSelected(cadence && verified.some(pkg => pkg.identifier === cadence) ? cadence : null);
    } catch (cause: any) {
      setError(cause?.message || 'Could not load Premium plans.');
    } finally {
      setLoading(false);
    }
  }, [onUnlocked]);

  useEffect(() => { load(); }, [load]);

  const savings = useMemo(() => {
    const monthly = packages.find(pkg => pkg.identifier === 'monthly');
    const annual = packages.find(pkg => pkg.identifier === 'annual');
    return monthly && annual ? annualSavingsPercent(monthly.product as any, annual.product as any) : null;
  }, [packages]);

  const purchase = async () => {
    const pkg = packages.find(item => item.identifier === selected);
    if (!pkg) return;
    if (!Capacitor.isNativePlatform()) { onUnlocked(); return; }
    setBusy(true);
    setError(null);
    let binding: RevenueCatBinding | null = null;
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      binding = await beginPremiumRevenueCatBinding(Purchases);
      const { customerInfo } = await withTimeout(Purchases.purchasePackage({ aPackage: pkg }), 60000, 'Apple purchase');
      await completePremiumRevenueCatBinding(customerInfo);
      onUnlocked();
    } catch (cause: any) {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      try {
        const { customerInfo } = await Purchases.getCustomerInfo();
        if (hasPremiumAccess(customerInfo)) {
          await completePremiumRevenueCatBinding(customerInfo);
          onUnlocked();
          return;
        }
        await rollbackPremiumRevenueCatBinding(Purchases, binding);
      } catch { /* startup recovery will resolve an interrupted binding */ }
      if (!cause?.userCancelled) setError(cause?.message || 'The purchase could not be completed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (!Capacitor.isNativePlatform()) return;
    setBusy(true);
    setError(null);
    let binding: RevenueCatBinding | null = null;
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      binding = await beginPremiumRevenueCatBinding(Purchases);
      const { customerInfo } = await withTimeout(Purchases.restorePurchases(), 30000, 'Restore purchases');
      if (!hasPremiumAccess(customerInfo)) throw new Error('No active MasterGrowbot AI Premium purchase was found.');
      await completePremiumRevenueCatBinding(customerInfo);
      onUnlocked();
    } catch (cause: any) {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      try { await rollbackPremiumRevenueCatBinding(Purchases, binding); } catch { /* recovered at next launch */ }
      setError(cause?.message || 'Restore Purchases could not be completed.');
    } finally { setBusy(false); }
  };

  const openLink = async (url: string) => {
    try { await Browser.open({ url }); } catch { window.open(url, '_blank'); }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950 text-white flex flex-col overflow-hidden" data-testid="premium-paywall">
      <div className="flex items-center px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3">
        <button onClick={onClose} aria-label="Close Premium" className="p-2 rounded-full bg-white/10"><ArrowLeft size={20} /></button>
        <span className="ml-auto text-[10px] font-black tracking-[0.2em] text-emerald-300">MASTERGROWBOT AI PREMIUM</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-500/25 to-cyan-400/10 border border-emerald-300/20 p-6 mt-2">
          <Sparkles className="text-emerald-300 mb-4" />
          <h1 className="text-3xl font-black leading-tight">See the whole plant,<br />not one frame.</h1>
          <p className="text-sm text-slate-300 mt-3 leading-relaxed">Everything in Pro, plus Premium Video Plant Analysis for broader visual context across multiple angles.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 my-5">
          {['Record or upload video', 'Up to 20 seconds', 'Visible-sign observations', 'Private transient processing'].map(item => (
            <div key={item} className="rounded-2xl bg-white/[0.06] border border-white/10 p-3 flex gap-2 text-xs font-semibold text-slate-200">
              <Check size={15} className="text-emerald-400 shrink-0" /> {item}
            </div>
          ))}
        </div>

        {loading ? <div className="py-12 text-center text-sm text-slate-300">Loading localized App Store prices…</div> : (
          <div className="space-y-3" data-testid="premium-plans">
            {packages.map(pkg => (
              <button key={pkg.identifier} onClick={() => setSelected(pkg.identifier)} className={`w-full text-left rounded-2xl p-4 border transition ${selected === pkg.identifier ? 'bg-emerald-400/15 border-emerald-400' : 'bg-white/[0.04] border-white/10'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2"><span className="font-black">{labelFor(pkg)}</span>{pkg.identifier === 'annual' && savings && <span className="rounded-full bg-emerald-400 text-slate-950 px-2 py-0.5 text-[9px] font-black">SAVE {savings}% VS MONTHLY</span>}</div>
                    <p className="text-xs text-slate-400 mt-1">{pkg.product.priceString} per {periodFor(pkg)}</p>
                  </div>
                  <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${selected === pkg.identifier ? 'bg-emerald-400 border-emerald-400' : 'border-slate-500'}`}>{selected === pkg.identifier && <Check size={15} className="text-slate-950" />}</div>
                </div>
              </button>
            ))}
            {!selected && packages.length > 0 && <p className="text-xs text-amber-200 text-center">Choose the Premium billing period you prefer.</p>}
          </div>
        )}

        {error && <div role="alert" className="mt-4 rounded-xl bg-red-500/15 border border-red-400/30 p-3 text-xs text-red-100">{error}</div>}
      </div>

      <div className="border-t border-white/10 bg-slate-950/95 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        <button onClick={purchase} disabled={busy || loading || !selected} className="w-full rounded-2xl bg-emerald-400 text-slate-950 py-4 font-black disabled:opacity-50 flex justify-center items-center gap-2">
          {busy ? 'Waiting for Apple…' : <><Film size={19} /> Upgrade with Apple</>}
        </button>
        <p className="text-[10px] text-slate-400 text-center mt-2 leading-relaxed">Upgrading activates MasterGrowbot AI Premium through your Apple subscription. Apple confirms the billing terms before purchase. Auto-renews until canceled.</p>
        <div className="flex justify-center gap-3 mt-3 text-[10px] text-slate-400 font-bold">
          <button onClick={restore} disabled={busy} className="flex items-center gap-1"><RotateCcw size={11} /> Restore Purchases</button>
          <button onClick={() => openLink('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>Terms</button>
          <button onClick={() => openLink('https://www.mastergrowbot.com/privacy-policy')}>Privacy</button>
          <span className="flex items-center gap-1"><Lock size={10} /> Apple payment</span>
        </div>
      </div>
    </div>
  );
};

export default PremiumPaywall;
