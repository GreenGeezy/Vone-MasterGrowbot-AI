import { requestEdge } from './edgeRequest';
import { parseVideoVisualResult, VideoVisualResult } from './videoVisualResult';

export const VIDEO_MAX_BYTES = 8 * 1024 * 1024;
export const VIDEO_MAX_SECONDS = 20;
export const VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime'];

export async function videoDuration(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<number>((resolve, reject) => {
      const media = document.createElement('video');
      const finish = (error?: Error) => {
        clearTimeout(timer);
        media.onloadedmetadata = null;
        media.onerror = null;
        const duration = media.duration;
        media.removeAttribute('src');
        media.load();
        if (error) reject(error); else resolve(duration);
      };
      const timer = setTimeout(() => finish(new Error('This video took too long to open. Please choose it again.')), 10000);
      media.preload = 'metadata';
      media.onloadedmetadata = () => finish();
      media.onerror = () => finish(new Error('This video could not be read. Choose an MP4 or MOV video.'));
      media.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function inferredMimeType(file: File) {
  if (VIDEO_MIME_TYPES.includes(file.type.toLowerCase())) return file.type.toLowerCase();
  if (/\.mov$/i.test(file.name)) return 'video/quicktime';
  if (/\.mp4$/i.test(file.name)) return 'video/mp4';
  return '';
}

export async function validateVideo(file: File): Promise<{ mimeType: string; duration: number }> {
  const mimeType = inferredMimeType(file);
  if (!mimeType) throw new Error('Choose an MP4 or MOV video.');
  if (file.size <= 0 || file.size > VIDEO_MAX_BYTES) throw new Error('Choose a video smaller than 8 MB.');
  const duration = await videoDuration(file);
  if (!Number.isFinite(duration) || duration <= 0 || duration > VIDEO_MAX_SECONDS + 0.5) {
    throw new Error('Choose a video that is 20 seconds or shorter.');
  }
  return { mimeType, duration };
}

async function fileToBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

export class VideoAccessError extends Error {
  constructor(message: string, public code: string) { super(message); this.name = 'VideoAccessError'; }
}

export async function edgeError(error: any): Promise<Error> {
  try {
    const response = error?.context as Response | undefined;
    const payload = response ? await response.clone().json() : null;
    if (payload?.error) return new VideoAccessError(payload.error, payload.code || 'unknown');
  } catch { /* use the SDK message */ }
  return new Error(error?.message || 'Video analysis could not be completed.');
}

export async function checkVideoAccess(): Promise<boolean> {
  let data;
  try { data = await requestEdge({ mode: 'premium_access' }, 20000); }
  catch (error) {
    const cause = await edgeError(error);
    if (cause instanceof VideoAccessError && cause.code === 'premium_required') return false;
    throw cause;
  }
  if (data?.premium !== true) throw new Error('Premium verification is unavailable. Please try again.');
  return true;
}

export interface VideoAnalysisContext {
  strain?: string;
  growMethod?: 'Indoor' | 'Outdoor' | 'Greenhouse';
}

export async function analyzePlantVideo(file: File, signal: AbortSignal, context: VideoAnalysisContext = {}): Promise<VideoVisualResult> {
  const { mimeType } = await validateVideo(file);
  const fileData = await fileToBase64(file);
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  let data;
  try {
    data = await requestEdge({ mode: 'video_visual_analysis', mimeType, fileData, strain: context.strain, growMethod: context.growMethod }, 110000, signal);
  } catch (error) {
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    throw await edgeError(error);
  }
  return parseVideoVisualResult(data?.result);
}
