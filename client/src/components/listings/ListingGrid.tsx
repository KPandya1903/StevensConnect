import type { Listing } from '@stevensconnect/shared';
import { ListingCard } from './ListingCard';
import { Spinner } from '../ui/Spinner';

interface ListingGridProps {
  listings: Listing[];
  isLoading: boolean;
  onToggleSave?: (id: string, current: boolean) => void;
  emptyMessage?: string;
}

// Skeleton card for loading state
function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="aspect-[4/3] animate-pulse bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-3 w-1/3 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
        <div className="mt-4 flex justify-between">
          <div className="h-5 w-1/4 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-1/5 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

export function ListingGrid({ listings, isLoading, onToggleSave, emptyMessage }: ListingGridProps) {
  // Initial load — show skeleton grid
  if (isLoading && listings.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!isLoading && listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <svg className="mb-4 h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
        </svg>
        <p className="text-lg font-medium text-gray-500">{emptyMessage ?? 'No listings found'}</p>
        <p className="mt-1 text-sm text-gray-400">Try adjusting your filters or search terms.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            onToggleSave={onToggleSave}
          />
        ))}
      </div>

      {/* Inline spinner for subsequent page loads */}
      {isLoading && listings.length > 0 && (
        <div className="mt-8 flex justify-center">
          <Spinner />
        </div>
      )}
    </>
  );
}
