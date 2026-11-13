import { describe, expect, it, vi } from 'vitest';
vi.mock('./supabaseClient', () => ({ supabase: {}, ensureProfileForCurrentUser: vi.fn() }));
import { mapJournalRow } from './dbService';

describe('saved journal analysis', () => {
  it('keeps structured diagnosis data without rendering it as an object string', () => {
    const diagnosis = { diagnosis: 'Leaf stress', healthScore: 42 };
    const entry = mapJournalRow({ ai_analysis: { diagnosisData: diagnosis } });
    expect(entry.diagnosisData).toEqual(diagnosis);
    expect(entry.aiAnalysis).toBeUndefined();
  });
  it('preserves the summary and structured data when both are present', () => {
    const analysis = { summary: 'Check soil moisture.', diagnosisData: { healthScore: 80 } };
    expect(mapJournalRow({ ai_analysis: analysis }).aiAnalysis).toEqual(analysis);
  });
  it('preserves legacy text summaries', () => {
    expect(mapJournalRow({ ai_analysis: 'Check soil moisture.' }).aiAnalysis?.summary).toBe('Check soil moisture.');
  });
  it('does not display an empty metadata object as a summary', () => {
    expect(mapJournalRow({ ai_analysis: {} }).aiAnalysis).toBeUndefined();
  });
});
