import { Preferences } from '@capacitor/preferences';
import { supabase } from './supabaseClient';
import { PREMIUM_ENTITLEMENT } from './premiumCatalog';

const STABLE_ID_KEY = 'mg_rc_stable_id';
const PENDING_PREVIOUS_ID_KEY = 'mg_rc_pending_previous_id';

type PurchasesIdentityApi = {
  getAppUserID(): Promise<{ appUserID: string }>;
  logIn(options: { appUserID: string }): Promise<{ customerInfo: RevenueCatCustomerInfo }>;
};

type RevenueCatCustomerInfo = {
  entitlements: { active: Record<string, unknown> };
  activeSubscriptions?: string[];
};

export async function getStableRevenueCatId(): Promise<string> {
  const { value } = await Preferences.get({ key: STABLE_ID_KEY });
  if (value) return value;
  const stableId = crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await Preferences.set({ key: STABLE_ID_KEY, value: stableId });
  return stableId;
}

export async function recoverPendingRevenueCatBinding(
  Purchases: PurchasesIdentityApi,
  customerInfo: RevenueCatCustomerInfo,
): Promise<RevenueCatCustomerInfo> {
  const { value: previousId } = await Preferences.get({ key: PENDING_PREVIOUS_ID_KEY });
  if (!previousId) return customerInfo;

  if (customerInfo.entitlements.active[PREMIUM_ENTITLEMENT]) {
    await Preferences.remove({ key: PENDING_PREVIOUS_ID_KEY });
    return customerInfo;
  }

  const { customerInfo: recoveredInfo } = await Purchases.logIn({ appUserID: previousId });
  await Preferences.set({ key: STABLE_ID_KEY, value: previousId });
  await Preferences.remove({ key: PENDING_PREVIOUS_ID_KEY });
  return recoveredInfo;
}

export interface RevenueCatBinding {
  previousId: string | null;
  targetId: string;
}

export async function beginPremiumRevenueCatBinding(
  Purchases: PurchasesIdentityApi,
): Promise<RevenueCatBinding> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.user?.id) {
    throw new Error('Your secure app session is unavailable. Reopen the app and try again.');
  }

  const targetId = session.user.id;
  const { appUserID: currentId } = await Purchases.getAppUserID();
  if (currentId === targetId) return { previousId: null, targetId };

  await Preferences.set({ key: PENDING_PREVIOUS_ID_KEY, value: currentId });
  await Purchases.logIn({ appUserID: targetId });
  await Preferences.set({ key: STABLE_ID_KEY, value: targetId });
  return { previousId: currentId, targetId };
}

export async function completePremiumRevenueCatBinding(
  customerInfo: RevenueCatCustomerInfo,
): Promise<void> {
  if (!customerInfo.entitlements.active[PREMIUM_ENTITLEMENT]) {
    throw new Error('Premium purchase is still being verified. Use Restore Purchases if it does not appear shortly.');
  }
  await Preferences.remove({ key: PENDING_PREVIOUS_ID_KEY });
}

export async function rollbackPremiumRevenueCatBinding(
  Purchases: PurchasesIdentityApi,
  binding: RevenueCatBinding | null,
): Promise<void> {
  if (!binding?.previousId) return;
  await Purchases.logIn({ appUserID: binding.previousId });
  await Preferences.set({ key: STABLE_ID_KEY, value: binding.previousId });
  await Preferences.remove({ key: PENDING_PREVIOUS_ID_KEY });
}
