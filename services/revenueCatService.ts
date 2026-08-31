import { Capacitor, registerPlugin } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Purchases, type CustomerInfo } from '@revenuecat/purchases-capacitor';

const STARTUP_SYNC_KEY = 'mg_rc_startup_sync_v2';
const REVENUECAT_BRIDGE_TIMEOUT_MS = 5_000;
const REVENUECAT_CUSTOMER_INFO_TIMEOUT_MS = 6_000;
const REVENUECAT_RECOVERY_TIMEOUT_MS = 3_000;
export const REVENUECAT_OFFERINGS_TIMEOUT_MS = 10_000;
export const REVENUECAT_PAYWALL_TIMEOUT_MS = 12_000;

export interface RevenueCatNativeStatus {
  attempted: boolean;
  succeeded: boolean;
  configured: boolean;
  errorCode: string;
  elapsedMs: number;
  pluginRegistered: boolean;
  versionCode: number;
  versionName: string;
}

interface RevenueCatDiagnosticsPlugin {
  getStatus(): Promise<RevenueCatNativeStatus>;
  ensureConfigured(): Promise<RevenueCatNativeStatus>;
  recoverConnection(): Promise<RevenueCatNativeStatus>;
}

// Intentionally static: the Play WebView must never fetch a lazy RevenueCat chunk.
const RevenueCatDiagnostics = registerPlugin<RevenueCatDiagnosticsPlugin>('RevenueCatDiagnostics');

let nativeReadinessPromise: Promise<RevenueCatNativeStatus> | null = null;
let verifiedNativeStatus: RevenueCatNativeStatus | null = null;
let nativeDiagnosticBase: Record<string, string | number | boolean> = {};
let latestDiagnostic: Record<string, string | number | boolean> = {
  operation: 'RC_NOT_STARTED',
  platform: 'android',
};

export class RevenueCatTimeoutError extends Error {
  readonly code: string;

  constructor(operation: string, code = 'RC_OPERATION_TIMEOUT') {
    super(`${operation} timed out. Please check your connection and try again.`);
    this.code = code;
    this.name = 'RevenueCatTimeoutError';
  }
}

export class RevenueCatOperationError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'RevenueCatOperationError';
  }
}

export function withRevenueCatTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string,
  code = 'RC_OPERATION_TIMEOUT',
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new RevenueCatTimeoutError(operation, code)), timeoutMs);
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
  if (operation === 'RC_BRIDGE_READY') {
    nativeDiagnosticBase = { ...details };
  }
  latestDiagnostic = { ...nativeDiagnosticBase, operation, platform: 'android', ...details };
  console.info('[RevenueCat]', latestDiagnostic);
}

function statusDetails(status: RevenueCatNativeStatus): Record<string, string | number | boolean> {
  return {
    configured: status.configured,
    bootstrapAttempted: status.attempted,
    bootstrapSucceeded: status.succeeded,
    nativeErrorCode: status.errorCode,
    nativeElapsedMs: status.elapsedMs,
    pluginRegistered: status.pluginRegistered,
    versionCode: status.versionCode,
    versionName: status.versionName,
  };
}

export function getRevenueCatDiagnosticSummary(): string {
  const allowedOrder = [
    'operation', 'platform', 'versionName', 'versionCode', 'configured',
    'bootstrapAttempted', 'bootstrapSucceeded', 'pluginRegistered',
    'currentOffering', 'packageCount', 'code', 'nativeErrorCode',
  ];
  return allowedOrder
    .filter(key => latestDiagnostic[key] !== undefined)
    .map(key => `${key}=${String(latestDiagnostic[key])}`)
    .join('; ');
}

export function getRevenueCatUserFacingError(error: unknown): { code: string; message: string } {
  const sanitized = sanitizedRevenueCatError(error);
  const messages: Record<string, string> = {
    RC_BRIDGE_TIMEOUT: 'The subscription connection did not respond. Please retry.',
    RC_CONNECTION_RECOVERY_TIMEOUT: 'Google Play did not reconnect. Please retry after reopening the app.',
    RC_NATIVE_NOT_CONFIGURED: 'The subscription service could not start on this device.',
    RC_CUSTOMER_INFO_TIMEOUT: 'Google Play account verification timed out. Please retry.',
    RC_OFFERINGS_TIMEOUT: 'Google Play plans took too long to load. Please retry.',
    RC_PAYWALL_TIMEOUT: 'Google Play plans took too long to load. Please retry.',
    RC_CURRENT_OFFERING_MISSING: 'No subscription offering is currently available.',
    RC_PACKAGES_EMPTY: 'Google Play returned no subscription plans for this account.',
  };
  return { code: sanitized.code, message: messages[sanitized.code] ?? sanitized.message };
}

export function resetRevenueCatInitializationForTests(): void {
  nativeReadinessPromise = null;
  verifiedNativeStatus = null;
  nativeDiagnosticBase = {};
  latestDiagnostic = { operation: 'RC_NOT_STARTED', platform: 'android' };
}

export function hasVerifiedSubscription(customerInfo: CustomerInfo | any): boolean {
  return Boolean(customerInfo?.entitlements?.active?.pro || (customerInfo?.activeSubscriptions?.length || 0) > 0);
}

export function packageHasFreeTrial(pkg: any): boolean {
  const product = pkg?.product;
  return Boolean(product?.defaultOption?.freePhase || product?.introPrice?.price === 0);
}

async function ensureNativeRevenueCat(
  ensureConfigured: () => Promise<RevenueCatNativeStatus> = () => RevenueCatDiagnostics.ensureConfigured(),
  timeoutMs = REVENUECAT_BRIDGE_TIMEOUT_MS,
): Promise<RevenueCatNativeStatus> {
  if (verifiedNativeStatus?.configured) return verifiedNativeStatus;
  if (!nativeReadinessPromise) {
    logRevenueCat('RC_BRIDGE_START', { configured: false, keyType: 'google_public' });
    nativeReadinessPromise = withRevenueCatTimeout(
      ensureConfigured(),
      timeoutMs,
      'RevenueCat native bridge',
      'RC_BRIDGE_TIMEOUT',
    )
      .then(status => {
        logRevenueCat('RC_BRIDGE_READY', statusDetails(status));
        if (!status.configured) {
          throw new RevenueCatOperationError(
            'RC_NATIVE_NOT_CONFIGURED',
            'The subscription service could not start on this device.',
          );
        }
        verifiedNativeStatus = status;
        return status;
      })
      .catch(error => {
        const sanitized = sanitizedRevenueCatError(error);
        logRevenueCat(error instanceof RevenueCatTimeoutError ? 'RC_BRIDGE_TIMEOUT' : 'RC_BRIDGE_ERROR', {
          configured: false,
          ...sanitized,
        });
        throw error;
      })
      .finally(() => {
        nativeReadinessPromise = null;
      });
  }
  return nativeReadinessPromise;
}

export async function configureRevenueCat(options: {
  ensureConfigured?: () => Promise<RevenueCatNativeStatus>;
  bridgeTimeoutMs?: number;
} = {}): Promise<any | null> {
  if (Capacitor.getPlatform() !== 'android') return null;
  await ensureNativeRevenueCat(options.ensureConfigured, options.bridgeTimeoutMs);
  return Purchases;
}

export interface RevenueCatPlansResult {
  packages: any[];
  currentOfferingIdentifier: string;
}

export function normalizeRevenueCatOfferings(result: any): any {
  return result?.offerings ?? result;
}

async function recoverNativeRevenueCatConnection(
  recoverConnection: () => Promise<RevenueCatNativeStatus> = () => RevenueCatDiagnostics.recoverConnection(),
): Promise<void> {
  logRevenueCat('RC_CONNECTION_RECOVERY_START', { configured: Boolean(verifiedNativeStatus?.configured) });
  try {
    const status = await withRevenueCatTimeout(
      recoverConnection(),
      REVENUECAT_RECOVERY_TIMEOUT_MS,
      'Google Play connection recovery',
      'RC_CONNECTION_RECOVERY_TIMEOUT',
    );
    logRevenueCat('RC_CONNECTION_RECOVERY_SUCCESS', statusDetails(status));
    if (!status.configured) {
      verifiedNativeStatus = null;
      throw new RevenueCatOperationError(
        'RC_NATIVE_NOT_CONFIGURED',
        'The subscription service could not restart on this device.',
      );
    }
    verifiedNativeStatus = status;
  } catch (error) {
    const sanitized = sanitizedRevenueCatError(error);
    logRevenueCat(error instanceof RevenueCatTimeoutError ? 'RC_CONNECTION_RECOVERY_TIMEOUT' : 'RC_CONNECTION_RECOVERY_ERROR', {
      configured: false,
      ...sanitized,
    });
    throw error;
  }
}

export async function loadRevenueCatPlans(options: {
  configure?: () => Promise<any | null>;
  recoverConnection?: () => Promise<RevenueCatNativeStatus>;
  recoverBeforeLoad?: boolean;
  timeoutMs?: number;
  totalTimeoutMs?: number;
} = {}): Promise<RevenueCatPlansResult> {
  try {
    return await withRevenueCatTimeout((async () => {
      if (options.recoverBeforeLoad) {
        await recoverNativeRevenueCatConnection(options.recoverConnection);
      }

      const PurchasesPlugin = await (options.configure ?? configureRevenueCat)();
      if (!PurchasesPlugin) {
        throw new RevenueCatOperationError('RC_NATIVE_NOT_CONFIGURED', 'Purchases are unavailable on this platform.');
      }

      // Offerings are the only prerequisite for rendering the paywall. Waiting for
      // CustomerInfo first can strand this request behind a hung BillingClient call.
      logRevenueCat('RC_GET_OFFERINGS_START', { configured: true });
      const rawResult = await withRevenueCatTimeout(
        PurchasesPlugin.getOfferings(),
        options.timeoutMs ?? REVENUECAT_OFFERINGS_TIMEOUT_MS,
        'Google Play plan retrieval',
        'RC_OFFERINGS_TIMEOUT',
      );
      const offerings = normalizeRevenueCatOfferings(rawResult);
      const current = offerings?.current ?? null;
      if (!current) {
        throw new RevenueCatOperationError('RC_CURRENT_OFFERING_MISSING', 'No subscription offering is currently available.');
      }
      const packages = Array.isArray(current.availablePackages) ? current.availablePackages : [];
      if (!packages.length) {
        throw new RevenueCatOperationError('RC_PACKAGES_EMPTY', 'Google Play returned no subscription plans for this account.');
      }
      logRevenueCat('RC_GET_OFFERINGS_SUCCESS', {
        configured: true,
        currentOffering: true,
        packageCount: packages.length,
      });
      return {
        packages,
        currentOfferingIdentifier: current.identifier ?? 'unknown',
      };
    })(), options.totalTimeoutMs ?? REVENUECAT_PAYWALL_TIMEOUT_MS, 'Subscription plan loading', 'RC_PAYWALL_TIMEOUT');
  } catch (error) {
    const sanitized = sanitizedRevenueCatError(error);
    const operation = error instanceof RevenueCatTimeoutError
      ? (error.code === 'RC_PAYWALL_TIMEOUT' ? 'RC_PAYWALL_TIMEOUT' : 'RC_GET_OFFERINGS_TIMEOUT')
      : 'RC_GET_OFFERINGS_ERROR';
    logRevenueCat(operation, {
      configured: true,
      ...sanitized,
    });
    throw error;
  }
}

export async function getStartupSubscriptionStatus(options: {
  configure?: () => Promise<any | null>;
  timeoutMs?: number;
} = {}): Promise<{ isSubscribed: boolean; customerInfo: any | null }> {
  const PurchasesPlugin = await (options.configure ?? configureRevenueCat)();
  if (!PurchasesPlugin) return { isSubscribed: false, customerInfo: null };
  logRevenueCat('RC_STARTUP_CUSTOMER_INFO_START', { configured: true });
  const { customerInfo } = await withRevenueCatTimeout<{ customerInfo: any }>(
    PurchasesPlugin.getCustomerInfo(),
    options.timeoutMs ?? REVENUECAT_CUSTOMER_INFO_TIMEOUT_MS,
    'Startup subscription verification',
    'RC_CUSTOMER_INFO_TIMEOUT',
  );
  if (hasVerifiedSubscription(customerInfo)) {
    await Preferences.set({ key: STARTUP_SYNC_KEY, value: 'healthy' });
    logRevenueCat('RC_STARTUP_CUSTOMER_INFO_SUCCESS', { configured: true, activeSubscription: true });
    return { isSubscribed: true, customerInfo };
  }
  // Do not run syncPurchases during startup. RevenueCat manages purchases made
  // through its SDK; explicit restoration remains available on the first screen.
  // A startup sync can keep BillingClient busy after the UI timeout and block the
  // later getOfferings request used by the paywall.
  logRevenueCat('RC_STARTUP_CUSTOMER_INFO_SUCCESS', { configured: true, activeSubscription: false });
  return { isSubscribed: false, customerInfo };
}

export async function restoreRevenueCatPurchases(options: {
  configure?: () => Promise<any | null>;
  timeoutMs?: number;
} = {}): Promise<{ restored: boolean; customerInfo: any | null }> {
  const timeoutMs = options.timeoutMs ?? REVENUECAT_OFFERINGS_TIMEOUT_MS;
  const PurchasesPlugin = await (options.configure ?? configureRevenueCat)();
  if (!PurchasesPlugin) return { restored: false, customerInfo: null };
  await withRevenueCatTimeout(PurchasesPlugin.restorePurchases(), timeoutMs, 'Purchase restoration', 'RC_RESTORE_TIMEOUT');
  const { customerInfo } = await withRevenueCatTimeout<{ customerInfo: any }>(
    PurchasesPlugin.getCustomerInfo(),
    timeoutMs,
    'Subscription verification',
    'RC_CUSTOMER_INFO_TIMEOUT',
  );
  const restored = hasVerifiedSubscription(customerInfo);
  if (restored) await Preferences.set({ key: STARTUP_SYNC_KEY, value: 'healthy' });
  return { restored, customerInfo };
}
