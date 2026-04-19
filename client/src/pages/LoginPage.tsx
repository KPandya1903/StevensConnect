import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Must be a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location } | null)?.from?.pathname ?? '/feed';

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      await login(data.email, data.password);
      void navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof AxiosError) {
        const body = err.response?.data as { error?: { code?: string; message?: string } } | undefined;
        const code = body?.error?.code;
        const message = body?.error?.message ?? 'Login failed';

        if (code === 'EMAIL_NOT_VERIFIED') {
          toast.error('Please verify your email before logging in. Check your inbox.');
        } else if (code === 'INVALID_CREDENTIALS' || code === 'ACCOUNT_DEACTIVATED') {
          setError('password', { message });
        } else {
          toast.error(message);
        }
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="text-2xl font-bold text-primary-700">StevensConnect</Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Sign in</h1>
          <p className="mt-1 text-sm text-gray-500">Welcome back, Duck</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="you@stevens.edu"
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              {...register('password')}
              type="password"
              placeholder="Your password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary-700 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-60 transition-colors mt-2"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-primary-700 hover:text-primary-800">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
