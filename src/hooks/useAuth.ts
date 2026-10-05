import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { friendlyAuthMessage } from '@/lib/authErrors';
import { WEBSITE_URL } from '@/lib/browser';
import { isNative } from '@/lib/capacitor';

export type AuthUser = { id: string; email: string };

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  busy: boolean;
  error: string | null;
  notice: string | null;
};

function extractUser(sessionUser: { id: string; email?: string | undefined } | null): AuthUser | null {
  if (!sessionUser) return null;
  return { id: sessionUser.id, email: sessionUser.email ?? '' };
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, busy: false, error: null, notice: null });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      setState({ user: extractUser(session?.user ?? null), loading: false, busy: false, error: null, notice: null });
    }).catch(() => {
      setState({ user: null, loading: false, busy: false, error: null, notice: null });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((current) => ({
        ...current,
        user: extractUser(session?.user ?? null),
        loading: false,
        busy: false,
        error: session ? null : current.error,
        notice: session ? null : current.notice,
      }));
    });

    return () => { subscription.subscription.unsubscribe(); };
  }, []);

  const clearFeedback = useCallback(() => {
    setState((current) => ({ ...current, error: null, notice: null }));
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setState((current) => ({ ...current, busy: true, error: null, notice: null }));
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setState({ user: null, loading: false, busy: false, error: friendlyAuthMessage(error, 'signup'), notice: null });
        return;
      }
      if (data.user && (data.user.identities?.length ?? 1) === 0) {
        setState({
          user: null,
          loading: false,
          busy: false,
          error: friendlyAuthMessage({ message: 'User already registered' }, 'signup'),
          notice: null,
        });
        return;
      }
      if (data.user && !data.session) {
        setState({
          user: null,
          loading: false,
          busy: false,
          error: null,
          notice: `We sent a confirmation link to ${email}. Open it to finish creating your account, then sign in.`,
        });
        return;
      }
      setState({ user: extractUser(data.session?.user ?? null), loading: false, busy: false, error: null, notice: null });
    } catch {
      setState({ user: null, loading: false, busy: false, error: friendlyAuthMessage({ message: 'network' }, 'signup'), notice: null });
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setState((current) => ({ ...current, busy: true, error: null, notice: null }));
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setState({ user: null, loading: false, busy: false, error: friendlyAuthMessage(error, 'signin'), notice: null });
        return;
      }
      setState({ user: extractUser(data.user ?? null), loading: false, busy: false, error: null, notice: null });
    } catch {
      setState({ user: null, loading: false, busy: false, error: friendlyAuthMessage({ message: 'network' }, 'signin'), notice: null });
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      await supabase.auth.signOut({ scope: 'local' });
    }
    setState({ user: null, loading: false, busy: false, error: null, notice: null });
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    setState((current) => ({ ...current, busy: true, error: null, notice: null }));
    try {
      // On native the WebView origin is http://localhost, so email links must point at the hosted site.
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: isNative() ? WEBSITE_URL : window.location.origin });
      if (error) {
        setState((current) => ({ ...current, busy: false, error: friendlyAuthMessage(error, 'reset'), notice: null }));
        return false;
      }
      setState((current) => ({ ...current, busy: false, error: null, notice: null }));
      return true;
    } catch {
      setState((current) => ({ ...current, busy: false, error: friendlyAuthMessage({ message: 'network' }, 'reset'), notice: null }));
      return false;
    }
  }, []);

  return { ...state, signUp, signIn, signOut, resetPassword, clearFeedback };
}
