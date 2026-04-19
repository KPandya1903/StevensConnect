import { useEffect, useState } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { ListingGrid } from '../components/listings/ListingGrid';
import { usersApi } from '../api/users';
import { listingsApi } from '../api/listings';
import type { Listing, ListingsPage } from '@stevensconnect/shared';

export function SavesPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    usersApi.getSaves()
      .then((res) => {
        const page = (res.data as { data: ListingsPage }).data;
        setListings(page.listings);
        setTotal(page.total);
      })
      .catch(() => setError('Could not load saved listings.'))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleToggleSave(listingId: string) {
    try {
      const res = await listingsApi.toggleSave(listingId);
      if (!res.data.data.saved) {
        setListings((prev) => prev.filter((l) => l.id !== listingId));
        setTotal((t) => t - 1);
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Saved listings</h1>
          {!isLoading && (
            <p className="mt-0.5 text-sm text-gray-500">
              {total.toLocaleString()} saved
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <ListingGrid
          listings={listings}
          isLoading={isLoading}
          onToggleSave={handleToggleSave}
          emptyMessage="You haven't saved any listings yet"
        />
      </main>
    </div>
  );
}
