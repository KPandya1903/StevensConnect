/**
 * VerifyEmailPage
 *
 * Landed on via the link in the verification email:
 *   /verify-email?token=<hex_token>
 *
 * Automatically calls the API on mount and shows the result.
 * No user interaction required.
 */

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';

type Status = 'pending' | 'success' | 'error';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('pending');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token found in the URL.');
      return;
    }

    authApi
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err: unknown) => {
        setStatus('error');
        const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
        setErrorMessage(
          axiosErr.response?.data?.error?.message ??
          'Verification failed. The link may have expired.',
        );
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        {status === 'pending' && (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            <p className="text-gray-600">Verifying your email…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">Email verified!</h2>
            <p className="mb-6 text-sm text-gray-500">Your @stevens.edu address is confirmed. You can now sign in.</p>
            <Link
              to="/login"
              className="rounded-lg bg-primary-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 transition-colors"
            >
              Sign in
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">Verification failed</h2>
            <p className="mb-6 text-sm text-gray-500">{errorMessage}</p>
            <div className="flex flex-col gap-3">
              <Link
                to="/login"
                className="rounded-lg bg-primary-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 transition-colors"
              >
                Go to login
              </Link>
              <p className="text-xs text-gray-400">
                Need a new link? Sign in and we&apos;ll prompt you to resend it.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
