import { initializeSupabaseSession, supabase } from './supabaseClient';
import { CONFIG } from './config';

/** One deadline covers session recovery, transport and response parsing. Only a
 * rejected JWT can be retried: never replay an inference after a network timeout. */
export function createEdgeRequester(deps: {
  session: () => Promise<any>;
  refresh: () => Promise<any>;
  fetch: typeof fetch;
  url: string;
  key: string;
}) {
  return async (body: Record<string, unknown>, timeout: number, signal?: AbortSignal): Promise<any> => {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
    const timer = setTimeout(cancel, timeout);
    let rejectAbort: () => void;
    const aborted = new Promise<never>((_, reject) => {
      rejectAbort = () => reject(signal?.aborted
        ? new DOMException('Cancelled', 'AbortError')
        : new Error('The connection took too long. Please try again.'));
      controller.signal.addEventListener('abort', rejectAbort, { once: true });
      if (controller.signal.aborted) rejectAbort();
    });
    const run = async () => {
      let session = await deps.session();
      const userId = session?.user?.id;
      for (let attempt = 0; attempt < 2; attempt++) {
        if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        if (!session?.access_token || !userId || session.user.id !== userId) {
          throw new Error('Your saved app session is unavailable. Reopen the app and try again.');
        }
        const response = await deps.fetch(`${deps.url}/functions/v1/gemini-v3`, {
          method: 'POST', signal: controller.signal,
          headers: { apikey: deps.key, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (response.status === 401 && attempt === 0) {
          const refreshed = await deps.refresh();
          if (refreshed.error) throw refreshed.error;
          session = refreshed.data?.session;
          continue;
        }
        if (!response.ok) {
          const payload = await response.clone().json().catch(() => null);
          throw Object.assign(new Error(payload?.error || payload?.message || `Request failed (${response.status}). Please try again.`), {
            code: payload?.code, status: response.status, context: response,
          });
        }
        return await response.json();
      }
    };
    try { return await Promise.race([run(), aborted]); }
    finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      controller.signal.removeEventListener('abort', rejectAbort!);
    }
  };
}

export const requestEdge = createEdgeRequester({
  session: initializeSupabaseSession,
  refresh: () => supabase.auth.refreshSession(),
  fetch: (input, init) => fetch(input, init),
  url: CONFIG.SUPABASE_URL,
  key: CONFIG.SUPABASE_ANON_KEY,
});
