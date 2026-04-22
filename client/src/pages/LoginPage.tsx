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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-3xl font-bold text-blue-700">House-Mate</span>
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Welcome</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in with your Google account to continue</p>
        </div>

        <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <GoogleLogin
            onSuccess={(credentialResponse) => void handleGoogleSuccess(credentialResponse)}
            onError={() => toast.error('Sign-in failed. Please try again.')}
            useOneTap
            size="large"
            width="280"
          />
        </div>
      </div>
    </div>
  );
}
