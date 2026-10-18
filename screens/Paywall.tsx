import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Check, ArrowRight} from 'lucide-react';
import {Capacitor} from '@capacitor/core';
import {Browser} from '@capacitor/browser';
import Growbot from '../components/Growbot';
import PaywallTestimonials from '../components/PaywallTestimonials';
import {growerBenefits} from '../services/growerBenefits';
import {readOnboarding} from '../services/onboardingState';
import {annualComparison} from '../services/androidPlans';
import {configureRevenueCat,loadRevenueCatPlans,purchaseRevenueCatPlan,restoreRevenueCatPurchases,hasVerifiedSubscription,getStartupSubscriptionStatus,getRevenueCatUserFacingError} from '../services/revenueCatService';
import {pendingProPurchase,markProPurchasePending} from '../services/proPurchaseRecovery';
import {recordEvent,setAnalyticsReceipt} from '../services/conversionEvents';
import {PLAY_SUBSCRIPTIONS_URL} from '../services/support';
import type {UserProfile} from '../types';
export default function Paywall({profile,onClose,onPurchase}:{profile?:Partial<UserProfile>|null;onClose:()=>void;onPurchase:()=>void;onSkip:()=>void}) {
 const benefits=growerBenefits(profile||readOnboarding().profile);
 const [packages,setPackages]=useState<any[]>([]),[selectedPkgIdentifier,setSelectedPkgIdentifier]=useState<string|null>(null);
 const [loading,setLoading]=useState(true),[isPurchasing,setIsPurchasing]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState<string|null>(null);
 const operation=useRef(false);
 const loadProducts=useCallback(async(recover=false)=>{
  setLoading(true);setError(null);
  try {
   setPending(await pendingProPurchase());
   let plans:any[]=[];
   if(Capacitor.isNativePlatform()) plans=(await loadRevenueCatPlans({recoverBeforeLoad:recover})).packages;
   else if(import.meta.env.DEV) {
    const trial=!['ineligible','unknown'].includes(new URLSearchParams(location.search).get('trial')||'');
    plans=[{identifier:'preview_annual',packageType:'ANNUAL',trialDays:trial?3:null,product:{price:59.99,currencyCode:'USD',priceString:'$59.99'}},{identifier:'preview_weekly',packageType:'WEEKLY',trialDays:trial?3:null,product:{price:6.99,currencyCode:'USD',priceString:'$6.99'}}];
   }
   if(!plans.length)throw new Error('Google Play plans are unavailable. Please retry.');
   setPackages(plans);setSelectedPkgIdentifier((plans.find(p=>p.packageType==='ANNUAL')||plans[0]).identifier);
  } catch(e) {setError(getRevenueCatUserFacingError(e).message);}finally{setLoading(false);}
 },[]);
 useEffect(()=>{void loadProducts();recordEvent('paywall_view','pro');},[loadProducts]);
 const finish=async(info:any)=>{if(!hasVerifiedSubscription(info))return false;await markProPurchasePending(false);setPending(false);setAnalyticsReceipt(info);recordEvent('purchase_success','pro',{outcome:'entitlement_verified'});onPurchase();return true;};
 const checkPending=async()=>{
  if(operation.current)return;operation.current=true;setIsPurchasing(true);setError(null);
  try {const result=await getStartupSubscriptionStatus();if(!await finish(result.customerInfo))setError('Google Play has not confirmed access yet. Check your subscription or restore purchases.');}
  catch{setError('Subscription verification could not finish. Please retry.');}finally{operation.current=false;setIsPurchasing(false);}
 };
 const handleStartTrial=async()=>{
  if(operation.current||pending)return;const plan=packages.find(p=>p.identifier===selectedPkgIdentifier);if(!plan)return;
  operation.current=true;setIsPurchasing(true);setError(null);
  try {
   if(!Capacitor.isNativePlatform()) {if(import.meta.env.DEV)onPurchase();return;}
   const client=await configureRevenueCat();if(!client)throw new Error('Google Play is unavailable.');
   await markProPurchasePending(true);setPending(true);recordEvent('purchase_attempt','pro');
   const result=await purchaseRevenueCatPlan(client.plugin,plan);
   if(!await finish(result.customerInfo)){const fresh=await getStartupSubscriptionStatus();if(!await finish(fresh.customerInfo))setError('Your purchase is awaiting confirmation. Check subscription status before trying another purchase.');}
  }catch(e:any){
   const cancelled=e.userCancelled===true||Number(e.code)===1;
   // Only an explicit cancellation is proof that this purchase did not complete.
   if(cancelled){await markProPurchasePending(false);setPending(false);}else setError('Google Play could not confirm the purchase. Check subscription status or restore before trying again.');
   recordEvent(cancelled?'purchase_cancelled':'purchase_failed','pro',{error_category:cancelled?'cancelled':String(e.code||'unknown')});
  }finally{operation.current=false;setIsPurchasing(false);}
 };
 const handleRestore=async()=>{
  if(operation.current)return;operation.current=true;setIsPurchasing(true);setError(null);
  try{const result=await restoreRevenueCatPurchases();if(!await finish(result.customerInfo))setError('No active subscription was found for this Google Play account.');}
  catch{setError('Restoration could not finish. Your saved data has been kept. Please retry.');}finally{operation.current=false;setIsPurchasing(false);}
 };
 const openLink=async(url:string)=>{try{await Browser.open({url});}catch{window.open(url,'_blank','noopener,noreferrer');}};
 const selectedPkg=packages.find(p=>p.identifier===selectedPkgIdentifier),trialEligible=selectedPkg?.trialDays===3;
 const comparison=annualComparison(packages.find(p=>p.packageType==='ANNUAL'),packages.find(p=>p.packageType==='WEEKLY'));
 const getPlanMeta=(pkg:any)=>pkg.packageType==='ANNUAL'?{badge:comparison.badge,subtext:comparison.subtext||'Support your full grow cycle'}:{badge:null,subtext:'Try a focused check-in this week'};
 const getSubtext=()=>selectedPkg?(trialEligible?'3 days free, then ':'Auto-renews at ')+selectedPkg.product.priceString+'/'+(selectedPkg.packageType==='ANNUAL'?'year':'week')+'. Auto-renews unless canceled.':'';
 if(loading)return <div className="journey-screen grid place-items-center" role="status"><p>Loading plans…</p></div>;
 if(error&&!packages.length)return <div className="journey-screen grid place-items-center p-6"><div><h1 className="text-xl font-bold">Connection Issues</h1><p role="alert">{error}</p><button className="journey-primary mt-4" onClick={()=>void loadProducts(true)}>Retry Connection</button><button className="journey-text-button" onClick={handleRestore}>Restore Purchases</button><button className="journey-text-button" onClick={onClose}>Back</button></div></div>;
 return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col overflow-hidden" data-testid="pro-paywall">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <header className="subscription-hero bg-gradient-to-br from-green-950 to-emerald-800 text-white px-5 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-4">
          <button aria-label="Back" disabled={isPurchasing} onClick={onClose} className="mb-3 min-h-11 px-3 rounded-full border border-white/30 text-sm">Back</button>
          <p className="text-xs font-bold tracking-widest text-emerald-200 mb-2">MASTERGROWBOT AI PRO</p>
          <h1 className="text-2xl font-black leading-tight">{benefits.headline}</h1>
          <p className="text-xs text-emerald-100 mt-2">{benefits.description}</p>
        </header>
        <div className="subscription-content px-5 py-4">
          <div className="paywall-guide"><Growbot size="md" mood="happy"/><p>Put your next step into action.<span>Pro includes photo reports, your journal, and strain references.</span></p></div><h2 className="text-sm font-bold text-slate-900 mb-3">Choose your Pro plan</h2>
          <div className="space-y-3" aria-label="Pro billing period">
            {packages.map(pkg => {
              const selected = pkg.identifier === selectedPkgIdentifier;
              const period = pkg.packageType === 'WEEKLY' ? 'week' : 'year';
              const meta = getPlanMeta(pkg);
              return <button type="button" key={pkg.identifier} aria-pressed={selected} disabled={isPurchasing} onClick={() => {setSelectedPkgIdentifier(pkg.identifier);recordEvent('plan_selected','pro');}} className={`subscription-plan w-full text-left rounded-2xl border-2 px-4 py-3 flex items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${selected ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                <div className="flex-1 min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-bold text-sm">{period === 'year' ? 'Yearly' : 'Weekly'}</span>{meta.badge && <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 rounded-full px-2 py-1">{meta.badge}</span>}</div><p className="subscription-price text-sm text-slate-700 mt-1"><strong>{pkg.product.priceString}</strong> / {period}</p><p className="text-xs text-emerald-800 mt-1">{meta.subtext}</p></div>
                <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'}`}>{selected && <Check size={16}/>}</span>
              </button>;
            })}
          </div>

          <div className="mt-5"><ul className="pro-benefits">
            {[{icon:'📸',label:benefits.photo}, {icon:'📓',label:benefits.journal}, {icon:'🧬',label:benefits.references}, {icon:'📅',label:'Keep tasks and follow-ups with your grow.'}].map(({icon,label}) => <li key={label} className="flex items-center gap-2"><span aria-hidden="true" className="text-base shrink-0">{icon}</span>{label}</li>)}
          </ul></div>
          {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 text-red-800 p-3 text-sm">{error}</p>}
          <PaywallTestimonials/>
        </div>
      </div>
      <footer className="shrink-0 border-t border-slate-200 bg-white px-5 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
        <p className="text-center text-xs text-slate-700 mb-2 font-semibold">{getSubtext()}</p>
        <button disabled={isPurchasing || (!pending&&!selectedPkgIdentifier)} onClick={pending?checkPending:handleStartTrial} className="w-full min-h-12 rounded-2xl bg-emerald-800 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">{isPurchasing ? 'Confirming your subscription…' : pending ? 'Check subscription status' : trialEligible ? 'Start 3-Day Free Trial' : 'Continue'}{!isPurchasing && <ArrowRight size={18}/>}</button>
        {pending&&<button onClick={()=>openLink('https://play.google.com/store/account/subscriptions?sku=mastergrowbot_pro&package=com.mastergrowbot.app')} className="journey-text-button">Open Google Play subscriptions</button>}
        {pending&&error&&<button className="block min-h-11 text-xs underline mx-auto" onClick={async()=>{await markProPurchasePending(false);setPending(false);setError('Before purchasing again, confirm Google Play subscriptions shows no active or pending Pro plan.');}}>Google Play shows no plan? Choose a plan again</button>}
        <button onClick={() => openLink(PLAY_SUBSCRIPTIONS_URL)} className="block mx-auto text-xs text-center text-slate-600 mt-2 min-h-11 underline">Manage or cancel in Google Play</button>
        <div className="flex flex-wrap justify-center gap-x-3 text-xs text-slate-600">
          <button disabled={isPurchasing} onClick={handleRestore} className="min-h-11 underline">Restore Purchases</button>
          <button onClick={() => openLink('https://www.mastergrowbot.com/terms-of-service')} className="min-h-11 underline">Terms</button>
          <button onClick={() => openLink('https://www.mastergrowbot.com/privacy-policy')} className="min-h-11 underline">Privacy</button>
        </div>
      </footer>
    </div>
  );
}
