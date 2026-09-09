import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfilePage } from '@/pages';
import type { ProfileSettings } from '@/types';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn(), getUser: vi.fn(), onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) },
    from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) })),
  },
}));

const mockProfile: ProfileSettings = {
  name: 'Test User',
  email: 'test@example.com',
  theme: 'Light',
  notifications_enabled: true,
  timezone: 'Pacific Time',
  onboarded: true,
};

const defaultProps = {
  profile: mockProfile,
  authEmail: 'test@example.com',
  emailVerified: true,
  onSignOut: vi.fn(),
  onUpdateProfile: vi.fn().mockResolvedValue(undefined),
  onResendVerification: vi.fn().mockResolvedValue({ error: null }),
  onDeleteAccount: vi.fn().mockResolvedValue(undefined),
};

function renderProfile(overrides: Record<string, unknown> = {}) {
  const props = { ...defaultProps, ...overrides } as typeof defaultProps;
  return render(<ProfilePage {...props} />);
}

describe('ProfilePage - Email verification badge', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shows Verified badge when email is verified', () => {
    renderProfile({ emailVerified: true });
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.queryByText('Unverified')).not.toBeInTheDocument();
  });

  it('shows Unverified badge when email is not verified', () => {
    renderProfile({ emailVerified: false });
    expect(screen.getByText('Unverified')).toBeInTheDocument();
  });

  it('shows the email as read-only text in the email section', () => {
    renderProfile({ emailVerified: true });
    const emailRow = screen.getByText('Verified').closest('.email-row');
    expect(emailRow).toHaveTextContent('test@example.com');
    expect(screen.queryByRole('textbox', { name: /email/i })).not.toBeInTheDocument();
  });
});

describe('ProfilePage - Resend verification', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shows Resend button only when unverified', () => {
    const { rerender } = renderProfile({ emailVerified: true });
    expect(screen.queryByText('Resend verification email')).not.toBeInTheDocument();
    rerender(<ProfilePage {...defaultProps} emailVerified={false} onResendVerification={vi.fn().mockResolvedValue({ error: null })} />);
    expect(screen.getByText('Resend verification email')).toBeInTheDocument();
  });

  it('calls onResendVerification and shows success toast', async () => {
    const onResend = vi.fn().mockResolvedValue({ error: null });
    renderProfile({ emailVerified: false, onResendVerification: onResend });
    fireEvent.click(screen.getByText('Resend verification email'));
    await waitFor(() => expect(onResend).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('Verification email sent. Check your inbox.')).toBeInTheDocument());
  });

  it('shows error toast when resend fails', async () => {
    const onResend = vi.fn().mockResolvedValue({ error: 'Rate limit exceeded.' });
    renderProfile({ emailVerified: false, onResendVerification: onResend });
    fireEvent.click(screen.getByText('Resend verification email'));
    await waitFor(() => expect(screen.getByText('Rate limit exceeded.')).toBeInTheDocument());
  });
});
