import { useEffect } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { ListingGrid } from '../components/listings/ListingGrid';
import { useListings } from '../hooks/useListings';

export function RoommatesPage() {
  const {
    listings, isLoading, error, total,
    setFilters, loadMore, handleToggleSave, hasMore,
  } = useListings('housing');

  // Lock subtype to roommate
  useEffect(() => {
    setFilters({ housingSubtype: 'roommate' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Find a Roommate</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {isLoading ? '' : `${total.toLocaleString()} listing${total !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Link
            to="/listings/new"
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Post roommate listing
          </Link>
        </div>

        <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Looking for a roommate? Post a listing and connect with other students on House-Mate.
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <InfiniteScroll
          dataLength={listings.length}
          next={loadMore}
          hasMore={hasMore}
          loader={null}
          scrollThreshold={0.8}
        >
          <ListingGrid
            listings={listings}
            isLoading={isLoading}
            onToggleSave={handleToggleSave}
            emptyMessage="No roommate listings right now — be the first to post one!"
          />
        </InfiniteScroll>
      </main>
    </div>
  );
}
