import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Leaf, Lock, Mail } from 'lucide-react';

type AuthScreenProps = {
  mode: 'signin' | 'signup';
  onModeChange: (mode: 'signin' | 'signup') => void;
  onSubmit: (email: string, password: string) => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
  loading: boolean;
  error: string | null;
};

export function AuthScreen({ mode, onModeChange, onSubmit, onResetPassword, loading, error }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState<'auth' | 'forgot' | 'sent'>('auth');
  const [resetEmail, setResetEmail] = useState('');
  const isSignUp = mode === 'signup';

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) return;
    void onSubmit(email.trim(), password);
  };

  const handleReset = (event: React.FormEvent) => {
    event.preventDefault();
    if (!resetEmail.trim()) return;
    void onResetPassword(resetEmail.trim()).then(() => setView('sent'));
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-mark"><Leaf size={22} /></div>
          <span>daymark</span>
        </div>

        {view === 'auth' && (
          <>
            <div className="auth-hero">
              <h1>{isSignUp ? 'Start your streak' : 'Welcome back'}</h1>
              <p>{isSignUp ? 'Create an account to track your habits and tasks.' : 'Sign in to continue building your routines.'}</p>
            </div>
            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="auth-field">
                <Mail size={16} />
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" autoComplete="email" required />
              </label>
              <label className="auth-field">
                <Lock size={16} />
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" autoComplete={isSignUp ? 'new-password' : 'current-password'} minLength={6} required />
              </label>
              {!isSignUp && (
                <button type="button" className="auth-forgot-link" onClick={() => setView('forgot')}>Forgot your password?</button>
              )}
              {error && <p className="auth-error">{error}</p>}
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Please wait\u2026' : isSignUp ? 'Create account' : 'Sign in'}
                {!loading && <ArrowRight size={17} />}
              </button>
            </form>
            <p className="auth-switch">
              {isSignUp ? 'Already have an account?' : 'New to daymark?'}
              <button onClick={() => onModeChange(isSignUp ? 'signin' : 'signup')}>
                {isSignUp ? 'Sign in' : 'Create one'}
              </button>
            </p>
          </>
        )}

        {view === 'forgot' && (
          <>
            <div className="auth-hero">
              <h1>Reset password</h1>
              <p>Enter your email and we&apos;ll send you a link to reset your password.</p>
            </div>
            <form className="auth-form" onSubmit={handleReset}>
              <label className="auth-field">
                <Mail size={16} />
                <input type="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} placeholder="Email address" autoComplete="email" required autoFocus />
              </label>
              {error && <p className="auth-error">{error}</p>}
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Please wait\u2026' : 'Send reset link'}
                {!loading && <ArrowRight size={17} />}
              </button>
            </form>
            <button className="auth-back-link" onClick={() => setView('auth')}>
              <ArrowLeft size={15} /> Back to sign in
            </button>
          </>
        )}

        {view === 'sent' && (
          <div className="auth-reset-sent">
            <div className="auth-reset-icon"><CheckCircle2 size={40} /></div>
            <h1>Check your email</h1>
            <p>We&apos;ve sent a password reset link to <strong>{resetEmail}</strong>. Follow the link in the email to reset your password.</p>
            <button className="auth-submit" onClick={() => { setView('auth'); setResetEmail(''); }}>
              <ArrowLeft size={16} /> Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
