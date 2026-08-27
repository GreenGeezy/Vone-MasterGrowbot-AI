import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import type { CustomerInfo } from '@revenuecat/purchases-capacitor';

const ANDROID_REVENUECAT_KEY = 'goog_kqOynvNRCABzUPrpfyFvlMvHUna';
const STARTUP_SYNC_KEY = 'mg_rc_startup_sync_v2';
let configurationPromise: Promise<any> | null = null;

export function hasVerifiedSubscription(customerInfo: CustomerInfo | any): boolean {
  return Boolean(customerInfo?.entitlements?.active?.pro || (customerInfo?.activeSubscriptions?.length || 0) > 0);
}

export async function configureRevenueCat(): Promise<any | null> {
  if (Capacitor.getPlatform() !== 'android') return null;
  if (!configurationPromise) {
    configurationPromise = import('@revenuecat/purchases-capacitor').then(async ({ Purchases }) => {
      const { isConfigured } = await Purchases.isConfigured();
      if (!isConfigured) await Purchases.configure({ apiKey: ANDROID_REVENUECAT_KEY });
      return Purchases;
    }).catch(error => { configurationPromise = null; throw error; });
  }
  return configurationPromise;
}

export async function getStartupSubscriptionStatus(): Promise<{ isSubscribed: boolean; customerInfo: any | null }> {
  const Purchases = await configureRevenueCat();
  if (!Purchases) return { isSubscribed: false, customerInfo: null };
  let { customerInfo } = await Purchases.getCustomerInfo();
  if (hasVerifiedSubscription(customerInfo)) {
    await Preferences.set({ key: STARTUP_SYNC_KEY, value: 'healthy' });
    return { isSubscribed: true, customerInfo };
  }
  const { value: syncState } = await Preferences.get({ key: STARTUP_SYNC_KEY });
  if (!syncState) {
    await Purchases.syncPurchases();
    ({ customerInfo } = await Purchases.getCustomerInfo());
    await Preferences.set({ key: STARTUP_SYNC_KEY, value: hasVerifiedSubscription(customerInfo) ? 'healthy' : 'checked' });
  }
  return { isSubscribed: hasVerifiedSubscription(customerInfo), customerInfo };
}

export async function restoreRevenueCatPurchases(): Promise<{ restored: boolean; customerInfo: any | null }> {
  const Purchases = await configureRevenueCat();
  if (!Purchases) return { restored: false, customerInfo: null };
  await Purchases.restorePurchases();
  const { customerInfo } = await Purchases.getCustomerInfo();
  const restored = hasVerifiedSubscription(customerInfo);
  if (restored) await Preferences.set({ key: STARTUP_SYNC_KEY, value: 'healthy' });
  return { restored, customerInfo };
}
