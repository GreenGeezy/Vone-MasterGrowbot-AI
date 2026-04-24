/**
 * Native-only haptic feedback helpers. All functions are safe to call on web —
 * they dynamic-import the plugin and no-op if unavailable.
 *
 * Use:
 *   import { hapticSelect, hapticImpact, hapticSuccess } from '../utils/haptics';
 *   onClick={() => { hapticSelect(); doThing(); }}
 */
import { Capacitor } from '@capacitor/core';

// Lightweight one-shot for list selections / toggles.
export const hapticSelect = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch { /* plugin missing in dev — ignore */ }
};

// Medium tap — CTA buttons ("Continue", "Get Started").
export const hapticImpact = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch { /* ignore */ }
};

// Success ping — scan complete, purchase success, onboarding done.
export const hapticSuccess = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Success });
  } catch { /* ignore */ }
};

// Error buzz — validation failures.
export const hapticError = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Error });
  } catch { /* ignore */ }
};
