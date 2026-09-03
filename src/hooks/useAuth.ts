import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type AuthUser = { id: string; email: string };

type AuthState = { user: AuthUser | null; loading: boolean; error: string | null };

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      setState({ user: session?.user ? { id: session.user.id, email: session.user.email ?? '' } : null, loading: false, error: null });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setState({ user: session?.user ? { id: session.user.id, email: session.user.email ?? '' } : null, loading: false, error: null });
      })();
    });

    return () => { subscription.subscription.unsubscribe(); };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setState((current) => ({ ...current, loading: true, error: null }));
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setState({ user: null, loading: false, error: error.message }); return; }
    if (data.user && !data.session) {
      setState({ user: null, loading: false, error: 'Check your email to confirm your account.' });
      return;
    }
    setState({ user: data.session?.user ? { id: data.session.user.id, email: data.session.user.email ?? '' } : null, loading: false, error: null });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setState((current) => ({ ...current, loading: true, error: null }));
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setState({ user: null, loading: false, error: error.message }); return; }
    setState({ user: data.user ? { id: data.user.id, email: data.user.email ?? '' } : null, loading: false, error: null });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, loading: false, error: null });
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setState((current) => ({ ...current, loading: true, error: null }));
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) { setState((current) => ({ ...current, loading: false, error: error.message })); return; }
    setState((current) => ({ ...current, loading: false, error: null }));
  }, []);

  return { ...state, signUp, signIn, signOut, resetPassword };
}
