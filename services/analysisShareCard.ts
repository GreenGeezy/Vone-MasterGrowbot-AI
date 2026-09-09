export interface AnalysisShareSummary {
  kind: 'photo' | 'video';
  headline: string;
  score: number;
}

export function analysisCaption(summary: AnalysisShareSummary): string {
  return `My plant check-in 🌿\n${summary.headline.slice(0, 220)}\n\nChecked with MasterGrowbot AI ${summary.kind === 'video' ? 'Premium video analysis' : 'photo analysis'}.\nAI observations, not a confirmed diagnosis.\n\nWhat do you notice? Explore MasterGrowbot AI on the App Store.`;
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

/** Local text-only artwork: excludes raw photo, video, location and profile. */
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
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.fillText('A closer look.', 80, 325); ctx.fillText('A better question.', 80, 425);
  const score = Number.isFinite(summary.score) ? Math.max(0, Math.min(100, Math.round(summary.score))) : null;
  ctx.fillStyle = '#5ce5ac'; ctx.font = 'bold 158px system-ui, sans-serif'; ctx.fillText(score === null ? '—' : String(score), 80, 650);
  ctx.fillStyle = '#b0c6bf'; ctx.font = '28px system-ui, sans-serif'; ctx.fillText('/ 100   AI visual score', 410, 635);
  ctx.fillStyle = '#edf6f1'; ctx.font = 'bold 43px system-ui, sans-serif'; wrapText(ctx, summary.headline, 80, 770, 910, 59, 4);
  ctx.fillStyle = '#8ea9a0'; ctx.font = '25px system-ui, sans-serif'; ctx.fillText('AI observations • Not a confirmed diagnosis', 80, 1050);
  ctx.fillStyle = '#5ce5ac'; ctx.fillRect(80, 1120, 920, 132);
  ctx.fillStyle = '#092c27'; ctx.font = 'bold 38px system-ui, sans-serif'; ctx.fillText('What do you notice?', 115, 1178);
  ctx.font = '26px system-ui, sans-serif'; ctx.fillText('Find MasterGrowbot AI on the App Store', 115, 1220);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Card could not be created')), 'image/png'));
}
