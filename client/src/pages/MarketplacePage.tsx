import InfiniteScroll from 'react-infinite-scroll-component';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { ListingGrid } from '../components/listings/ListingGrid';
import { ListingFilters } from '../components/listings/ListingFilters';
import { useListings } from '../hooks/useListings';

export function MarketplacePage() {
  const {
    listings, isLoading, error, filters, total,
    setFilters, resetFilters, loadMore, handleToggleSave, hasMore,
  } = useListings('marketplace');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6">
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
            to="/listings/new"
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
          <ListingGrid
            listings={listings}
            isLoading={isLoading}
            onToggleSave={handleToggleSave}
            emptyMessage="No marketplace items found"
          />
        </InfiniteScroll>
      </main>
    </div>
  );
}
