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

function openDeleteModal() {
  const dangerBtn = screen.getByText('Delete').closest('button')!;
  fireEvent.click(dangerBtn);
}

function getConfirmBtn() {
  const modal = screen.getByText('Delete account?').closest('.delete-modal')!;
  const btns = modal.querySelectorAll('button');
  return btns[btns.length - 1];
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

describe('ProfilePage - Delete account modal', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('opens delete modal on danger-zone Delete button click', () => {
    renderProfile();
    openDeleteModal();
    expect(screen.getByText('Delete account?')).toBeInTheDocument();
  });

  it('disables confirm button until DELETE is typed', () => {
    renderProfile();
    openDeleteModal();
    const confirmBtn = getConfirmBtn();
    expect(confirmBtn).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText('DELETE'), { target: { value: 'DELETE' } });
    expect(confirmBtn).not.toBeDisabled();
  });

  it('does not enable confirm on wrong text', () => {
    renderProfile();
    openDeleteModal();
    const confirmBtn = getConfirmBtn();
    fireEvent.change(screen.getByPlaceholderText('DELETE'), { target: { value: 'delete' } });
    expect(confirmBtn).toBeDisabled();
  });

  it('calls onDeleteAccount when confirmed and shows success toast', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    renderProfile({ onDeleteAccount: onDelete });
    openDeleteModal();
    fireEvent.change(screen.getByPlaceholderText('DELETE'), { target: { value: 'DELETE' } });
    fireEvent.click(getConfirmBtn());
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('Account deleted successfully.')).toBeInTheDocument());
  });

  it('shows error toast when deletion fails', async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error('Server not ready.'));
    renderProfile({ onDeleteAccount: onDelete });
    openDeleteModal();
    fireEvent.change(screen.getByPlaceholderText('DELETE'), { target: { value: 'DELETE' } });
    fireEvent.click(getConfirmBtn());
    await waitFor(() => expect(screen.getByText('Server not ready.')).toBeInTheDocument());
  });

  it('closes modal on Cancel', () => {
    renderProfile();
    openDeleteModal();
    expect(screen.getByText('Delete account?')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Delete account?')).not.toBeInTheDocument();
  });
});
