import { describe, expect, it } from 'vitest';
import { hasVerifiedSubscription } from './revenueCatService';

describe('paid access verification', () => {
  it('accepts the active pro entitlement', () => expect(hasVerifiedSubscription({ entitlements: { active: { pro: {} } }, activeSubscriptions: [] })).toBe(true));
  it('accepts an active configured subscription product', () => expect(hasVerifiedSubscription({ entitlements: { active: {} }, activeSubscriptions: ['mg_annual'] })).toBe(true));
  it('never unlocks an empty or cancelled customer', () => {
    expect(hasVerifiedSubscription(null)).toBe(false);
    expect(hasVerifiedSubscription({ entitlements: { active: {} }, activeSubscriptions: [] })).toBe(false);
  });
});
