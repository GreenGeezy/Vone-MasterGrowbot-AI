/** Pure catalog rules. No purchases, identity changes, or entitlement grants. */
export const PREMIUM_OFFERING = 'premium_upgrade';
export const PREMIUM_ENTITLEMENT = 'machine_vision';
export const PREMIUM_PRODUCTS = {
  weekly: 'mastergrowbot_premium_weekly_v1',
  monthly: 'mastergrowbot_premium_monthly_v1',
  annual: 'mastergrowbot_premium_yearly_v1',
} as const;
export type BillingCadence = keyof typeof PREMIUM_PRODUCTS;

const CADENCES: Record<string, BillingCadence> = {
  [PREMIUM_PRODUCTS.weekly]: 'weekly',
  [PREMIUM_PRODUCTS.monthly]: 'monthly',
  [PREMIUM_PRODUCTS.annual]: 'annual',
  weekly_pro_v2: 'weekly',
  mastergrowbot_pro_weekly_v3: 'weekly',
  'com.mastergrowbot.ai.sub.weekly': 'weekly',
  monthly_pro_v2: 'monthly',
  'com.mastergrowbot.ai.sub.monthly': 'monthly',
  yearly_pro_v2: 'annual',
  mastergrowbot_pro_yearly_v3: 'annual',
};

export interface CatalogCustomer {
  entitlements?: { active?: Record<string, { productIdentifier?: string }> };
  activeSubscriptions?: string[];
}

export function hasPremiumAccess(info?: CatalogCustomer | null): boolean {
  return Boolean(info?.entitlements?.active?.[PREMIUM_ENTITLEMENT]);
}

export function preferredPremiumCadence(info?: CatalogCustomer | null): BillingCadence | null {
  // An upgraded product can overlap a trial. Prefer the active Premium entitlement.
  for (const key of [PREMIUM_ENTITLEMENT, 'pro']) {
    const product = info?.entitlements?.active?.[key]?.productIdentifier;
    if (product && CADENCES[product]) return CADENCES[product];
  }
  const cadences = new Set((info?.activeSubscriptions || []).map(id => CADENCES[id]).filter(Boolean));
  return cadences.size === 1 ? [...cadences][0] : null;
}

export interface CatalogPackage {
  identifier: string;
  product: { identifier: string; price?: number; priceString?: string; currencyCode?: string };
}

export function validatedPremiumPackages<T extends CatalogPackage>(packages: T[]): T[] {
  // Fail closed on wrong/duplicate packages rather than sell a different product.
  return (Object.keys(PREMIUM_PRODUCTS) as BillingCadence[]).flatMap(cadence => {
    const matches = packages.filter(pkg => pkg.identifier === cadence && pkg.product.identifier === PREMIUM_PRODUCTS[cadence]);
    return matches.length === 1 ? matches : [];
  });
}

export function annualSavingsPercent(monthly: CatalogPackage['product'], annual: CatalogPackage['product']): number | null {
  if (monthly.identifier !== PREMIUM_PRODUCTS.monthly || annual.identifier !== PREMIUM_PRODUCTS.annual) return null;
  if (!monthly.currencyCode || monthly.currencyCode !== annual.currencyCode) return null;
  if (typeof monthly.price !== 'number' || typeof annual.price !== 'number' ||
      !Number.isFinite(monthly.price) || !Number.isFinite(annual.price) || monthly.price <= 0 || annual.price <= 0) return null;
  const saving = Math.round((1 - annual.price / (monthly.price * 12)) * 100);
  return saving > 0 && saving < 100 ? saving : null;
}
