import type { AnalysisShareSummary } from './analysisShareCard';

/** Only use a recorded score: never derive one from prose or confidence. */
export function journalShareSummary(entry: any): AnalysisShareSummary | null {
  if (!entry) return null;
  const saved = entry.shareSummary || entry.aiAnalysis?.shareSummary;
  const diagnosis = entry.diagnosisData || entry.aiAnalysis?.diagnosisData;
  let candidate = saved || (diagnosis ? { kind: 'photo', headline: diagnosis.diagnosis, score: diagnosis.healthScore } : null);
  if (!candidate && typeof entry.notes === 'string') {
    // Compatibility with video reports saved before share metadata was persisted.
    const match = /^Video Plant Health Report: (.+) \((\d{1,3})\/100(?:, [\d.]+% confidence)?\)/.exec(entry.notes);
    if (match) candidate = { kind: 'video', headline: match[1], score: Number(match[2]) };
    if (!candidate && entry.notes.startsWith('🌿 **MasterGrowbot Diagnosis**')) {
      const headline = /^🩺 \*\*Diagnosis\*\*: (.+)$/m.exec(entry.notes);
      const score = /^❤️ \*\*Health Score\*\*: (\d{1,3})\/100/m.exec(entry.notes);
      if (headline && score) candidate = { kind: 'photo', headline: headline[1], score: Number(score[1]) };
    }
  }
  if (!candidate || !['photo', 'video'].includes(candidate.kind) || typeof candidate.headline !== 'string' || !candidate.headline.trim() || typeof candidate.score !== 'number' || !Number.isFinite(candidate.score) || candidate.score < 0 || candidate.score > 100) return null;
  return { kind: candidate.kind, headline: candidate.headline, score: candidate.score, imageUrl: entry.image || entry.imageUri || undefined };
}
