import { useState } from 'react';
import { ArrowRight, Leaf, Lock, Mail } from 'lucide-react';

type AuthScreenProps = {
  mode: 'signin' | 'signup';
  onModeChange: (mode: 'signin' | 'signup') => void;
  onSubmit: (email: string, password: string) => Promise<void>;
  loading: boolean;
  error: string | null;
};

export function AuthScreen({ mode, onModeChange, onSubmit, loading, error }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const isSignUp = mode === 'signup';

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) return;
    void onSubmit(email.trim(), password);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-mark"><Leaf size={22} /></div>
          <span>daymark</span>
        </div>
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
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
            {!loading && <ArrowRight size={17} />}
          </button>
        </form>

        <p className="auth-switch">
          {isSignUp ? 'Already have an account?' : 'New to daymark?'}
          <button onClick={() => onModeChange(isSignUp ? 'signin' : 'signup')}>
            {isSignUp ? 'Sign in' : 'Create one'}
          </button>
        </p>
      </div>
    </div>
  );
}
