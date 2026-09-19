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
import { getLibraryConfig, safeConfig, recordEvent } from '../services/premiumLibrary';

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
  const [features,setFeatures]=useState(safeConfig);
  useEffect(()=>{recordEvent('paywall_view','premium');void getLibraryConfig().then(setFeatures);},[]);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [verificationFailed, setVerificationFailed] = useState(false);
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
    setVerificationFailed(false);
    if (!hasPremiumAccess(info)) return false;
    let allowed;
    try { allowed = await checkVideoAccess(); }
    catch (cause) { setVerificationFailed(true); throw cause; }
    if (!allowed) {
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
        catch (cause: any) { setNotice(cause?.message || 'Could not verify Premium access. Please retry verification.'); }
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
    if (operation.current || pending || verificationFailed) return;
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
      recordEvent('purchase_attempt','premium');
      // Apple owns the payment sheet's lifetime. A JS timeout cannot cancel it.
      const result = await Purchases.purchasePackage({ aPackage: pkg });
      recordEvent('purchase_success','premium');
      const customerInfo = await refresh(Purchases, result.customerInfo);
      if (await confirmAccess(customerInfo)) {
        return;
      } else {
        setPending(true);
        setNotice(premiumStatusMessage(customerInfo));
      }
    } catch (cause: any) {
      recordEvent(isPurchaseCancelled(cause)?'purchase_cancelled':'purchase_failed','premium');
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
      <div className="flex items-center px-5 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3">
        <button onClick={onClose} disabled={busy} aria-label="Close Premium" className="p-3 rounded-full bg-white/10 disabled:opacity-40"><ArrowLeft size={20} /></button>
        <span className="ml-auto text-[10px] font-black tracking-[0.2em] text-emerald-300">MASTERGROWBOT AI PREMIUM</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-500/25 to-cyan-400/10 border border-emerald-300/20 p-3 mt-1 mb-3">
          <h1 className="text-xl font-black leading-tight">Everything in Pro.<br />More ways to explore.</h1>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">Video check-ins{features.uploads?' · Private journal files':''}{features.catalog && features.catalogCount===300?' · Double the strains: 600 profiles':''}</p>
          <p className="text-xs font-semibold text-emerald-200 mt-2">One subscription. Pro included.</p>
        </div>

        {loading ? <div className="py-12 text-center text-sm text-slate-300">Loading localized App Store prices…</div> : (
          <div className="space-y-3" data-testid="premium-plans">
            {packages.map(pkg => (
              <button key={pkg.identifier} disabled={busy} aria-pressed={selected === pkg.identifier} onClick={() => {setSelected(pkg.identifier);recordEvent('plan_selected','premium');}} className={`w-full text-left rounded-2xl p-3 border transition ${selected === pkg.identifier ? 'bg-emerald-400/15 border-emerald-400' : 'bg-white/[0.04] border-white/10'}`}>
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

        <div className="space-y-3 my-5">
          {[
            {title:'See more with video',detail:'Review multiple angles in one short check-in.'},
            ...(features.uploads?[{title:'Keep your records together',detail:'Save PDFs, spreadsheets and documents privately in Journal.'}]:[{title:'First access to new Premium features',detail:'Explore new Premium tools as they are released. No release dates are promised.'}]),
            ...(features.catalog && features.catalog && features.catalogCount===300?[{title:'Double the strains',detail:'Explore 600 reference profiles—300 more than Pro.'}]:[]),
            {title:'Everything in Pro included',detail:'One Premium subscription. Your Pro features come with it.'},
          ].map(item => (
            <div key={item.title} className="rounded-2xl bg-white/[0.06] border border-white/10 p-4 flex gap-3 text-slate-200">
              <Check size={18} className="text-emerald-400 shrink-0 mt-0.5" /><div><p className="text-sm font-bold">{item.title}</p><p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.detail}</p></div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 p-4 mb-5 text-sm"><p className="text-xs text-emerald-300 font-bold">EXAMPLE WORKFLOW</p><p className="mt-2 text-slate-200">Save a check-in → add your records → revisit what changed.</p><p className="text-xs text-slate-400 mt-2">Illustrative example, not a personal analysis.</p></div>

        <div className="mt-5 rounded-2xl bg-white/5 p-4 text-sm"><p className="font-bold text-slate-300 text-xs mb-2">FEEDBACK ABOUT MASTERGROWBOT</p><blockquote className="text-slate-200">“As a first-time grower I was totally lost. MasterGrowbot walked me through everything.”</blockquote><p className="text-xs text-slate-400 mt-2">Sarah K. · Feedback about the app, not specifically Premium</p></div>
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

      <div className="shrink-0 border-t border-white/10 bg-slate-950/95 px-5 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
        {!pending && selectedPackage && <p className="mb-2 text-center text-sm font-semibold text-slate-200">{selectedPackage.product.priceString} total per {periodFor(selectedPackage)} • Pro included</p>}
        <button onClick={pending || verificationFailed ? checkStatus : purchase} disabled={busy || loading || (!pending && !verificationFailed && !selected)} className="w-full rounded-2xl bg-indigo-500 text-white py-3 font-black disabled:opacity-50 flex justify-center items-center gap-2">
          {busy ? 'Checking subscription…' : verificationFailed ? 'Retry verification' : pending ? 'Check status' : <><Film size={19} /> Continue with Premium</>}
        </button>
        <p className="text-[10px] text-slate-400 text-center mt-2 leading-relaxed">Auto-renews until canceled. Apple confirms billing adjustments and when your plan starts.</p>
        <div className="flex flex-wrap justify-center gap-x-3 mt-2 text-xs text-slate-300 font-bold">
          <button onClick={restore} disabled={busy} className="min-h-11 flex items-center gap-1"><RotateCcw size={13} /> Restore Purchases</button>
          <button className="min-h-11 px-1" onClick={() => openLink('https://www.mastergrowbot.com/terms-of-service')}>Terms</button>
          <button className="min-h-11 px-1" onClick={() => openLink('https://www.mastergrowbot.com/privacy-policy')}>Privacy</button>
        </div>

      </div>
    </div>
  );
};

export default PremiumPaywall;
