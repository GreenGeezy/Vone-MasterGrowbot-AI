import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { initializeSupabaseAuth, supabase } from './supabaseClient';
let pending = 0;
let environment = 'unverified';
/** The existing endpoint accepts three-component versions; Play displays 2.0. */
export function analyticsVersion(version: string): string | null {
  if (/^\d+\.\d+\.\d+$/.test(version)) return version;
  return /^\d+\.\d+$/.test(version) ? `${version}.0` : null;
}
export function setAnalyticsReceipt(info: any) {
  const entries = Object.values(info?.entitlements?.active || {}) as any[];
  environment = entries.some(e => e.isSandbox === true) ? 'sandbox' : entries.some(e => e.isSandbox === false) ? 'production' : 'unverified';
}
/** Best-effort measurement never blocks a purchase or changes identity. */
export function recordEvent(event: string, surface: string, details: Record<string, string> = {}) {
  if (Capacitor.getPlatform() !== 'android' || pending >= 8) return;
  pending++;
  void (async () => {
    const auth = await initializeSupabaseAuth();
    if (!auth.session) return;
    const info = await App.getInfo();
    const version = analyticsVersion(info.version);
    if (!version) return;
    const metadata = Object.fromEntries(Object.entries(details).filter(([k,v]) => ['step','entry_point','variant','product_id','offering_id','outcome','error_category'].includes(k) && /^[a-zA-Z0-9_$.:\-]{1,100}$/.test(v)));
    await supabase.functions.invoke('conversion-events', { body: { id: crypto.randomUUID(), event, surface, version, metadata: { ...metadata, platform: 'android', build: info.build, environment } } });
  })().catch(() => {}).finally(() => { pending--; });
}
