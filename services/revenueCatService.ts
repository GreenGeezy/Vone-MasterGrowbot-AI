import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import type { CustomerInfo } from '@revenuecat/purchases-capacitor';

const ANDROID_REVENUECAT_KEY = 'goog_kqOynvNRCABzUPrpfyFvlMvHUna';
const STARTUP_SYNC_KEY = 'mg_rc_startup_sync_v2';
const REVENUECAT_INITIALIZATION_TIMEOUT_MS = 10_000;
const REVENUECAT_NATIVE_OPERATION_TIMEOUT_MS = 4_000;
export const REVENUECAT_OFFERINGS_TIMEOUT_MS = 12_000;
let configurationWorkPromise: Promise<any> | null = null;
let configuredPurchases: any | null = null;

export class RevenueCatTimeoutError extends Error {
  readonly code = 'REVENUECAT_TIMEOUT';

  constructor(operation: string) {
    super(`${operation} timed out. Please check your connection and try again.`);
    this.name = 'RevenueCatTimeoutError';
  }
}

export function withRevenueCatTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new RevenueCatTimeoutError(operation)), timeoutMs);
    promise.then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); },
    );
  });
}

function sanitizedRevenueCatError(error: unknown): { code: string; message: string } {
  const candidate = error as { code?: unknown; readableErrorCode?: unknown; message?: unknown } | null;
  const rawCode = candidate?.readableErrorCode ?? candidate?.code ?? 'UNKNOWN';
  const rawMessage = candidate?.message ?? 'RevenueCat operation failed';
  return {
    code: String(rawCode).replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 80) || 'UNKNOWN',
    message: String(rawMessage)
      .replace(/\b(?:goog|appl|test)_[A-Za-z0-9_-]+\b/g, '[redacted-key]')
      .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]')
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]')
      .replace(/[\r\n]+/g, ' ')
      .slice(0, 240),
  };
}

function logRevenueCat(operation: string, details: Record<string, string | number | boolean>): void {
  console.info('[RevenueCat]', { operation, platform: 'android', ...details });
}

async function runNativeOperation<T>(
  operation: 'RC_CONFIGURE',
  work: () => Promise<T> | T,
  timeoutMs = REVENUECAT_NATIVE_OPERATION_TIMEOUT_MS,
): Promise<T> {
  const startedAt = Date.now();
  logRevenueCat(`${operation}_START`, { configured: Boolean(configuredPurchases) });
  try {
    const result = await withRevenueCatTimeout(Promise.resolve().then(work), timeoutMs, operation);
    logRevenueCat(`${operation}_SUCCESS`, { elapsedMs: Date.now() - startedAt, configured: true });
    return result;
  } catch (error) {
    const sanitized = sanitizedRevenueCatError(error);
    logRevenueCat(error instanceof RevenueCatTimeoutError ? `${operation}_TIMEOUT` : `${operation}_ERROR`, {
      elapsedMs: Date.now() - startedAt,
      ...sanitized,
    });
    throw error;
  }
}

export interface RevenueCatNativePlugin {
  configure(options: { apiKey: string }): Promise<void> | void;
}

async function initializeNativePurchases(
  Purchases: RevenueCatNativePlugin,
  nativeTimeoutMs = REVENUECAT_NATIVE_OPERATION_TIMEOUT_MS,
): Promise<any> {
  // The postinstall patch corrects purchases-capacitor 11.3.2's Android
  // configure annotation from RETURN_NONE to RETURN_PROMISE. This await now
  // resolves only after the native plugin has configured Purchases and called
  // call.resolve(). Do not gate configuration on isConfigured(): that bridge
  // method is the operation that remained unresolved on the affected devices.
  await runNativeOperation(
    'RC_CONFIGURE',
    () => Purchases.configure({ apiKey: ANDROID_REVENUECAT_KEY }),
    nativeTimeoutMs,
  );
  configuredPurchases = Purchases;
  return Purchases;
}

/** Test seam for the native initialization state machine. */
export function createRevenueCatInitializer(Purchases: RevenueCatNativePlugin, timeoutMs = REVENUECAT_INITIALIZATION_TIMEOUT_MS) {
  let attempt: Promise<any> | null = null;
  return () => {
    if (configuredPurchases) return Promise.resolve(configuredPurchases);
    if (!attempt) {
      attempt = withRevenueCatTimeout(initializeNativePurchases(Purchases, timeoutMs), timeoutMs + 50, 'Subscription service initialization')
        .finally(() => { attempt = null; });
    }
    return attempt;
  };
}

export function resetRevenueCatInitializationForTests(): void {
  configurationWorkPromise = null;
  configuredPurchases = null;
}

export function hasVerifiedSubscription(customerInfo: CustomerInfo | any): boolean {
  return Boolean(customerInfo?.entitlements?.active?.pro || (customerInfo?.activeSubscriptions?.length || 0) > 0);
}

/**
 * RevenueCat filters Google Play subscriptionOptions to offers for which the
 * current Play account is eligible. purchasePackage() uses defaultOption, so
 * the paywall must only advertise the trial attached to that exact option.
 */
export function packageHasFreeTrial(pkg: any): boolean {
  const product = pkg?.product;
  return Boolean(product?.defaultOption?.freePhase || product?.introPrice?.price === 0);
}

export async function configureRevenueCat(): Promise<any | null> {
  if (Capacitor.getPlatform() !== 'android') return null;
  if (configuredPurchases) return configuredPurchases;
  if (!configurationWorkPromise) {
    const startedAt = Date.now();
    logRevenueCat('RC_INIT_START', { configured: false, keyType: 'google_public' });
    const work = import('@revenuecat/purchases-capacitor')
      .then(({ Purchases }) => initializeNativePurchases(Purchases));
    configurationWorkPromise = work.catch(error => {
      const sanitized = sanitizedRevenueCatError(error);
      logRevenueCat(error instanceof RevenueCatTimeoutError ? 'RC_INIT_TIMEOUT' : 'RC_INIT_ERROR', {
        configured: false,
        elapsedMs: Date.now() - startedAt,
        ...sanitized,
      });
      throw error;
    }).finally(() => {
      // Successful state is cached separately. Failed/timed-out attempts must
      // be discarded so Retry never inherits a permanently pending Promise.
      configurationWorkPromise = null;
    });
  }
  const Purchases = await withRevenueCatTimeout(
    configurationWorkPromise,
    REVENUECAT_INITIALIZATION_TIMEOUT_MS,
    'Subscription service initialization',
  );
  logRevenueCat('RC_INIT_SUCCESS', { configured: true, keyType: 'google_public' });
  return Purchases;
}

export interface RevenueCatPlansResult {
  packages: any[];
  currentOfferingIdentifier: string | null;
}

/** Supports both the documented return shape and the wrapper emitted by some 11.x native bridges. */
export function normalizeRevenueCatOfferings(result: any): any {
  return result?.offerings ?? result;
}

export async function loadRevenueCatPlans(options: {
  configure?: () => Promise<any | null>;
  initializationTimeoutMs?: number;
  timeoutMs?: number;
} = {}): Promise<RevenueCatPlansResult> {
  const configure = options.configure ?? configureRevenueCat;
  const timeoutMs = options.timeoutMs ?? REVENUECAT_OFFERINGS_TIMEOUT_MS;
  const Purchases = await withRevenueCatTimeout(
    configure(),
    options.initializationTimeoutMs ?? REVENUECAT_INITIALIZATION_TIMEOUT_MS,
    'Subscription service initialization',
  );
  if (!Purchases) throw new Error('Purchases are unavailable on this platform.');

  logRevenueCat('RC_GET_OFFERINGS_START', { configured: true });
  try {
    const rawResult = await withRevenueCatTimeout(
      Purchases.getOfferings(),
      timeoutMs,
      'Google Play plan retrieval',
    );
    const offerings = normalizeRevenueCatOfferings(rawResult);
    const current = offerings?.current ?? null;
    const packages = Array.isArray(current?.availablePackages) ? current.availablePackages : [];
    logRevenueCat('RC_GET_OFFERINGS_SUCCESS', {
      configured: true,
      currentOffering: Boolean(current),
      packageCount: packages.length,
    });
    return {
      packages,
      currentOfferingIdentifier: current?.identifier ?? null,
    };
  } catch (error) {
    const sanitized = sanitizedRevenueCatError(error);
    logRevenueCat(error instanceof RevenueCatTimeoutError ? 'RC_GET_OFFERINGS_TIMEOUT' : 'RC_GET_OFFERINGS_ERROR', {
      configured: true,
      ...sanitized,
    });
    throw error;
  }
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

export async function restoreRevenueCatPurchases(options: {
  configure?: () => Promise<any | null>;
  timeoutMs?: number;
} = {}): Promise<{ restored: boolean; customerInfo: any | null }> {
  const timeoutMs = options.timeoutMs ?? REVENUECAT_OFFERINGS_TIMEOUT_MS;
  const Purchases = await withRevenueCatTimeout(
    (options.configure ?? configureRevenueCat)(),
    timeoutMs,
    'Subscription service initialization',
  );
  if (!Purchases) return { restored: false, customerInfo: null };
  await withRevenueCatTimeout(Purchases.restorePurchases(), timeoutMs, 'Purchase restoration');
  const { customerInfo } = await withRevenueCatTimeout<{ customerInfo: any }>(
    Purchases.getCustomerInfo(),
    timeoutMs,
    'Subscription verification',
  );
  const restored = hasVerifiedSubscription(customerInfo);
  if (restored) await Preferences.set({ key: STARTUP_SYNC_KEY, value: 'healthy' });
  return { restored, customerInfo };
}
