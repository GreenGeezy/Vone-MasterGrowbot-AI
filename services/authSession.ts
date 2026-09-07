/** Share pending auth work, but never cache an access token across refreshes. */
export function createSessionInitializer(auth: {
  getSession: () => PromiseLike<any>;
  signInAnonymously: () => PromiseLike<any>;
}, identity?: { exists: () => boolean; remember: () => void }) {
  let pending: Promise<any> | null = null;
  return () => {
    if (!pending) {
      pending = (async () => {
        const hadIdentity = identity?.exists();
        const existing = await auth.getSession();
        // A failed refresh is not evidence that this is a new installation.
        if (existing.error) throw existing.error;
        if (existing.data?.session) {
          identity?.remember();
          return existing.data.session;
        }
        if (hadIdentity) throw new Error('Saved session is unavailable; refusing to replace existing identity');
        const created = await auth.signInAnonymously();
        if (created.error) throw created.error;
        if (!created.data?.session?.user) throw new Error('No authenticated session returned');
        identity?.remember();
        return created.data.session;
      })().finally(() => { pending = null; });
    }
    return pending;
  };
}
