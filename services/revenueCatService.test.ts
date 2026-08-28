import { describe, expect, it } from 'vitest';
import { hasVerifiedSubscription, packageHasFreeTrial } from './revenueCatService';

describe('paid access verification', () => {
  it('accepts the active pro entitlement', () => expect(hasVerifiedSubscription({ entitlements: { active: { pro: {} } }, activeSubscriptions: [] })).toBe(true));
  it('accepts an active configured subscription product', () => expect(hasVerifiedSubscription({ entitlements: { active: {} }, activeSubscriptions: ['mg_annual'] })).toBe(true));
  it('never unlocks an empty or cancelled customer', () => {
    expect(hasVerifiedSubscription(null)).toBe(false);
    expect(hasVerifiedSubscription({ entitlements: { active: {} }, activeSubscriptions: [] })).toBe(false);
  });
});

describe('trial disclosure', () => {
  it('shows a Google Play trial only when the selected default option has a free phase', () => {
    expect(packageHasFreeTrial({ product: { defaultOption: { freePhase: { billingPeriod: 'P7D' } } } })).toBe(true);
  });

  it('does not advertise a trial from a different subscription option', () => {
    expect(packageHasFreeTrial({
      product: {
        defaultOption: { freePhase: null },
        subscriptionOptions: [{ freePhase: { billingPeriod: 'P7D' } }],
      },
    })).toBe(false);
  });

  it('preserves the App Store zero-price introductory offer check', () => {
    expect(packageHasFreeTrial({ product: { introPrice: { price: 0 } } })).toBe(true);
  });
});
