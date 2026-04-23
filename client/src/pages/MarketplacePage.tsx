import { useState } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { MarketplaceListingRow } from '../components/listings/MarketplaceListingRow';
import { ListingFilters } from '../components/listings/ListingFilters';
import { Spinner } from '../components/ui/Spinner';
import { WelcomeModal } from '../components/ui/WelcomeModal';
import { useListings } from '../hooks/useListings';

export function MarketplacePage() {
  const {
    listings, isLoading, error, filters, total,
    setFilters, resetFilters, loadMore, handleToggleSave, hasMore,
  } = useListings('marketplace');

  const [showWelcome, setShowWelcome] = useState(
    () => !localStorage.getItem('housemate_welcomed'),
  );

  function dismissWelcome() {
    localStorage.setItem('housemate_welcomed', '1');
    setShowWelcome(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <WelcomeModal open={showWelcome} onClose={dismissWelcome} />
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
            {!isLoading && (
              <p className="mt-0.5 text-sm text-gray-500">
                {total.toLocaleString()} item{total !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <Link
            to="/listings/new?type=marketplace"
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Sell item
          </Link>
        </div>

        <div className="mb-6">
          <ListingFilters
            filters={filters}
            onChange={setFilters}
            onReset={resetFilters}
            fixedType="marketplace"
          />
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
          {isLoading && listings.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <div className="h-20 w-20 shrink-0 animate-pulse rounded-lg bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/4 animate-pulse rounded bg-gray-200" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-gray-200" />
                  </div>
                  <div className="h-6 w-16 animate-pulse rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : !isLoading && listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <svg className="mb-4 h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
              </svg>
              <p className="text-lg font-medium text-gray-500">No marketplace items found</p>
              <p className="mt-1 text-sm text-gray-400">Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {listings.map((listing) => (
                <MarketplaceListingRow
                  key={listing.id}
                  listing={listing}
                  onToggleSave={handleToggleSave}
                />
              ))}
              {isLoading && listings.length > 0 && (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              )}
            </div>
          )}
        </InfiniteScroll>
      </main>
    </div>
  );
}
