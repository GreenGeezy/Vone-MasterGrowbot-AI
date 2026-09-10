/** Decode only local app media. No remote image fetch and no metadata copying. */
export async function localShareImage(url: string): Promise<HTMLImageElement> {
  if (!/^(data:image\/|blob:)/i.test(url)) throw new Error('Local image required');
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = setTimeout(() => { image.src = ''; reject(new Error('Image preview timed out')); }, 5000);
    image.onload = () => { clearTimeout(timer); resolve(image); };
    image.onerror = () => { clearTimeout(timer); reject(new Error('Image preview unavailable')); };
    image.src = url;
  });
}

/** A single locally decoded video frame, never the video/audio or source metadata. */
export async function videoShareFrame(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true; video.playsInline = true; video.preload = 'auto';
  try {
    return await new Promise(resolve => {
      let finished = false;
      const finish = (value: string | null) => { if (!finished) { finished = true; clearTimeout(timer); resolve(value); } };
      const timer = setTimeout(() => finish(null), 5000);
      video.onerror = () => finish(null);
      video.onloadeddata = () => {
        try {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, 1000 / Math.max(video.videoWidth, video.videoHeight));
          canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
          canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
          canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
          finish(canvas.toDataURL('image/jpeg', 0.85));
        } catch { finish(null); }
      };
      video.src = url; video.load();
    });
  } finally { video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url); }
}
