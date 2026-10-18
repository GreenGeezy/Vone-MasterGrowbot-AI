import { CONFIG } from './config';

/** Saved reports may reopen an image from our existing app storage only. */
export function isSavedReportImage(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.origin === new URL(CONFIG.SUPABASE_URL).origin &&
      parsed.pathname.startsWith('/storage/v1/object/public/user_uploads/') && !parsed.username && !parsed.password;
  } catch { return false; }
}

/** Decode a local photo or an app-owned saved report image; never copy metadata. */
export async function localShareImage(url: string): Promise<HTMLImageElement> {
  const savedImage = isSavedReportImage(url);
  if (!savedImage && !/^(data:image\/|blob:)/i.test(url)) throw new Error('App image required');
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (savedImage) image.crossOrigin = 'anonymous';
    const timer = setTimeout(() => { image.src = ''; reject(new Error('Image preview timed out')); }, 5000);
    image.onload = () => { clearTimeout(timer); resolve(image); };
    image.onerror = () => { clearTimeout(timer); reject(new Error('Image preview unavailable')); };
    image.src = url;
  });
}
