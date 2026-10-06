import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { validateAuthEmail, validateAuthPassword, validatePasswordConfirm } from '@/lib/authErrors';
import { isNative } from '@/lib/capacitor';
import { openExternal } from '@/lib/browser';

type AuthScreenProps = {
  mode: 'signin' | 'signup';
  onModeChange: (mode: 'signin' | 'signup') => void;
  onSubmit: (email: string, password: string) => Promise<void>;
  onResetPassword: (email: string) => Promise<boolean>;
  onClearFeedback: () => void;
  loading: boolean;
  error: string | null;
  notice: string | null;
};

type FieldErrors = {
  email?: string;
  password?: string;
  confirm?: string;
  resetEmail?: string;
};

export function AuthScreen({
  mode,
  onModeChange,
  onSubmit,
  onResetPassword,
  onClearFeedback,
  loading,
  error,
  notice,
}: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [view, setView] = useState<'auth' | 'forgot' | 'sent'>('auth');
  const [resetEmail, setResetEmail] = useState('');
  const [fields, setFields] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const isSignUp = mode === 'signup';

  const switchMode = (next: 'signin' | 'signup') => {
    setFields({});
    setPassword('');
    setConfirm('');
    onClearFeedback();
    onModeChange(next);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onClearFeedback();
    const next: FieldErrors = {
      email: validateAuthEmail(email) ?? undefined,
      password: validateAuthPassword(password, isSignUp ? 'signup' : 'signin') ?? undefined,
      confirm: isSignUp ? validatePasswordConfirm(password, confirm) ?? undefined : undefined,
    };
    setFields(next);
    if (next.email || next.password || next.confirm) return;
    void onSubmit(email.trim(), password);
  };

  const handleReset = (event: React.FormEvent) => {
    event.preventDefault();
    onClearFeedback();
    const resetError = validateAuthEmail(resetEmail);
    setFields({ resetEmail: resetError ?? undefined });
    if (resetError) return;
    void onResetPassword(resetEmail.trim()).then((sent) => {
      if (sent) setView('sent');
    });
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-mark has-logo"><img className="logo-light" src="/icons/nitya-mark-light.png" alt="Nitya" draggable={false} /><img className="logo-dark" src="/icons/nitya-mark-dark.png" alt="" aria-hidden="true" draggable={false} /></div>
          <span>Nitya</span>
        </div>

        {view === 'auth' && (
          <>
            <div className="auth-hero">
              <h1>{isSignUp ? 'Start your streak' : 'Welcome back'}</h1>
              <p>{isSignUp ? 'Create an account to track your habits and tasks.' : 'Sign in to continue building your routines.'}</p>
            </div>
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="auth-field-group">
                <label className={`auth-field ${fields.email ? 'is-invalid' : ''}`}>
                  <Mail size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (fields.email) setFields((current) => ({ ...current, email: undefined }));
                    }}
                    placeholder="Email address"
                    autoComplete="email"
                    aria-invalid={Boolean(fields.email)}
                    aria-describedby={fields.email ? 'auth-email-error' : undefined}
                  />
                </label>
                {fields.email && <p id="auth-email-error" className="auth-field-error">{fields.email}</p>}
              </div>
              <div className="auth-field-group">
                <label className={`auth-field ${fields.password ? 'is-invalid' : ''}`}>
                  <Lock size={16} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (fields.password) setFields((current) => ({ ...current, password: undefined }));
                    }}
                    placeholder="Password"
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    aria-invalid={Boolean(fields.password)}
                    aria-describedby={fields.password ? 'auth-password-error' : isSignUp ? 'auth-password-hint' : undefined}
                  />
                  <button
                    type="button"
                    className="auth-toggle-password"
                    onClick={(e) => { e.preventDefault(); setShowPassword((prev) => !prev); }}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </label>
                {fields.password ? (
                  <p id="auth-password-error" className="auth-field-error">{fields.password}</p>
                ) : isSignUp ? (
                  <p id="auth-password-hint" className="auth-field-hint">Use at least 6 characters.</p>
                ) : null}
              </div>
              {isSignUp && (
                <div className="auth-field-group">
                  <label className={`auth-field ${fields.confirm ? 'is-invalid' : ''}`}>
                    <Lock size={16} />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={(event) => {
                        setConfirm(event.target.value);
                        if (fields.confirm) setFields((current) => ({ ...current, confirm: undefined }));
                      }}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      aria-invalid={Boolean(fields.confirm)}
                      aria-describedby={fields.confirm ? 'auth-confirm-error' : undefined}
                    />
                    <button
                      type="button"
                      className="auth-toggle-password"
                      onClick={(e) => { e.preventDefault(); setShowConfirm((prev) => !prev); }}
                      tabIndex={-1}
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </label>
                  {fields.confirm && <p id="auth-confirm-error" className="auth-field-error">{fields.confirm}</p>}
                </div>
              )}
              {!isSignUp && (
                <button
                  type="button"
                  className="auth-forgot-link"
                  onClick={() => {
                    setFields({});
                    onClearFeedback();
                    setResetEmail(email);
                    setView('forgot');
                  }}
                >
                  Forgot your password?
                </button>
              )}
              {error && <p className="auth-error" role="alert">{error}</p>}
              {notice && <p className="auth-notice" role="status">{notice}</p>}
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Please wait\u2026' : isSignUp ? 'Create account' : 'Sign in'}
                {!loading && <ArrowRight size={17} />}
              </button>
            </form>
            <p className="auth-switch">
              {isSignUp ? 'Already have an account?' : 'New to Nitya?'}
              <button type="button" onClick={() => switchMode(isSignUp ? 'signin' : 'signup')}>
                {isSignUp ? 'Sign in' : 'Create one'}
              </button>
            </p>
            <p className="auth-legal">
              By continuing you agree to our{' '}
              {isNative() ? (
                <a href="/privacy.html" onClick={(event) => { event.preventDefault(); void openExternal('/privacy.html'); }}>Privacy policy</a>
              ) : (
                <a href="/privacy.html" target="_blank" rel="noreferrer">Privacy policy</a>
              )}
              .
            </p>
          </>
        )}

        {view === 'forgot' && (
          <>
            <div className="auth-hero">
              <h1>Reset password</h1>
              <p>Enter your email and we&apos;ll send you a link to reset your password.</p>
            </div>
            <form className="auth-form" onSubmit={handleReset} noValidate>
              <div className="auth-field-group">
                <label className={`auth-field ${fields.resetEmail ? 'is-invalid' : ''}`}>
                  <Mail size={16} />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(event) => {
                      setResetEmail(event.target.value);
                      if (fields.resetEmail) setFields((current) => ({ ...current, resetEmail: undefined }));
                    }}
                    placeholder="Email address"
                    autoComplete="email"
                    autoFocus
                    aria-invalid={Boolean(fields.resetEmail)}
                    aria-describedby={fields.resetEmail ? 'auth-reset-error' : undefined}
                  />
                </label>
                {fields.resetEmail && <p id="auth-reset-error" className="auth-field-error">{fields.resetEmail}</p>}
              </div>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Please wait\u2026' : 'Send reset link'}
                {!loading && <ArrowRight size={17} />}
              </button>
            </form>
            <button
              type="button"
              className="auth-back-link"
              onClick={() => {
                setFields({});
                onClearFeedback();
                setView('auth');
              }}
            >
              <ArrowLeft size={15} /> Back to sign in
            </button>
          </>
        )}

        {view === 'sent' && (
          <div className="auth-reset-sent">
            <div className="auth-reset-icon"><CheckCircle2 size={40} /></div>
            <h1>Check your email</h1>
            <p>We&apos;ve sent a password reset link to <strong>{resetEmail}</strong>. Follow the link in the email to reset your password.</p>
            <button className="auth-submit" onClick={() => { setView('auth'); setResetEmail(''); onClearFeedback(); }}>
              <ArrowLeft size={16} /> Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
