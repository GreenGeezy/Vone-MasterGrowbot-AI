import { CatalogCustomer, hasPremiumAccess, PREMIUM_PRODUCTS } from './premiumCatalog';

export const PREMIUM_PENDING_MESSAGE = 'Apple returned your request, but Premium access is not active yet. Check status before purchasing again. If Apple scheduled a plan change, it starts on the date shown in Apple Subscriptions.';

export function premiumStatusMessage(info: CatalogCustomer, restoring = false): string {
  const purchasedPremium = (info.activeSubscriptions || []).some(id => Object.values(PREMIUM_PRODUCTS).includes(id as any));
  if (purchasedPremium) return 'Your Premium subscription was found, but its access could not be verified. Check status again or contact support. Please do not purchase again.';
  if (restoring) return 'Apple did not return an active Premium subscription for this App Store account. Check Apple Subscriptions for its plan and start date. Pro access does not include video analysis.';
  return PREMIUM_PENDING_MESSAGE;
}

export function isPurchaseCancelled(error: any): boolean {
  return error?.userCancelled === true || String(error?.code) === '1';
}

export function purchaseErrorMessage(error: any): string {
  switch (String(error?.code)) {
    case '20': return 'Apple is waiting for payment approval. Premium will activate after approval. Check status later; do not purchase again.';
    case '10': case '35': return 'The subscription service could not be reached. Check your connection, then check status before trying another purchase.';
    case '5': case '11': case '17': case '23': return 'This plan is temporarily unavailable from the App Store. Please contact support if it continues.';
    case '6': return 'Apple already has a purchase for this plan. Use Restore Purchases to verify access.';
    case '7': case '13': return 'This Apple purchase is associated with another app account. Use Restore Purchases. If access is still missing, contact support.';
    case '3': return 'Purchases are not allowed on this device. Check your App Store account and Screen Time purchase restrictions.';
    case '2': return 'Apple could not complete the request. Check Apple Subscriptions and try again when the App Store is available.';
    default: return 'We could not confirm Premium access. Check status or Restore Purchases before purchasing again.';
  }
}

/** Refresh the SDK cache, not the receipt. Never grant access from product history. */
export async function refreshPremiumCustomer<T extends CatalogCustomer>(
  api: { invalidateCustomerInfoCache(): Promise<void>; getCustomerInfo(): Promise<{ customerInfo: T }> },
  initial?: T,
  wait: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms)),
): Promise<T> {
  if (initial && hasPremiumAccess(initial)) return initial;
  let latest = initial;
  for (const delay of [0, 1000, 2000]) {
    if (delay) await wait(delay);
    await api.invalidateCustomerInfoCache();
    latest = (await api.getCustomerInfo()).customerInfo;
    if (hasPremiumAccess(latest)) return latest;
  }
  return latest!;
}
