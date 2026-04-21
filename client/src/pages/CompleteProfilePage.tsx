import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';
import { usersApi } from '../api/users';

const schema = z.object({
  displayName: z.string().min(2, 'At least 2 characters').max(100).trim(),
  bio: z.string().max(500).trim().optional(),
  university: z.string().max(150).trim().optional(),
  gradYear: z.coerce.number().int().min(2000).max(2040).optional().or(z.literal('')).transform(v => v === '' ? undefined : Number(v)),
});

type FormData = z.infer<typeof schema>;

const GRAD_YEARS = Array.from({ length: 13 }, (_, i) => 2024 + i);

export function CompleteProfilePage() {
  const { user } = useAuth();
  const setAuth = useAuthStore((s) => s.setAuth);
  const accessToken = useAuthStore((s) => s.accessToken);
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: user?.displayName ?? '',
    },
  });

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    try {
      const res = await usersApi.completeProfile({
        displayName: data.displayName,
        bio: data.bio,
        university: data.university,
        gradYear: data.gradYear as number | undefined,
      });
      setAuth(res.data.data, accessToken ?? '');
      navigate('/marketplace', { replace: true });
    } catch {
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="text-2xl font-bold text-blue-700">House-Mate</span>
          <h1 className="mt-3 text-xl font-semibold text-gray-900">Set up your profile</h1>
          <p className="mt-1 text-sm text-gray-500">Tell others a bit about yourself</p>
        </div>

        {user?.avatarUrl && (
          <div className="mb-4 flex justify-center">
            <img src={user.avatarUrl} alt={user.displayName} className="h-20 w-20 rounded-full object-cover ring-2 ring-blue-100" />
          </div>
        )}

        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display name *</label>
            <input
              {...register('displayName')}
              type="text"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {errors.displayName && <p className="mt-1 text-xs text-red-600">{errors.displayName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">University</label>
            <input
              {...register('university')}
              type="text"
              placeholder="e.g. Stanford University"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Graduation year</label>
            <select
              {...register('gradYear')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select year</option>
              {GRAD_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              {...register('bio')}
              rows={3}
              placeholder="A short intro about yourself…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {isSubmitting ? 'Saving…' : 'Continue to House-Mate'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/marketplace', { replace: true })}
            className="w-full text-center text-sm text-gray-400 hover:text-gray-600"
          >
            Skip for now
          </button>
        </form>
      </div>
    </div>
  );
}
