import { describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
  },
}));

import {
  createRevenueCatInitializer,
  hasVerifiedSubscription,
  loadRevenueCatPlans,
  normalizeRevenueCatOfferings,
  packageHasFreeTrial,
  RevenueCatTimeoutError,
  restoreRevenueCatPurchases,
  resetRevenueCatInitializationForTests,
} from './revenueCatService';

describe('RevenueCat native initialization', () => {
  it('dispatches configure before checking native configured state', async () => {
    resetRevenueCatInitializationForTests();
    const order: string[] = [];
    const plugin = {
      configure: vi.fn(() => { order.push('configure'); }),
      isConfigured: vi.fn(async () => { order.push('isConfigured'); return { isConfigured: true }; }),
    };
    await createRevenueCatInitializer(plugin, 100)();
    expect(order).toEqual(['configure', 'isConfigured']);
    expect(plugin.configure).toHaveBeenCalledOnce();
  });

  it('shares one configure operation between concurrent callers', async () => {
    resetRevenueCatInitializationForTests();
    const plugin = {
      configure: vi.fn(async () => undefined),
      isConfigured: vi.fn(async () => ({ isConfigured: true })),
    };
    const initialize = createRevenueCatInitializer(plugin, 100);
    await Promise.all([initialize(), initialize(), initialize()]);
    expect(plugin.configure).toHaveBeenCalledOnce();
    expect(plugin.isConfigured).toHaveBeenCalledOnce();
  });

  it('recovers on Retry after a timed-out native configured check', async () => {
    resetRevenueCatInitializationForTests();
    const plugin = {
      configure: vi.fn(() => undefined),
      isConfigured: vi.fn()
        .mockImplementationOnce(() => new Promise(() => undefined))
        .mockResolvedValueOnce({ isConfigured: true }),
    };
    const initialize = createRevenueCatInitializer(plugin, 10);
    await expect(initialize()).rejects.toBeInstanceOf(RevenueCatTimeoutError);
    await expect(initialize()).resolves.toBe(plugin);
    expect(plugin.configure).toHaveBeenCalledOnce();
    expect(plugin.isConfigured).toHaveBeenCalledTimes(2);
  });

  it('allows a safe redispatch after native definitively reports not configured', async () => {
    resetRevenueCatInitializationForTests();
    const plugin = {
      configure: vi.fn(() => undefined),
      isConfigured: vi.fn()
        .mockResolvedValueOnce({ isConfigured: false })
        .mockResolvedValueOnce({ isConfigured: true }),
    };
    const initialize = createRevenueCatInitializer(plugin, 100);
    await expect(initialize()).rejects.toThrow('did not become configured');
    await expect(initialize()).resolves.toBe(plugin);
    expect(plugin.configure).toHaveBeenCalledTimes(2);
  });

  it('recovers after configure rejects without retaining the failed attempt', async () => {
    resetRevenueCatInitializationForTests();
    const plugin = {
      configure: vi.fn().mockRejectedValueOnce(new Error('bridge unavailable')).mockResolvedValueOnce(undefined),
      isConfigured: vi.fn(async () => ({ isConfigured: true })),
    };
    const initialize = createRevenueCatInitializer(plugin, 100);
    await expect(initialize()).rejects.toThrow('bridge unavailable');
    await expect(initialize()).resolves.toBe(plugin);
    expect(plugin.configure).toHaveBeenCalledTimes(2);
  });

  it('bounds a configure bridge call that never resolves', async () => {
    resetRevenueCatInitializationForTests();
    const plugin = {
      configure: vi.fn(() => new Promise<void>(() => undefined)),
      isConfigured: vi.fn(async () => ({ isConfigured: true })),
    };
    await expect(createRevenueCatInitializer(plugin, 10)()).rejects.toBeInstanceOf(RevenueCatTimeoutError);
    expect(plugin.isConfigured).not.toHaveBeenCalled();
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

  it('bounds a getOfferings call that never resolves', async () => {
    await expect(loadRevenueCatPlans({
      configure: async () => ({ getOfferings: () => new Promise(() => undefined) }),
      timeoutMs: 5,
    })).rejects.toBeInstanceOf(RevenueCatTimeoutError);
  });

  it('reports no packages when the current offering is null', async () => {
    const result = await loadRevenueCatPlans({
      configure: async () => ({ getOfferings: async () => ({ current: null, all: {} }) }),
      timeoutMs: 100,
    });
    expect(result).toEqual({ packages: [], currentOfferingIdentifier: null });
  });

  it('reports no packages when the current offering is empty', async () => {
    const result = await loadRevenueCatPlans({
      configure: async () => ({ getOfferings: async () => ({ current: { identifier: 'default', availablePackages: [] } }) }),
      timeoutMs: 100,
    });
    expect(result.packages).toEqual([]);
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

  it('bounds initialization that never resolves', async () => {
    await expect(loadRevenueCatPlans({
      configure: () => new Promise(() => undefined),
      initializationTimeoutMs: 5,
      timeoutMs: 100,
    })).rejects.toBeInstanceOf(RevenueCatTimeoutError);
  });

  it('allows a successful retry after an offering failure', async () => {
    const getOfferings = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ current: { identifier: 'default', availablePackages: [annualPackage] } });
    const configure = vi.fn(async () => ({ getOfferings }));
    await expect(loadRevenueCatPlans({ configure, timeoutMs: 100 })).rejects.toThrow('offline');
    await expect(loadRevenueCatPlans({ configure, timeoutMs: 100 })).resolves.toMatchObject({ packages: [annualPackage] });
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
