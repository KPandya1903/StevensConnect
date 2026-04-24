import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export function LoginPage() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location } | null)?.from?.pathname ?? '/marketplace';

  async function handleGoogleSuccess(credentialResponse: { credential?: string }) {
    if (!credentialResponse.credential) {
      toast.error('Sign-in failed. Please try again.');
      return;
    }
    try {
      const { isNewUser } = await loginWithGoogle(credentialResponse.credential);
      if (isNewUser) {
        navigate('/complete-profile', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch {
      toast.error('Sign-in failed. Please try again.');
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      {/* Gradient mesh background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-300/10 blur-2xl" />
        <div className="absolute inset-0 bg-gray-50/80" />
      </div>

      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-500 shadow-lift">
            <span className="text-2xl">🏠</span>
          </div>
          <span className="bg-gradient-to-r from-brand-700 to-violet-500 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
            House-Mate
          </span>
          <h1 className="mt-3 text-xl font-semibold text-gray-900">Welcome back</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your account to continue</p>
        </div>

        {/* Card */}
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-gray-200/80 bg-white/90 p-8 shadow-lift backdrop-blur-sm">
          <GoogleLogin
            onSuccess={(credentialResponse) => void handleGoogleSuccess(credentialResponse)}
            onError={() => toast.error('Sign-in failed. Please try again.')}
            useOneTap
            size="large"
            width="280"
          />
          <p className="text-center text-xs text-gray-400">
            By signing in you agree to our{' '}
            <a href="#" className="text-brand-600 hover:underline">Terms</a>
            {' '}and{' '}
            <a href="#" className="text-brand-600 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
