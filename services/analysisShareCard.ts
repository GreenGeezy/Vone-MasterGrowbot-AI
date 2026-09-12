import { localShareImage } from './shareMedia';

export interface AnalysisShareSummary {
  kind: 'photo' | 'video';
  headline: string;
  score: number;
  imageUrl?: string;
}

export const SHARE_CTA = 'Download MasterGrowbot AI on the App Store or Google Play and try it free.';
export const TRIAL_TERMS = 'Pro trial for eligible new subscribers. Premium includes Pro; no Premium trial.';

export function captionWithCTA(caption: string): string {
  const body = caption.replace(SHARE_CTA, '').replace(TRIAL_TERMS, '').trim().slice(0, 700);
  return `${body}\n\n${SHARE_CTA}\n${TRIAL_TERMS}`;
}

export function analysisCaption(summary: AnalysisShareSummary): string {
  const lead = summary.kind === 'video'
    ? 'See what MasterGrowbot AI noticed across my plant video.'
    : 'See what MasterGrowbot AI noticed in my plant photo.';
  return `${lead}\n\n${SHARE_CTA}`;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const characters = Array.from(text.replace(/\s+/g, ' ').trim().slice(0, 500));
  let line = '';
  let row = 0;
  for (let i = 0; i < characters.length; i++) {
    if (ctx.measureText(line + characters[i]).width > maxWidth) {
      if (row === maxLines - 1) { ctx.fillText(line.slice(0, -1).trimEnd() + '…', x, y + row * lineHeight); return; }
      const space = line.lastIndexOf(' ');
      if (space > 0) {
        ctx.fillText(line.slice(0, space), x, y + row++ * lineHeight);
        line = line.slice(space + 1) + characters[i];
      } else {
        ctx.fillText(line, x, y + row++ * lineHeight);
        line = characters[i];
      }
    } else line += characters[i];
  }
  ctx.fillText(line, x, y + row * lineHeight);
}

/** Local artwork with an optional original photo or video frame; source metadata excluded. */
export async function createAnalysisShareCard(summary: AnalysisShareSummary): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Card preview is unavailable');
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1350);
  gradient.addColorStop(0, '#092c27'); gradient.addColorStop(1, '#060e1a');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1080, 1350);
  ctx.strokeStyle = '#1c5145'; ctx.lineWidth = 2;
  for (let r = 100; r <= 500; r += 80) { ctx.beginPath(); ctx.arc(1000, 50, r, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = '#5ce5ac'; ctx.font = 'bold 30px system-ui, sans-serif'; ctx.fillText('MASTERGROWBOT AI', 80, 110);
  ctx.fillStyle = '#b0c6bf'; ctx.font = '24px system-ui, sans-serif';
  ctx.fillText(summary.kind === 'video' ? 'PREMIUM VIDEO • PLANT CHECK-IN' : 'PHOTO ANALYSIS • PLANT CHECK-IN', 80, 170);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('My plant. A closer look.', 80, 270);
  ctx.fillStyle = '#12382e'; ctx.fillRect(80, 315, 920, 460);
  if (summary.imageUrl) {
    // Fail visibly if the image cannot be decoded: never quietly omit a promised photo.
    const photo = await localShareImage(summary.imageUrl);
    const scale = Math.min(920 / photo.naturalWidth, 460 / photo.naturalHeight);
    const width = photo.naturalWidth * scale, height = photo.naturalHeight * scale;
    ctx.drawImage(photo, 80 + (920 - width) / 2, 315 + (460 - height) / 2, width, height);
  } else {
    ctx.fillStyle = '#5ce5ac'; ctx.font = 'bold 58px system-ui, sans-serif';
    ctx.fillText('A moment to check in.', 140, 535);
    ctx.font = '30px system-ui, sans-serif'; ctx.fillText('What do you notice?', 140, 595);
  }
  const score = Number.isFinite(summary.score) ? Math.max(0, Math.min(100, Math.round(summary.score))) : null;
  ctx.fillStyle = '#5ce5ac'; ctx.font = 'bold 66px system-ui, sans-serif'; ctx.fillText(score === null ? '—' : String(score), 80, 865);
  ctx.fillStyle = '#b0c6bf'; ctx.font = '26px system-ui, sans-serif'; ctx.fillText('/ 100  Plant score · AI estimate', 230, 853);
  ctx.fillStyle = '#edf6f1'; ctx.font = 'bold 36px system-ui, sans-serif'; wrapText(ctx, summary.headline, 80, 931, 910, 46, 3);

  ctx.fillStyle = '#5ce5ac'; ctx.fillRect(80, 1110, 920, 145);
  ctx.fillStyle = '#092c27'; ctx.font = 'bold 36px system-ui, sans-serif'; ctx.fillText('Download MasterGrowbot AI', 110, 1163);
  ctx.font = '30px system-ui, sans-serif'; ctx.fillText('App Store + Google Play · Try it free*', 110, 1211);
  ctx.fillStyle = '#b0c6bf'; ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('*Pro trial for eligible new subscribers. Premium includes Pro; no Premium trial.', 80, 1298);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Card could not be created')), 'image/png'));
}
