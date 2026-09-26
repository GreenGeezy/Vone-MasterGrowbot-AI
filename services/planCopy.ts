type StoreProduct = { price?: number; currencyCode?: string; priceString: string };

/** Actual charge is shown separately on the paywall; this is only a comparison. */
export function weeklyEquivalent(product: StoreProduct, weeks: number): string | null {
  if (!Number.isFinite(product.price) || !product.price || product.price <= 0 || !product.currencyCode) return null;
  try {
    const display = new Intl.NumberFormat(undefined, {
      style: 'currency', currency: product.currencyCode,
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(product.price / weeks);
    return `Just ${display}/week equivalent`;
  } catch { return null; }
}

export function planBenefit(period: 'weekly' | 'monthly' | 'annual', product: StoreProduct): string {
  if (period === 'weekly') return 'Try a focused check-in this week';
  if (period === 'monthly') return weeklyEquivalent(product, 52 / 12) || 'Stay on top of each grow';
  return weeklyEquivalent(product, 52) || 'Support your full grow cycle';
}
