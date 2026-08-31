import { describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn(() => 'android'),
  },
  registerPlugin: vi.fn((name: string) => ({ pluginName: name })),
}));

import {
  configureRevenueCat,
  getStartupSubscriptionStatus,
  hasVerifiedSubscription,
  loadRevenueCatPlans,
  normalizeRevenueCatOfferings,
  packageHasFreeTrial,
  RevenueCatTimeoutError,
  restoreRevenueCatPurchases,
  resetRevenueCatInitializationForTests,
} from './revenueCatService';

describe('RevenueCat native initialization', () => {
  const configuredStatus = {
    attempted: true,
    succeeded: true,
    configured: true,
    errorCode: 'NONE',
    elapsedMs: 2,
    pluginRegistered: true,
    versionCode: 155,
    versionName: '1.0.155',
  };

  it('uses the statically registered plugin after native readiness succeeds', async () => {
    resetRevenueCatInitializationForTests();
    const ensureConfigured = vi.fn().mockResolvedValue(configuredStatus);
    const plugin = await configureRevenueCat({ ensureConfigured });
    expect(ensureConfigured).toHaveBeenCalledOnce();
    expect(plugin).toBeTruthy();
  });

  it('shares one native readiness operation between concurrent callers', async () => {
    resetRevenueCatInitializationForTests();
    const ensureConfigured = vi.fn(async () => configuredStatus);
    await Promise.all([
      configureRevenueCat({ ensureConfigured }),
      configureRevenueCat({ ensureConfigured }),
      configureRevenueCat({ ensureConfigured }),
    ]);
    expect(ensureConfigured).toHaveBeenCalledOnce();
  });

  it('recovers after native readiness rejects without retaining the failed attempt', async () => {
    resetRevenueCatInitializationForTests();
    const ensureConfigured = vi.fn()
      .mockRejectedValueOnce(new Error('bridge unavailable'))
      .mockResolvedValueOnce(configuredStatus);
    await expect(configureRevenueCat({ ensureConfigured })).rejects.toThrow('bridge unavailable');
    await expect(configureRevenueCat({ ensureConfigured })).resolves.toBeTruthy();
    expect(ensureConfigured).toHaveBeenCalledTimes(2);
  });

  it('bounds a native bridge call that never resolves', async () => {
    resetRevenueCatInitializationForTests();
    const ensureConfigured = vi.fn(() => new Promise<any>(() => undefined));
    await expect(configureRevenueCat({ ensureConfigured, bridgeTimeoutMs: 5 })).rejects.toBeInstanceOf(RevenueCatTimeoutError);
    expect(ensureConfigured).toHaveBeenCalledOnce();
  });

  it('does not retain a timed-out native bridge call on Retry', async () => {
    resetRevenueCatInitializationForTests();
    const ensureConfigured = vi.fn()
      .mockImplementationOnce(() => new Promise<any>(() => undefined))
      .mockResolvedValueOnce(configuredStatus);
    await expect(configureRevenueCat({ ensureConfigured, bridgeTimeoutMs: 5 })).rejects.toBeInstanceOf(RevenueCatTimeoutError);
    await expect(configureRevenueCat({ ensureConfigured, bridgeTimeoutMs: 5 })).resolves.toBeTruthy();
    expect(ensureConfigured).toHaveBeenCalledTimes(2);
  });

  it('rejects an explicit native not-configured status', async () => {
    resetRevenueCatInitializationForTests();
    await expect(configureRevenueCat({
      ensureConfigured: async () => ({ ...configuredStatus, succeeded: false, configured: false, errorCode: 'IllegalStateException' }),
    })).rejects.toMatchObject({ code: 'RC_NATIVE_NOT_CONFIGURED' });
  });
});

describe('paid access verification', () => {
  it('accepts the active pro entitlement', () => expect(hasVerifiedSubscription({ entitlements: { active: { pro: {} } }, activeSubscriptions: [] })).toBe(true));
  it('accepts an active configured subscription product', () => expect(hasVerifiedSubscription({ entitlements: { active: {} }, activeSubscriptions: ['mg_annual'] })).toBe(true));
  it('never unlocks an empty or cancelled customer', () => {
    expect(hasVerifiedSubscription(null)).toBe(false);
    expect(hasVerifiedSubscription({ entitlements: { active: {} }, activeSubscriptions: [] })).toBe(false);
  });
});

describe('startup subscription verification', () => {
  it('does not run syncPurchases during startup before paywall offerings load', async () => {
    const syncPurchases = vi.fn();
    const customerInfo = { entitlements: { active: {} }, activeSubscriptions: [] };
    const result = await getStartupSubscriptionStatus({
      configure: async () => ({
        getCustomerInfo: vi.fn().mockResolvedValue({ customerInfo }),
        syncPurchases,
      }),
      timeoutMs: 100,
    });
    expect(result.isSubscribed).toBe(false);
    expect(syncPurchases).not.toHaveBeenCalled();
  });

  it('still recognizes a returning active pro subscriber', async () => {
    const customerInfo = { entitlements: { active: { pro: {} } }, activeSubscriptions: [] };
    const result = await getStartupSubscriptionStatus({
      configure: async () => ({ getCustomerInfo: vi.fn().mockResolvedValue({ customerInfo }) }),
      timeoutMs: 100,
    });
    expect(result.isSubscribed).toBe(true);
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

const annualPackage = { identifier: '$rc_annual', packageType: 'ANNUAL', product: { priceString: '$99.99' } };

describe('RevenueCat plan loading', () => {
  it('loads packages from the current offering', async () => {
    const getOfferings = vi.fn().mockResolvedValue({ current: { identifier: 'default', availablePackages: [annualPackage] } });
    const result = await loadRevenueCatPlans({ configure: async () => ({ getOfferings }), timeoutMs: 100 });
    expect(result.packages).toEqual([annualPackage]);
    expect(result.currentOfferingIdentifier).toBe('default');
    expect(getOfferings).toHaveBeenCalledOnce();
  });

  it('propagates a sanitized-loadable failure when getOfferings throws', async () => {
    await expect(loadRevenueCatPlans({
      configure: async () => ({ getOfferings: vi.fn().mockRejectedValue(new Error('Play Billing unavailable')) }),
      timeoutMs: 100,
    })).rejects.toThrow('Play Billing unavailable');
  });

  it('requests offerings without waiting on customer info', async () => {
    const callOrder: string[] = [];
    const result = await loadRevenueCatPlans({
      configure: async () => ({
        getCustomerInfo: async () => { callOrder.push('customerInfo'); return { customerInfo: null }; },
        getOfferings: async () => {
          callOrder.push('offerings');
          return { current: { identifier: 'default', availablePackages: [annualPackage] } };
        },
      }),
      timeoutMs: 100,
    });
    expect(callOrder).toEqual(['offerings']);
    expect(result.packages).toHaveLength(1);
  });

  it('does not let a hung customer-info implementation block offerings', async () => {
    const getOfferings = vi.fn().mockResolvedValue({ current: { identifier: 'default', availablePackages: [annualPackage] } });
    await expect(loadRevenueCatPlans({
      configure: async () => ({
        getCustomerInfo: () => new Promise(() => undefined),
        getOfferings,
      }),
      timeoutMs: 100,
    })).resolves.toMatchObject({ packages: [annualPackage] });
    expect(getOfferings).toHaveBeenCalledOnce();
  });

  it('bounds a getOfferings call that never resolves', async () => {
    await expect(loadRevenueCatPlans({
      configure: async () => ({ getOfferings: () => new Promise(() => undefined) }),
      timeoutMs: 5,
    })).rejects.toBeInstanceOf(RevenueCatTimeoutError);
  });

  it('reports a specific error when the current offering is null', async () => {
    await expect(loadRevenueCatPlans({
      configure: async () => ({ getOfferings: async () => ({ current: null, all: {} }) }),
      timeoutMs: 100,
    })).rejects.toMatchObject({ code: 'RC_CURRENT_OFFERING_MISSING' });
  });

  it('reports a specific error when the current offering is empty', async () => {
    await expect(loadRevenueCatPlans({
      configure: async () => ({ getOfferings: async () => ({ current: { identifier: 'default', availablePackages: [] } }) }),
      timeoutMs: 100,
    })).rejects.toMatchObject({ code: 'RC_PACKAGES_EMPTY' });
  });

  it('waits for delayed initialization before requesting offerings', async () => {
    const getOfferings = vi.fn().mockResolvedValue({ current: { identifier: 'default', availablePackages: [annualPackage] } });
    const configure = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 5));
      return { getOfferings };
    });
    const result = await loadRevenueCatPlans({ configure, timeoutMs: 100 });
    expect(result.packages).toHaveLength(1);
    expect(configure).toHaveBeenCalledOnce();
  });

  it('clearly fails when initialization fails', async () => {
    await expect(loadRevenueCatPlans({
      configure: async () => { throw new Error('ConfigurationError'); },
      timeoutMs: 100,
    })).rejects.toThrow('ConfigurationError');
  });

  it('allows a successful retry after an offering failure', async () => {
    const getOfferings = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ current: { identifier: 'default', availablePackages: [annualPackage] } });
    const configure = vi.fn(async () => ({ getOfferings }));
    await expect(loadRevenueCatPlans({ configure, timeoutMs: 100 })).rejects.toThrow('offline');
    await expect(loadRevenueCatPlans({ configure, timeoutMs: 100 })).resolves.toMatchObject({ packages: [annualPackage] });
  });

  it('re-arms the native billing connection before a user-requested retry', async () => {
    const callOrder: string[] = [];
    const recoverConnection = vi.fn(async () => {
      callOrder.push('recover');
      return {
        attempted: true, succeeded: true, configured: true, errorCode: 'NONE', elapsedMs: 1,
        pluginRegistered: true, versionCode: 155, versionName: '1.0.155',
      };
    });
    const result = await loadRevenueCatPlans({
      recoverBeforeLoad: true,
      recoverConnection,
      configure: async () => ({
        getOfferings: async () => {
          callOrder.push('offerings');
          return { current: { identifier: 'default', availablePackages: [annualPackage] } };
        },
      }),
      timeoutMs: 100,
      totalTimeoutMs: 200,
    });
    expect(result.packages).toHaveLength(1);
    expect(callOrder).toEqual(['recover', 'offerings']);
  });

  it('bounds the complete paywall sequence instead of stacking stage timeouts', async () => {
    await expect(loadRevenueCatPlans({
      configure: () => new Promise(() => undefined),
      timeoutMs: 100,
      totalTimeoutMs: 5,
    })).rejects.toMatchObject({ code: 'RC_PAYWALL_TIMEOUT' });
  });

  it('normalizes the purchases-capacitor 11 wrapper response', () => {
    const offerings = { current: { identifier: 'default', availablePackages: [annualPackage] } };
    expect(normalizeRevenueCatOfferings({ offerings })).toBe(offerings);
    expect(normalizeRevenueCatOfferings(offerings)).toBe(offerings);
  });
});

describe('subscriber recovery while offerings are unavailable', () => {
  it('restores an active pro subscriber without loading offerings', async () => {
    const customerInfo = { entitlements: { active: { pro: {} } }, activeSubscriptions: ['mastergrowbot_pro:annual'] };
    const result = await restoreRevenueCatPurchases({
      configure: async () => ({
        restorePurchases: async () => ({ customerInfo }),
        getCustomerInfo: async () => ({ customerInfo }),
      }),
      timeoutMs: 100,
    });
    expect(result.restored).toBe(true);
  });

  it('does not unlock when restore finds no active subscription', async () => {
    const customerInfo = { entitlements: { active: {} }, activeSubscriptions: [] };
    const result = await restoreRevenueCatPurchases({
      configure: async () => ({
        restorePurchases: async () => ({ customerInfo }),
        getCustomerInfo: async () => ({ customerInfo }),
      }),
      timeoutMs: 100,
    });
    expect(result.restored).toBe(false);
  });
});
