import { describe, expect, it } from 'vitest';
import { analyticsVersion } from './conversionEvents';

describe('existing conversion-events version contract', () => {
  it('allows Android 2.0 events without changing the app or server version contract', () => {
    expect(analyticsVersion('2.0')).toBe('2.0.0');
    expect(analyticsVersion('1.0.157')).toBe('1.0.157');
    expect(analyticsVersion('2.0-beta')).toBeNull();
  });
});
