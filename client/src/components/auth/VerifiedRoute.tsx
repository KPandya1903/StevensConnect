/**
 * VerifiedRoute
 *
 * Must be nested inside ProtectedRoute.
 * Blocks access if the user hasn't verified their @stevens.edu email.
 * Shows an inline prompt with a resend option instead of redirecting,
 * so the user understands why they're blocked.
 */

import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/auth';
import toast from 'react-hot-toast';

export function VerifiedRoute() {
  const { user, isVerified } = useAuth();
  const [resending, setResending] = useState(false);

  if (isVerified) return <Outlet />;

  async function handleResend() {
    if (!user?.email) return;
    setResending(true);
    try {
      await authApi.resendVerification(user.email);
      toast.success('Verification email sent — check your @stevens.edu inbox.');
    } catch {
      toast.error('Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50">
          <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900">Verify your email</h2>
        <p className="mb-6 text-sm text-gray-500">
          We sent a verification link to{' '}
          <span className="font-medium text-gray-700">{user?.email}</span>.
          <br />
          Click the link to activate your account.
        </p>
        <button
          onClick={() => void handleResend()}
          disabled={resending}
          className="text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
        >
          {resending ? 'Sending…' : 'Resend verification email'}
        </button>
      </div>
    </div>
  );
}
