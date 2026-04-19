import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Navbar } from '../components/layout/Navbar';
import { Spinner } from '../components/ui/Spinner';
import { ListingGrid } from '../components/listings/ListingGrid';
import { usersApi } from '../api/users';
import { listingsApi } from '../api/listings';
import { useAuthStore } from '../store/authStore';
import type { Listing, ListingsPage } from '@stevensconnect/shared';

const editSchema = z.object({
  displayName: z.string().min(2, 'At least 2 characters').max(100).trim(),
  bio: z.string().max(500).trim().optional(),
  gradYear: z.coerce.number().int().min(2000).max(2100).optional().nullable(),
  major: z.string().max(100).trim().optional(),
});

type EditForm = z.infer<typeof editSchema>;

export function MyProfilePage() {
  const { user, setAuth, accessToken } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      displayName: user?.displayName ?? '',
      bio: '',
      gradYear: null,
      major: '',
    },
  });

  // Load full profile + listings on mount
  useEffect(() => {
    void usersApi.getMe();

    if (user?.username) {
      // Fetch user's listings
      listingsApi.getAll({ limit: 50 })
        .then((res) => {
          // filter to only my listings via userId — we have the user id in the store
          const page = res.data.data as ListingsPage;
          setMyListings(page.listings.filter((l) => l.userId === user.id));
        })
        .catch(() => {})
        .finally(() => setListingsLoading(false));

      // Also fetch the public profile to get bio/gradYear/major
      usersApi.getByUsername(user.username).then((res) => {
        const pub = res.data.data;
        reset({
          displayName: user.displayName,
          bio: pub.bio ?? '',
          gradYear: pub.gradYear ?? null,
          major: pub.major ?? '',
        });
      }).catch(() => {});
    }
  }, [user?.id, user?.username]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(data: EditForm) {
    setIsSaving(true);
    try {
      const res = await usersApi.updateMe({
        displayName: data.displayName,
        bio: data.bio || null,
        gradYear: data.gradYear ?? null,
        major: data.major || null,
      });
      if (accessToken) {
        setAuth(res.data.data, accessToken);
      }
      toast.success('Profile updated');
      setIsEditing(false);
    } catch {
      toast.error('Could not save profile.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const res = await usersApi.uploadAvatar(file);
      if (accessToken) {
        setAuth(res.data.data, accessToken);
      }
      toast.success('Avatar updated');
    } catch {
      toast.error('Could not upload avatar.');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  }

  if (!user) return null;

  const initials = user.displayName[0]?.toUpperCase() ?? '?';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        {/* Profile card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="relative shrink-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="h-24 w-24 rounded-full object-cover ring-2 ring-gray-100"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-3xl font-bold text-blue-700">
                  {initials}
                </div>
              )}
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-60"
                title="Change avatar"
              >
                {isUploadingAvatar
                  ? <Spinner size="sm" />
                  : <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                }
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Info / Edit form */}
            <div className="flex-1">
              {!isEditing ? (
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-xl font-bold text-gray-900">{user.displayName}</h1>
                      <p className="text-sm text-gray-500">@{user.username}</p>
                    </div>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Edit profile
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">{user.email}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Display name</label>
                    <input
                      {...register('displayName')}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                    {errors.displayName && <p className="mt-1 text-xs text-red-600">{errors.displayName.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Bio</label>
                    <textarea
                      {...register('bio')}
                      rows={3}
                      maxLength={500}
                      placeholder="Tell others a bit about yourself…"
                      className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Graduation year</label>
                      <input
                        {...register('gradYear')}
                        type="number"
                        placeholder="e.g. 2026"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Major</label>
                      <input
                        {...register('major')}
                        placeholder="e.g. Computer Science"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {isSaving ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* My listings */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            My listings
            {!listingsLoading && (
              <span className="ml-2 text-sm font-normal text-gray-500">({myListings.length})</span>
            )}
          </h2>
          <ListingGrid
            listings={myListings}
            isLoading={listingsLoading}
            emptyMessage="You haven't posted any listings yet"
          />
        </div>
      </main>
    </div>
  );
}
