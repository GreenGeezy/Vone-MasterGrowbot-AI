import { describe, expect, it, vi } from 'vitest';
import { createAuthInitializer } from './supabaseClient';

const session = { access_token: 'redacted', refresh_token: 'redacted', user: { id: 'user-1' } } as any;

describe('Supabase auth startup single-flight', () => {
  it('shares one refresh recovery across concurrent callers', async () => {
    const getSession = vi.fn()
      .mockResolvedValueOnce({ data: { session: null }, error: { code: 'refresh_token_already_used' } })
      .mockResolvedValueOnce({ data: { session }, error: null });
    const signInAnonymously = vi.fn();
    const initialize = createAuthInitializer({ getSession, signInAnonymously } as any, 0);
    const [first, second] = await Promise.all([initialize(), initialize()]);
    expect(first.session).toBe(session);
    expect(second.session).toBe(session);
    expect(getSession).toHaveBeenCalledTimes(2);
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it('creates only one anonymous session when no persisted session exists', async () => {
    const getSession = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
    const signInAnonymously = vi.fn().mockResolvedValue({ data: { session, user: session.user }, error: null });
    const initialize = createAuthInitializer({ getSession, signInAnonymously } as any, 0);
    await Promise.all([initialize(), initialize(), initialize()]);
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('does not replace a persisted session after a refresh error', async () => {
    const error = { code: 'refresh_token_already_used' };
    const getSession = vi.fn().mockResolvedValue({ data: { session: null }, error });
    const signInAnonymously = vi.fn();
    const result = await createAuthInitializer({ getSession, signInAnonymously } as any, 0)();
    expect(result.error).toBe(error);
    expect(signInAnonymously).not.toHaveBeenCalled();
  });
});
