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
    <article className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      {/* Image */}
      <Link to={`/listings/${id}`} className="relative block aspect-[4/3] overflow-hidden bg-gray-100">
        {image ? (
          <img
            src={image}
            alt={title}
            className={`h-full w-full transition group-hover:scale-105 ${listingType === 'housing' && housingSubtype === 'roommate' ? 'object-contain p-4' : 'object-cover'}`}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400">
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 3.75h16.5a.75.75 0 01.75.75v15a.75.75 0 01-.75.75H3.75a.75.75 0 01-.75-.75v-15a.75.75 0 01.75-.75z" />
            </svg>
            <span className="text-xs font-medium text-gray-400">No photo</span>
          </div>
        )}

        {/* Status overlay */}
        {status !== 'active' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold capitalize text-gray-800">
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
            className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 shadow transition hover:bg-white"
            aria-label={isSaved ? 'Unsave listing' : 'Save listing'}
          >
            <svg
              className={`h-5 w-5 transition ${isSaved ? 'fill-red-500 text-red-500' : 'fill-none text-gray-600'}`}
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
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
        <div className="mb-2 flex flex-wrap gap-1.5">
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
        <Link to={`/listings/${id}`} className="mb-1 line-clamp-2 text-sm font-semibold text-gray-900 hover:text-blue-700">
          {title}
        </Link>

        {/* Housing specifics */}
        {listingType === 'housing' && (bedrooms != null || bathrooms != null) && (
          <p className="mb-1 text-xs text-gray-500">
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
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className={`text-base font-bold ${isFree || price === 0 ? 'text-green-600' : 'text-gray-900'}`}>
            {priceLabel}
          </span>
          <span className="text-xs text-gray-400">{timeAgo(createdAt)}</span>
        </div>
      </div>
    </article>
  );
}
