import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

export const APP_STORE_URL = 'https://apps.apple.com/app/id6752221060';
export type ShareOutcome = 'shared' | 'cancelled' | 'unavailable';

export function isShareCancelled(error: unknown): boolean {
  const value = error as { name?: string; message?: string };
  return value?.name === 'AbortError' || /\bcancel(?:led|ed)\b/i.test(value?.message || '');
}

export async function copyAnalysisCaption(caption: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(`${caption}\n\n${APP_STORE_URL}`); return true; }
  catch { return false; }
}

/** No public upload or URL containing a user's report. The user chooses the destination. */
export async function shareAnalysisCard(caption: string, png: Blob | null): Promise<ShareOutcome> {
  let cleanup: (() => Promise<void>) | undefined;
  try {
    if (Capacitor.isNativePlatform()) {
      let files: string[] | undefined;
      if (png) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(',')[1]);
          reader.onerror = () => reject(new Error('Card could not be prepared'));
          reader.readAsDataURL(png);
        });
        const path = `analysis-share-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}.png`;
        const { uri } = await Filesystem.writeFile({ directory: Directory.Cache, path, data });
        cleanup = () => Filesystem.deleteFile({ directory: Directory.Cache, path });
        files = [uri];
      }
      await Share.share({ title: 'My plant check-in • MasterGrowbot AI', text: caption, url: APP_STORE_URL, files, dialogTitle: 'Share Analysis' });
      return 'shared';
    }
    if (!navigator.share) return 'unavailable';
    const file = png ? new File([png], 'mastergrowbot-plant-check-in.png', { type: 'image/png' }) : null;
    const files = file && navigator.canShare?.({ files: [file] }) ? [file] : undefined;
    await navigator.share({ title: 'My plant check-in • MasterGrowbot AI', text: caption, url: APP_STORE_URL, ...(files ? { files } : {}) });
    return 'shared';
  } catch (error) {
    return isShareCancelled(error) ? 'cancelled' : 'unavailable';
  } finally {
    // Native plugin resolves only after the share activity finishes.
    await cleanup?.().catch(() => {});
  }
}
