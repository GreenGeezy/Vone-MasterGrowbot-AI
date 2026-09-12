/** Observation-only contract. Deliberately excludes treatment and cultivation targets. */
export interface VideoVisualResult {
  visualSummary: string;
  growthStage: string;
  severity: 'low' | 'medium' | 'high' | 'uncertain';
  confidence: number;
  healthScore: number;
  healthLabel: 'Likely healthy visual pattern' | 'Possible early stress pattern' | 'Likely visible stress' | 'Mixed visual condition';
  visibleSigns: string[];
  possibleInterpretations: string[];
  areasToInspect: string[];
  priorityAction: string;
  careRecommendations: string[];
  growOverview: string;
  growWideChecks: string[];
  environmentSummary: string;
  mediaQuality: string;
  recommendedVerification: string;
}

export function parseVideoVisualResult(input: unknown): VideoVisualResult {
  const invalid = () => new Error('The video assessment could not be read. Please try again.');
  if (typeof input === 'string') {
    if (input.length > 16000) throw invalid();
    try { input = JSON.parse(extractJsonObject(input)); } catch { throw invalid(); }
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw invalid();
  const value = input as Record<string, unknown>;
  const text = (item: unknown): string => {
    if (typeof item !== 'string' || !item.trim() || item.length > 1500) throw invalid();
    return item.trim();
  };
  const list = (item: unknown, minimum = 0): string[] => {
    if (!Array.isArray(item) || item.length < minimum || item.length > 8) throw invalid();
    return item.map(text);
  };
  if (!['low', 'medium', 'high', 'uncertain'].includes(value.severity as string)) throw invalid();
  if (typeof value.confidence !== 'number' || !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 100) throw invalid();
  if (typeof value.healthScore !== 'number' || !Number.isFinite(value.healthScore) || value.healthScore < 0 || value.healthScore > 100) throw invalid();
  if (!['Likely healthy visual pattern', 'Possible early stress pattern', 'Likely visible stress', 'Mixed visual condition'].includes(value.healthLabel as string)) throw invalid();
  // Explicit projection prevents unrelated model fields from entering the result UI.
  // This validates structure; semantic safety also requires the server prompt/output policy.
  return {
    visualSummary: text(value.visualSummary),
    growthStage: text(value.growthStage),
    severity: value.severity as VideoVisualResult['severity'],
    confidence: value.confidence,
    healthScore: value.healthScore,
    healthLabel: value.healthLabel as VideoVisualResult['healthLabel'],
    visibleSigns: list(value.visibleSigns),
    possibleInterpretations: list(value.possibleInterpretations),
    areasToInspect: list(value.areasToInspect),
    priorityAction: text(value.priorityAction),
    careRecommendations: list(value.careRecommendations, 2),
    growOverview: text(value.growOverview),
    growWideChecks: list(value.growWideChecks, 1),
    environmentSummary: text(value.environmentSummary),
    mediaQuality: text(value.mediaQuality),
    recommendedVerification: text(value.recommendedVerification),
  };
}

function extractJsonObject(sourceValue: string): string {
  const source = sourceValue.trim();
  let decodedDirectly = false;
  let direct: unknown;
  try {
    direct = JSON.parse(source);
    decodedDirectly = true;
  } catch { /* Continue with bounded extraction. */ }
  if (decodedDirectly) {
    if (direct && typeof direct === 'object' && !Array.isArray(direct)) return source;
    throw new Error('Expected a JSON object');
  }
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') { inString = true; continue; }
    if (character === '{') { if (depth === 0) start = index; depth += 1; }
    else if (character === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        const candidate = source.slice(start, index + 1);
        try {
          const decoded = JSON.parse(candidate);
          if (decoded && typeof decoded === 'object' && !Array.isArray(decoded)) return candidate;
        } catch { /* Ignore prose braces and continue searching. */ }
      }
    }
  }
  throw new Error('No complete JSON object');
}

export function formatVideoHealthReport(result: VideoVisualResult): string {
  const bullets = (items: string[]) => items.map(item => `- ${item}`).join('\n');
  return [
    `Video Plant Health Report: ${result.healthLabel} (${Math.round(result.healthScore)}/100, ${Math.round(result.confidence)}% confidence)`,
    `Growth stage visible: ${result.growthStage}`,
    `Summary: ${result.visualSummary}`,
    `Priority action: ${result.priorityAction}`,
    `Care recommendations:\n${bullets(result.careRecommendations)}`,
    `Visible observations:\n${bullets(result.visibleSigns.length ? result.visibleSigns : ['No specific visible signs recorded.'])}`,
    `Areas to inspect:\n${bullets(result.areasToInspect)}`,
    `Grow overview: ${result.growOverview}`,
    `Grow-wide checks:\n${bullets(result.growWideChecks)}`,
    `Environment visible in video: ${result.environmentSummary}`,
    `Media quality: ${result.mediaQuality}`,
    `Suggested next visual check: ${result.recommendedVerification}`,
  ].join('\n\n');
}
