import { Link } from 'react-router-dom';
import type { Listing } from '@stevensconnect/shared';
import { Badge } from '../ui/Badge';
import { formatPrice, timeAgo, labelForCategory, labelForCondition } from '../../utils/format';

interface MarketplaceListingRowProps {
  listing: Listing;
  onToggleSave?: (id: string, current: boolean) => void;
}

export function MarketplaceListingRow({ listing, onToggleSave }: MarketplaceListingRowProps) {
  const { id, title, price, isFree, status, marketplaceCategory, condition, imageUrls, locationText, createdAt, isSaved } = listing;
  const image = imageUrls[0];

  return (
    <article className="group flex items-center gap-4 rounded-2xl border border-gray-200/80 bg-white px-4 py-3.5 shadow-card transition-all duration-200 hover:border-brand-200/60 hover:shadow-card-hover">
      {/* Thumbnail */}
      <Link to={`/listings/${id}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
        {image ? (
          <img src={image} alt={title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 via-violet-50 to-indigo-100 rounded-xl">
            <span className="text-3xl select-none">🛍️</span>
          </div>
        )}
        {status !== 'active' && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 backdrop-blur-sm">
            <span className="text-xs font-semibold capitalize text-white">{status}</span>
          </div>
        )}
      </Link>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap gap-1.5">
          {marketplaceCategory && <Badge variant="default">{labelForCategory(marketplaceCategory)}</Badge>}
          {condition && <Badge variant="muted">{labelForCondition(condition)}</Badge>}
        </div>
        <Link to={`/listings/${id}`} className="truncate text-sm font-semibold text-gray-900 transition hover:text-brand-700">
          {title}
        </Link>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {locationText && (
            <>
              <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              <span className="truncate">{locationText}</span>
              <span className="text-gray-300">·</span>
            </>
          )}
          <span>{timeAgo(createdAt)}</span>
        </div>
      </div>

      {/* Right: price + save */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className={`text-base font-bold tracking-tight ${isFree || price === 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
          {formatPrice(price, isFree)}
        </span>
        {onToggleSave && (
          <button
            onClick={(e) => { e.preventDefault(); onToggleSave(id, !!isSaved); }}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition hover:scale-110 ${isSaved ? 'text-rose-500' : 'text-gray-300 hover:text-rose-400'}`}
            aria-label={isSaved ? 'Unsave' : 'Save'}
          >
            <svg className={`h-4.5 w-4.5 ${isSaved ? 'fill-rose-500' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          </button>
        )}
      </div>
    </article>
  );
}
