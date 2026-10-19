import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const SESSION_EXPIRED_EVENT = 'nitya:session-expired';
export const SESSION_EXPIRED_MESSAGE = 'Session expired, please sign in again.';

type JwtRefreshResult =
  | { status: 'refreshed'; session: Session }
  | { status: 'transient-failure' }
  | { status: 'terminal-failure' };

type JwtError = { code?: string; message?: string; details?: string };

let refreshInFlight: Promise<JwtRefreshResult> | null = null;

function isJwtRejection(response: Response, error: JwtError): boolean {
  if (response.status !== 401 && response.status !== 403) return false;
  if (error.code === 'PGRST303') return true;
  const message = `${error.message ?? ''} ${error.details ?? ''}`;
  return /(?:jwt|token).*(?:future|expired|invalid|not yet valid|issued at)|(?:future|expired|invalid|not yet valid|issued at).*(?:jwt|token)/i.test(message);
}

function isTransientRefreshFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { name?: string; message?: string; status?: number };
  return candidate.status === 0
    || candidate.status === 408
    || candidate.status === 429
    || (candidate.status !== undefined && candidate.status >= 500)
    || candidate.name === 'AbortError'
    || candidate.name === 'AuthRetryableFetchError'
    || /failed to fetch|network|timeout|offline|load failed/i.test(candidate.message ?? '');
}

function logRefresh(message: string, details: Record<string, string | number | undefined>): void {
  if (import.meta.env.DEV) {
    console.info(`[Supabase] ${message}`, details);
  }
}

async function clearExpiredSession(): Promise<void> {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (error) {
    const details = error && typeof error === 'object'
      ? error as { name?: string; status?: number }
      : {};
    logRefresh('Could not clear the invalid local session.', {
      name: details.name,
      status: details.status,
    });
  }
}

function refreshSessionOnce(): Promise<JwtRefreshResult> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        const result: JwtRefreshResult = isTransientRefreshFailure(error)
          ? { status: 'transient-failure' }
          : { status: 'terminal-failure' };
        logRefresh('Session refresh failed.', {
          name: error.name,
          status: error.status,
          outcome: result.status,
        });
        if (result.status === 'terminal-failure') await clearExpiredSession();
        return result;
      }

      if (!data.session) {
        logRefresh('Session refresh returned no active session.', { outcome: 'terminal-failure' });
        await clearExpiredSession();
        return { status: 'terminal-failure' };
      }

      logRefresh('Session refreshed after the API rejected its JWT.', { outcome: 'refreshed' });
      return { status: 'refreshed', session: data.session };
    } catch (error) {
      const transient = isTransientRefreshFailure(error);
      const details = error && typeof error === 'object'
        ? error as { name?: string; status?: number }
        : {};
      logRefresh('Session refresh threw an error.', {
        name: details.name,
        status: details.status,
        outcome: transient ? 'transient-failure' : 'terminal-failure',
      });
      if (transient) return { status: 'transient-failure' };
      await clearExpiredSession();
      return { status: 'terminal-failure' };
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

function sessionExpiredResponse(): Response {
  return new Response(JSON.stringify({
    code: 'SESSION_EXPIRED',
    message: SESSION_EXPIRED_MESSAGE,
  }), {
    status: 401,
    statusText: 'Unauthorized',
    headers: { 'Content-Type': 'application/json' },
  });
}

function transientRefreshResponse(): Response {
  return new Response(JSON.stringify({
    code: 'NETWORK_ERROR',
    message: 'Network error while refreshing your session.',
  }), {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function authenticatedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request = new Request(input, init);
  const response = await fetch(request.clone());
  const url = new URL(request.url);
  if (url.pathname.includes('/auth/v1/') || (response.status !== 401 && response.status !== 403)) return response;
  if (request.headers.get('Authorization') === `Bearer ${supabaseAnonKey}`) return response;

  let error: JwtError | null = null;
  try {
    error = await response.clone().json() as JwtError;
  } catch {
    return response;
  }
  if (!error || !isJwtRejection(response, error)) return response;

  logRefresh('API rejected an authenticated request JWT.', {
    status: response.status,
    code: error.code,
    path: url.pathname,
  });

  const refresh = await refreshSessionOnce();
  if (refresh.status === 'transient-failure') return transientRefreshResponse();
  if (refresh.status === 'terminal-failure') return sessionExpiredResponse();

  const headers = new Headers(request.headers);
  headers.set('Authorization', `Bearer ${refresh.session.access_token}`);
  const retry = await fetch(new Request(request, { headers }));
  logRefresh('Retried the authenticated request once after session refresh.', {
    status: retry.status,
    path: url.pathname,
  });
  return retry;
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  global: {
    fetch: authenticatedFetch,
  },
});

export { supabase };
