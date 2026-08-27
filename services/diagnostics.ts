import { Capacitor } from '@capacitor/core';

const APP_VERSION = '1.0.149';

export function logOperationError(operation: string, error: any, localFallbackUsed: boolean): void {
  console.warn('[Reliability]', {
    operation,
    code: error?.code || error?.status || 'unknown',
    appVersion: APP_VERSION,
    platform: Capacitor.getPlatform(),
    localFallbackUsed,
  });
}

export function isTransientPersistenceError(error: any): boolean {
  const status = Number(error?.status || error?.statusCode || 0);
  const code = String(error?.code || '');
  if (status === 408 || status === 429 || status >= 500) return true;
  if (['PGRST000', 'PGRST001', 'PGRST002', 'PGRST003'].includes(code)) return true;
  const message = String(error?.message || '').toLowerCase();
  return /network|fetch|timeout|timed out|connection|offline/.test(message);
}
