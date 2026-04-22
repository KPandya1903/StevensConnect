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
    <article className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md">
      {/* Thumbnail */}
      <Link to={`/listings/${id}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {image ? (
          <img src={image} alt={title} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg className="h-7 w-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 3.75h16.5a.75.75 0 01.75.75v15a.75.75 0 01-.75.75H3.75a.75.75 0 01-.75-.75v-15a.75.75 0 01.75-.75z" />
            </svg>
          </div>
        )}
        {status !== 'active' && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
            <span className="text-xs font-semibold capitalize text-white">{status}</span>
          </div>
        )}
      </Link>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap gap-1.5">
          {marketplaceCategory && <Badge variant="default">{labelForCategory(marketplaceCategory)}</Badge>}
          {condition && <Badge variant="muted">{labelForCondition(condition)}</Badge>}
        </div>
        <Link to={`/listings/${id}`} className="truncate text-sm font-semibold text-gray-900 hover:text-blue-700">
          {title}
        </Link>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {locationText && <span className="truncate">{locationText}</span>}
          <span>{timeAgo(createdAt)}</span>
        </div>
      </div>

      {/* Right: price + save */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className={`text-base font-bold ${isFree || price === 0 ? 'text-green-600' : 'text-gray-900'}`}>
          {formatPrice(price, isFree)}
        </span>
        {onToggleSave && (
          <button
            onClick={(e) => { e.preventDefault(); onToggleSave(id, !!isSaved); }}
            className="rounded-full p-1 text-gray-400 transition hover:text-red-500"
            aria-label={isSaved ? 'Unsave' : 'Save'}
          >
            <svg className={`h-5 w-5 ${isSaved ? 'fill-red-500 text-red-500' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          </button>
        )}
      </div>
    </article>
  );
}
