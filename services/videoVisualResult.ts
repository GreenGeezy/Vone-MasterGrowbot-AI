/** Observation-only contract. Deliberately excludes treatment and cultivation targets. */
export interface VideoVisualResult {
  visualSummary: string;
  severity: 'low' | 'medium' | 'high' | 'uncertain';
  confidence: number;
  healthScore: number;
  healthLabel: 'Needs a closer look' | 'Visible concerns' | 'Mixed visual condition' | 'No obvious concern visible';
  visibleSigns: string[];
  possibleInterpretations: string[];
  areasToInspect: string[];
  environmentSummary: string;
  mediaQuality: string;
  recommendedVerification: string;
}

export function parseVideoVisualResult(input: unknown): VideoVisualResult {
  const invalid = () => new Error('The video assessment could not be read. Please try again.');
  if (typeof input === 'string') {
    if (input.length > 16000) throw invalid();
    try { input = JSON.parse(input); } catch { throw invalid(); }
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw invalid();
  const value = input as Record<string, unknown>;
  const text = (item: unknown): string => {
    if (typeof item !== 'string' || !item.trim() || item.length > 1500) throw invalid();
    return item.trim();
  };
  const list = (item: unknown): string[] => {
    if (!Array.isArray(item) || item.length > 8) throw invalid();
    return item.map(text);
  };
  if (!['low', 'medium', 'high', 'uncertain'].includes(value.severity as string)) throw invalid();
  if (typeof value.confidence !== 'number' || !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 100) throw invalid();
  if (typeof value.healthScore !== 'number' || !Number.isFinite(value.healthScore) || value.healthScore < 0 || value.healthScore > 100) throw invalid();
  if (!['Needs a closer look', 'Visible concerns', 'Mixed visual condition', 'No obvious concern visible'].includes(value.healthLabel as string)) throw invalid();
  // Explicit projection prevents unrelated model fields from entering the result UI.
  // This validates structure; semantic safety also requires the server prompt/output policy.
  return {
    visualSummary: text(value.visualSummary),
    severity: value.severity as VideoVisualResult['severity'],
    confidence: value.confidence,
    healthScore: value.healthScore,
    healthLabel: value.healthLabel as VideoVisualResult['healthLabel'],
    visibleSigns: list(value.visibleSigns),
    possibleInterpretations: list(value.possibleInterpretations),
    areasToInspect: list(value.areasToInspect),
    environmentSummary: text(value.environmentSummary),
    mediaQuality: text(value.mediaQuality),
    recommendedVerification: text(value.recommendedVerification),
  };
}
