import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';

const schema = z
  .object({
    email: z
      .string()
      .email('Must be a valid email')
      .refine((e) => e.toLowerCase().endsWith('@stevens.edu'), {
        message: 'Must be a @stevens.edu email address',
      }),
    displayName: z.string().min(2, 'At least 2 characters').max(100),
    username: z
      .string()
      .min(3, 'At least 3 characters')
      .max(50)
      .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
    password: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        username: data.username,
      });
      void navigate('/login');
    } catch (err) {
      if (err instanceof AxiosError) {
        const body = err.response?.data as { error?: { code?: string; message?: string; fields?: Record<string, string> } } | undefined;
        const code = body?.error?.code;
        const message = body?.error?.message ?? 'Something went wrong';

        if (code === 'EMAIL_TAKEN') setError('email', { message });
        else if (code === 'USERNAME_TAKEN') setError('username', { message });
        else toast.error(message);
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
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-1 text-sm text-gray-500">Requires a valid @stevens.edu email</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stevens Email</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input
              {...register('displayName')}
              type="text"
              placeholder="Your full name"
              autoComplete="name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
            {errors.displayName && <p className="mt-1 text-xs text-red-600">{errors.displayName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <div className="flex">
              <span className="flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">@</span>
              <input
                {...register('username')}
                type="text"
                placeholder="yourname"
                autoComplete="username"
                className="w-full rounded-r-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
            {errors.username && <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              {...register('password')}
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              {...register('confirmPassword')}
              type="password"
              placeholder="Repeat password"
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary-700 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-60 transition-colors mt-2"
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary-700 hover:text-primary-800">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
