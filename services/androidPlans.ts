/** Store pricing phases are authoritative; formatted currency strings are display-only. */
export function normalizeAndroidPlans(packages: any[]): any[] {
  const plans = new Map<string, any>();
  for (const pkg of packages) {
    const product = pkg?.product;
    if (!product) continue;
    const selected = pkg.__subscriptionOption || product.defaultOption;
    const options = selected ? [selected] : [];
    for (const option of options) {
      const period = option.billingPeriod?.iso8601 || option.fullPricePhase?.billingPeriod?.iso8601 || product.subscriptionPeriod;
      const type = ['P1Y', 'P12M'].includes(period) ? 'ANNUAL' : ['P1W', 'P7D'].includes(period) ? 'WEEKLY' : null;
      // Period alone is insufficient: never surface another product or monthly offer.
      const identifier = String(option.productId || product.identifier || '');
      const optionParts = String(option.id || '').split(':');
      const basePlanId = optionParts[0] === 'mastergrowbot_pro' ? optionParts[1] : optionParts[0] || identifier.split(':')[1];
      if (!type || identifier.split(':')[0] !== 'mastergrowbot_pro' || !['annual', 'weekly'].includes(basePlanId)) continue;
      const phase = option.fullPricePhase;
      const amount = phase?.price?.amountMicros;
      const price = Number.isFinite(amount) ? amount / 1_000_000 : product.price;
      const currencyCode = phase?.price?.currencyCode || product.currencyCode;
      const priceString = phase?.price?.formatted || product.priceString;
      if (!Number.isFinite(price) || price <= 0 || !currencyCode || !priceString) continue;
      const free = option.freePhase;
      const trial = free?.billingPeriod?.iso8601;
      const trialDays = trial === 'P3D' ? 3 : null;
      const normalized = {
        ...pkg, packageType: type, basePlanId, trialDays,
        product: { ...product, price, currencyCode, priceString, defaultOption: option },
        __purchaseMode: 'subscriptionOption', __subscriptionOption: option,
      };
      const prior = plans.get(type);
      if (!prior || (!prior.trialDays && trialDays)) plans.set(type, normalized);
    }
  }
  return ['ANNUAL', 'WEEKLY'].map(type => plans.get(type)).filter(Boolean);
}

export function annualComparison(annual: any, weekly: any): { badge: string | null; subtext: string | null } {
  const a = annual?.product, w = weekly?.product;
  if (!a || !Number.isFinite(a.price) || a.price <= 0 || !a.currencyCode) return { badge: null, subtext: null };
  let subtext: string | null = null;
  try {
    const equivalent = new Intl.NumberFormat(undefined, { style: 'currency', currency: a.currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(a.price / 52);
    subtext = `About ${equivalent}/week, billed yearly`;
  } catch { /* Invalid store currency cannot produce a comparison. */ }
  const savings = w?.currencyCode === a.currencyCode && Number.isFinite(w.price) && w.price > 0
    ? Math.floor((1 - a.price / (w.price * 52)) * 100) : 0;
  return { badge: savings > 0 && savings < 100 ? `Save ${savings}% vs weekly` : null, subtext };
}
