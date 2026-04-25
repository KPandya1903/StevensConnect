import { Link } from 'react-router-dom';
import type { Listing } from '@stevensconnect/shared';
import { Badge } from '../ui/Badge';
import { formatPrice, timeAgo, labelForCategory, labelForHousingSubtype, labelForCondition } from '../../utils/format';

interface ListingCardProps {
  listing: Listing;
  onToggleSave?: (id: string, current: boolean) => void;
}

export function ListingCard({ listing, onToggleSave }: ListingCardProps) {
  const {
    id, title, price, isFree, listingType, status,
    marketplaceCategory, housingSubtype, condition,
    imageUrls, locationText, createdAt, isSaved,
    bedrooms, bathrooms,
  } = listing;

  const priceLabel = formatPrice(price, isFree);
  const image = imageUrls[0];

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover">
      {/* Image */}
      <Link to={`/listings/${id}`} className="relative block aspect-[4/3] overflow-hidden bg-gray-100">
        {image ? (
          <img
            src={image}
            alt={title}
            className={`h-full w-full transition duration-300 group-hover:scale-105 ${listingType === 'housing' && housingSubtype === 'roommate' ? 'object-contain p-4' : 'object-cover'}`}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-50 via-violet-50 to-indigo-100">
            <span className="text-7xl select-none">
              {listingType === 'marketplace' ? '🛍️' : housingSubtype === 'roommate' ? '🏠' : '🏡'}
            </span>
          </div>
        )}

        {/* Status overlay */}
        {status !== 'active' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <span className="rounded-full bg-white/95 px-3 py-1 text-sm font-semibold capitalize text-gray-800 shadow">
              {status}
            </span>
          </div>
        )}

        {/* Save button */}
        {onToggleSave && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleSave(id, !!isSaved);
            }}
            className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition hover:scale-110 hover:bg-white"
            aria-label={isSaved ? 'Unsave listing' : 'Save listing'}
          >
            <svg
              className={`h-4.5 w-4.5 transition ${isSaved ? 'fill-rose-500 text-rose-500' : 'fill-none text-gray-500'}`}
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
            >
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          </button>
        )}
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        {/* Tags */}
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {listingType === 'marketplace' && marketplaceCategory && (
            <Badge variant="default">{labelForCategory(marketplaceCategory)}</Badge>
          )}
          {listingType === 'housing' && housingSubtype && (
            <Badge variant="info">{labelForHousingSubtype(housingSubtype)}</Badge>
          )}
          {condition && (
            <Badge variant="muted">{labelForCondition(condition)}</Badge>
          )}
        </div>

        {/* Title */}
        <Link to={`/listings/${id}`} className="mb-1 line-clamp-2 text-sm font-semibold text-gray-900 transition hover:text-brand-700">
          {title}
        </Link>

        {/* Housing specifics */}
        {listingType === 'housing' && (bedrooms != null || bathrooms != null) && (
          <p className="mb-1 text-xs text-gray-400">
            {bedrooms === 0 ? 'Studio' : bedrooms != null ? `${bedrooms} bed` : ''}
            {bedrooms != null && bathrooms != null ? ' · ' : ''}
            {bathrooms != null ? `${bathrooms} bath` : ''}
          </p>
        )}

        {/* Location */}
        {locationText && (
          <p className="mb-2 truncate text-xs text-gray-400">{locationText}</p>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3">
          <span className={`text-base font-bold tracking-tight ${isFree || price === 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
            {priceLabel}
          </span>
          <span className="text-xs text-gray-400">{timeAgo(createdAt)}</span>
        </div>
      </div>
    </article>
  );
}
