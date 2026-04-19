import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Spinner } from '../components/ui/Spinner';
import { ListingGrid } from '../components/listings/ListingGrid';
import { usersApi } from '../api/users';
import { listingsApi } from '../api/listings';
import { conversationsApi } from '../api/conversations';
import { useAuthStore } from '../store/authStore';
import { formatDate } from '../utils/format';
import type { PublicUser, Listing, ListingsPage } from '@stevensconnect/shared';
import toast from 'react-hot-toast';

export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStartingChat, setIsStartingChat] = useState(false);

  useEffect(() => {
    if (!username) return;
    setIsLoading(true);
    setError(null);

    usersApi.getByUsername(username)
      .then((res) => {
        const pub = res.data.data;
        setProfile(pub);

        // Load their active listings
        return listingsApi.getAll({ limit: 50 });
      })
      .then((res) => {
        if (!res) return;
        const page = res.data.data as ListingsPage;
        // Filter to this user — we know profile by now via closure
        setProfile((p) => {
          if (p) {
            const filtered = page.listings.filter((l) => l.userId === p.id);
            setListings(filtered);
          }
          return p;
        });
      })
      .catch(() => setError('User not found.'))
      .finally(() => {
        setIsLoading(false);
        setListingsLoading(false);
      });
  }, [username]);

  async function handleMessage() {
    if (!profile) return;
    setIsStartingChat(true);
    try {
      const res = await conversationsApi.start(profile.id);
      navigate(`/messages/${res.data.data.conversationId}`);
    } catch {
      toast.error('Could not start conversation.');
    } finally {
      setIsStartingChat(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center pt-24"><Spinner size="lg" /></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 pt-24 text-center">
          <p className="text-lg font-medium text-gray-700">{error ?? 'User not found.'}</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-sm text-blue-600 hover:underline">
            Go back
          </button>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.username === profile.username;
  const initials = profile.displayName[0]?.toUpperCase() ?? '?';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        {/* Profile card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* Avatar */}
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-gray-100"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700">
                {initials}
              </div>
            )}

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{profile.displayName}</h1>
                  <p className="text-sm text-gray-500">@{profile.username}</p>
                </div>

                {!isOwnProfile && (
                  <button
                    onClick={handleMessage}
                    disabled={isStartingChat}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                    </svg>
                    {isStartingChat ? 'Opening…' : 'Message'}
                  </button>
                )}
              </div>

              {/* Meta row */}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                {profile.major && <span>{profile.major}</span>}
                {profile.gradYear && <span>Class of {profile.gradYear}</span>}
                <span>Member since {formatDate(profile.createdAt)}</span>
              </div>

              {profile.bio && (
                <p className="mt-3 text-sm leading-relaxed text-gray-700">{profile.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Their listings */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Listings
            {!listingsLoading && (
              <span className="ml-2 text-sm font-normal text-gray-500">({listings.length})</span>
            )}
          </h2>
          <ListingGrid
            listings={listings}
            isLoading={listingsLoading}
            emptyMessage={`${profile.displayName} hasn't posted any listings yet`}
          />
        </div>
      </main>
    </div>
  );
}
