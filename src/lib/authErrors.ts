export type AuthAction = 'signin' | 'signup' | 'reset';

export function validateAuthEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return 'Enter your email address.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address, like name@example.com.';
  }
  return null;
}

export function validateAuthPassword(value: string, mode: 'signin' | 'signup'): string | null {
  if (!value) return 'Enter your password.';
  if (value.length < 6) {
    return mode === 'signup'
      ? 'Create a password with at least 6 characters.'
      : 'Password must be at least 6 characters.';
  }
  return null;
}

export function validatePasswordConfirm(password: string, confirm: string): string | null {
  if (!confirm) return 'Re-enter your password to confirm it.';
  if (confirm !== password) return 'Those passwords do not match.';
  return null;
}

function textOf(error: { message?: string; code?: string } | string): { code: string; message: string } {
  if (typeof error === 'string') return { code: '', message: error };
  return { code: (error.code ?? '').toLowerCase(), message: (error.message ?? '').toLowerCase() };
}

export function friendlyAuthMessage(
  error: { message?: string; code?: string } | string | null | undefined,
  action: AuthAction,
): string {
  if (!error) return 'Something went wrong. Please try again.';
  const { code, message } = textOf(error);

  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return "That email or password doesn't match. Check both and try again.";
  }
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return 'Confirm your email before signing in. Open the link we sent, then try again.';
  }
  if (
    code === 'user_already_exists'
    || code === 'email_exists'
    || message.includes('already registered')
    || message.includes('already been registered')
    || message.includes('user already exists')
  ) {
    return 'An account with this email already exists. Sign in instead.';
  }
  if (code === 'weak_password' || message.includes('password should be at least') || message.includes('weak password')) {
    return 'Create a stronger password with at least 6 characters.';
  }
  if (
    code === 'validation_failed'
    || message.includes('unable to validate email')
    || message.includes('invalid email')
    || message.includes('invalid format')
  ) {
    return 'Enter a valid email address, like name@example.com.';
  }
  if (
    code === 'over_email_send_rate_limit'
    || code === 'over_request_rate_limit'
    || message.includes('rate limit')
    || message.includes('too many requests')
    || message.includes('for security purposes')
  ) {
    return 'Too many attempts. Wait a minute, then try again.';
  }
  if (code === 'signup_disabled' || message.includes('signups not allowed')) {
    return 'New accounts are temporarily unavailable. Please try again later.';
  }
  if (code === 'user_banned' || message.includes('banned')) {
    return 'This account cannot sign in. Contact support if you think this is a mistake.';
  }
  if (message.includes('failed to fetch') || message.includes('network') || message.includes('fetch')) {
    return 'We could not reach the server. Check your connection and try again.';
  }
  if (action === 'reset') {
    return 'We could not send a reset email. Check the address and try again.';
  }
  if (action === 'signup') {
    return 'We could not create your account. Check your details and try again.';
  }
  return 'We could not sign you in. Check your details and try again.';
}
