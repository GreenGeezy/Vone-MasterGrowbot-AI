import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  hasPendingPremiumPurchase,
  markPremiumPurchasePending,
  RevenueCatBinding,
  rollbackPremiumRevenueCatBinding,
} from '../services/revenueCatIdentity';
import { checkVideoAccess } from '../services/videoAnalysisService';
import { isPurchaseCancelled, premiumStatusMessage, purchaseErrorMessage, refreshPremiumCustomer } from '../services/premiumPurchaseStatus';

interface PremiumPaywallProps {
  onClose: () => void;
  onUnlocked: () => void;
  requireRestore?: boolean;
}

const labelFor = (pkg: PurchasesPackage) =>
  pkg.identifier === 'weekly' ? 'Weekly' : pkg.identifier === 'monthly' ? 'Monthly' : 'Yearly';

const periodFor = (pkg: PurchasesPackage) =>
  pkg.identifier === 'weekly' ? 'week' : pkg.identifier === 'monthly' ? 'month' : 'year';

const PremiumPaywall: React.FC<PremiumPaywallProps> = ({ onClose, onUnlocked, requireRestore = false }) => {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const operation = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const statusPanel = useRef<HTMLDivElement>(null);
  const unlocked = useRef(onUnlocked);
  unlocked.current = onUnlocked;
  useEffect(() => {
    if (error || notice) statusPanel.current?.scrollIntoView({ block: 'nearest' });
  }, [error, notice]);

  const refresh = async (Purchases: any, initial?: any) => refreshPremiumCustomer({
    invalidateCustomerInfoCache: () => withTimeout(Purchases.invalidateCustomerInfoCache(), 5000, 'Refresh subscription'),
    getCustomerInfo: () => withTimeout(Purchases.getCustomerInfo(), 8000, 'Subscription status'),
  }, initial);

  const confirmAccess = async (info: any): Promise<boolean> => {
    if (!hasPremiumAccess(info)) return false;
    if (!await checkVideoAccess()) {
      setPending(false);
      setNotice('Premium is not linked to your current app session. Use Restore Purchases to verify your store account, or choose a plan if you do not have Premium.');
      return false;
    }
    await completePremiumRevenueCatBinding(info);
    if (mounted.current) unlocked.current();
    return true;
  };

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
      if (!(await Purchases.isConfigured()).isConfigured) await initializeSubscriptions();
      const awaitingVerification = await hasPendingPremiumPurchase();
      setPending(awaitingVerification);
      const [offerings, { customerInfo }] = await Promise.all([
        withTimeout(Purchases.getOfferings(), 8000, 'Premium plans'),
        withTimeout(Purchases.getCustomerInfo(), 8000, 'Subscription status'),
      ]);
      const offering = offerings.all[PREMIUM_OFFERING];
      const verified = validatedPremiumPackages((offering?.availablePackages || []) as any) as PurchasesPackage[];
      if (verified.length !== 3) throw new Error('Premium plans are not available from the App Store yet. Please try again shortly.');
      const cadence = preferredPremiumCadence(customerInfo);
      setPackages(verified);
      setSelected(cadence && verified.some(pkg => pkg.identifier === cadence) ? cadence : null);
      if (awaitingVerification) setNotice(premiumStatusMessage(customerInfo));
      if (requireRestore) setNotice('Your video is ready. Restore Premium or choose a plan to continue.');
      setLoading(false);
      if (!requireRestore && hasPremiumAccess(customerInfo)) {
        operation.current = true; setBusy(true);
        try { await confirmAccess(customerInfo); }
        catch { setNotice('Could not verify Premium access. Check your connection and use Check status or Restore Purchases.'); setPending(true); }
        finally { operation.current = false; setBusy(false); }
      }
    } catch (cause: any) {
      setError(cause?.message || 'Could not load Premium plans.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    let remove: (() => Promise<unknown>) | undefined;
    import('@revenuecat/purchases-capacitor').then(async ({ Purchases }) => {
      const id = await Purchases.addCustomerInfoUpdateListener(info => {
        if (!disposed && !operation.current && !requireRestore && hasPremiumAccess(info)) {
          operation.current = true;
          checkVideoAccess().then(async allowed => {
            if (allowed && !disposed) {
              await completePremiumRevenueCatBinding(info);
              if (!disposed) unlocked.current();
            }
          }).catch(() => {}).finally(() => { operation.current = false; });
        }
      });
      remove = () => Purchases.removeCustomerInfoUpdateListener({ listenerToRemove: id });
      if (disposed) await remove();
    }).catch(() => { /* Manual status refresh remains available. */ });
    return () => { disposed = true; remove?.().catch(() => {}); };
  }, []);

  const savings = useMemo(() => {
    const monthly = packages.find(pkg => pkg.identifier === 'monthly');
    const annual = packages.find(pkg => pkg.identifier === 'annual');
    return monthly && annual ? annualSavingsPercent(monthly.product as any, annual.product as any) : null;
  }, [packages]);
  const selectedPackage = packages.find(pkg => pkg.identifier === selected);

  const purchase = async () => {
    if (operation.current || pending) return;
    const pkg = packages.find(item => item.identifier === selected);
    if (!pkg) return;
    if (!Capacitor.isNativePlatform()) { setNotice('Purchases are available in the iOS app through Apple.'); return; }
    operation.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    let binding: RevenueCatBinding | null = null;
    let storeStarted = false;
    const wasPending = await hasPendingPremiumPurchase().catch(() => true);
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      binding = await beginPremiumRevenueCatBinding(Purchases);
      await markPremiumPurchasePending();
      storeStarted = true;
      // Apple owns the payment sheet's lifetime. A JS timeout cannot cancel it.
      const result = await Purchases.purchasePackage({ aPackage: pkg });
      const customerInfo = await refresh(Purchases, result.customerInfo);
      if (await confirmAccess(customerInfo)) {
        return;
      } else {
        setPending(true);
        setNotice(premiumStatusMessage(customerInfo));
      }
    } catch (cause: any) {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      if (!wasPending && (!storeStarted || isPurchaseCancelled(cause))) {
        try { await rollbackPremiumRevenueCatBinding(Purchases, binding); } catch { /* retained for startup recovery */ }
      } else {
        setPending(true);
      }
      if (!isPurchaseCancelled(cause)) setError(purchaseErrorMessage(cause));
    } finally {
      operation.current = false;
      setBusy(false);
    }
  };

  const restore = async () => {
    if (operation.current || !Capacitor.isNativePlatform()) return;
    operation.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    let binding: RevenueCatBinding | null = null;
    const wasPending = await hasPendingPremiumPurchase().catch(() => true);
    let storeStarted = false;
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      binding = await beginPremiumRevenueCatBinding(Purchases);
      await markPremiumPurchasePending();
      storeStarted = true;
      const restored = await Purchases.restorePurchases();
      const customerInfo = await refresh(Purchases, restored.customerInfo);
      if (await confirmAccess(customerInfo)) {
        return;
      } else {
        // A returned receipt may still be processing. Keep this identity so
        // delayed updates and the backend agree about the receipt's owner.
        setPending(true);
        setNotice(premiumStatusMessage(customerInfo, true));
      }
    } catch (cause: any) {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      if (!storeStarted && !wasPending) {
        try { await rollbackPremiumRevenueCatBinding(Purchases, binding); } catch { /* recovered at next launch */ }
      }
      setPending(wasPending || storeStarted);
      if (!isPurchaseCancelled(cause)) setError(purchaseErrorMessage(cause));
    } finally { operation.current = false; setBusy(false); }
  };

  const checkStatus = async () => {
    if (operation.current || !Capacitor.isNativePlatform()) return;
    operation.current = true;
    setBusy(true);
    setError(null);
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const customerInfo = await refresh(Purchases);
      if (await confirmAccess(customerInfo)) return;
      else setNotice(premiumStatusMessage(customerInfo, true));
    } catch (cause) { setError(purchaseErrorMessage(cause)); }
    finally { operation.current = false; setBusy(false); }
  };

  const openLink = async (url: string) => {
    try { await Browser.open({ url }); } catch { window.open(url, '_blank'); }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950 text-white flex flex-col overflow-hidden" data-testid="premium-paywall">
      <div className="flex items-center px-5 pt-[max(3rem,env(safe-area-inset-top,0px))] pb-3">
        <button onClick={onClose} disabled={busy} aria-label="Close Premium" className="p-3 rounded-full bg-white/10 disabled:opacity-40"><ArrowLeft size={20} /></button>
        <span className="ml-auto text-[10px] font-black tracking-[0.2em] text-emerald-300">MASTERGROWBOT AI PREMIUM</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-500/25 to-cyan-400/10 border border-emerald-300/20 p-6 mt-2">
          <Sparkles className="text-emerald-300 mb-4" />
          <h1 className="text-3xl font-black leading-tight">See more of your grow.<br />Catch visible concerns earlier.</h1>
          <p className="text-sm text-slate-300 mt-3 leading-relaxed">Review leaves, canopy, and the surrounding grow space from multiple angles in one short video. Every Premium plan includes all Pro features.</p>
          <p className="text-sm font-semibold text-emerald-200 mt-3">The displayed price is your total Premium subscription price and includes Pro. Apple confirms any billing adjustment and when your plan changes.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 my-5">
          {['Check multiple angles', 'Spot visible stress patterns', 'Review canopy and grow space', 'Save clear next steps'].map(item => (
            <div key={item} className="rounded-2xl bg-white/[0.06] border border-white/10 p-3 flex gap-2 text-xs font-semibold text-slate-200">
              <Check size={15} className="text-emerald-400 shrink-0" /> {item}
            </div>
          ))}
        </div>

        {loading ? <div className="py-12 text-center text-sm text-slate-300">Loading localized App Store prices…</div> : (
          <div className="space-y-3" data-testid="premium-plans">
            {packages.map(pkg => (
              <button key={pkg.identifier} disabled={busy || pending} aria-pressed={selected === pkg.identifier} onClick={() => setSelected(pkg.identifier)} className={`w-full text-left rounded-2xl p-4 border transition ${selected === pkg.identifier ? 'bg-emerald-400/15 border-emerald-400' : 'bg-white/[0.04] border-white/10'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><span className="font-black">{labelFor(pkg)}</span>{pkg.identifier === 'annual' && savings && <span className="rounded-full bg-emerald-400 text-slate-950 px-2 py-0.5 text-[10px] font-black">SAVE {savings}% VS MONTHLY</span>}</div>
                    <p className="text-sm text-slate-300 mt-1">{pkg.product.priceString} total per {periodFor(pkg)} · Pro included</p>
                  </div>
                  <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${selected === pkg.identifier ? 'bg-emerald-400 border-emerald-400' : 'border-slate-500'}`}>{selected === pkg.identifier && <Check size={15} className="text-slate-950" />}</div>
                </div>
              </button>
            ))}
            {!selected && packages.length > 0 && <p className="text-xs text-amber-200 text-center">Choose the Premium billing period you prefer.</p>}
          </div>
        )}

        <div ref={statusPanel}>
        {error && <div role="alert" className="mt-4 rounded-xl bg-red-500/15 border border-red-400/30 p-3 text-xs text-red-100">{error}</div>}
        {notice && <div role="status" className="mt-4 rounded-xl bg-amber-400/10 border border-amber-300/30 p-3 text-xs text-amber-100 leading-relaxed">{notice}</div>}
        {!loading && packages.length === 0 && <button onClick={load} disabled={busy} className="mt-3 p-3 text-sm underline">Reload plans</button>}
        {(pending || error || notice) && <div className="flex flex-wrap gap-3 mt-4 text-xs">
          <button onClick={() => openLink('https://apps.apple.com/account/subscriptions')} className="p-2 underline">Apple Subscriptions</button>
          <a href="mailto:support@mastergrowbot.com?subject=Premium%20purchase%20support" className="p-2 underline">Contact support</a>
        </div>}
        {pending && <button disabled={busy} onClick={() => { setPending(false); setNotice('Before trying again, confirm Apple Subscriptions does not show an active or scheduled Premium plan.'); }} className="mt-2 p-2 text-xs text-slate-300 underline">No Premium plan in Apple Subscriptions? Choose a plan</button>}
        </div>
      </div>

      <div className="border-t border-white/10 bg-slate-950/95 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        {!pending && selectedPackage && <p className="mb-2 text-center text-sm font-semibold text-slate-200">{selectedPackage.product.priceString} total per {periodFor(selectedPackage)} • Pro included</p>}
        <button onClick={pending ? checkStatus : purchase} disabled={busy || loading || (!pending && !selected)} className="w-full rounded-2xl bg-emerald-400 text-slate-950 py-4 font-black disabled:opacity-50 flex justify-center items-center gap-2">
          {busy ? 'Waiting for Apple…' : pending ? 'Check status' : <><Film size={19} /> Unlock video analysis</>}
        </button>
        <p className="text-[10px] text-slate-400 text-center mt-2 leading-relaxed">Apple confirms your price and when the plan starts before purchase. Premium unlocks once your subscription is active. Auto-renews until canceled.</p>
        <div className="flex flex-wrap justify-center gap-x-3 mt-2 text-xs text-slate-300 font-bold">
          <button onClick={restore} disabled={busy} className="min-h-11 flex items-center gap-1"><RotateCcw size={13} /> Restore Purchases</button>
          <button className="min-h-11 px-1" onClick={() => openLink('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>Terms</button>
          <button className="min-h-11 px-1" onClick={() => openLink('https://www.mastergrowbot.com/privacy-policy')}>Privacy</button>
        </div>
        <p className="flex items-center justify-center gap-1 text-[10px] text-slate-400"><Lock size={10} /> Secure payment through Apple</p>
      </div>
    </div>
  );
};

export default PremiumPaywall;
