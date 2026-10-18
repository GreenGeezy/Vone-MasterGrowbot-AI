export function mediaSelectionError(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String((error as any)?.message || error || '');
  if (/\bcancel(?:led|ed|lation)?\b|user dismissed|no image picked/i.test(message)) return null;
  if (/permission|denied|restricted|not authorized/i.test(message)) return 'Photo access is turned off. Allow Camera or Photos access in iPhone Settings, then try again.';
  return 'Could not open the camera or photo library. Please try again, or choose the other photo option.';
}
