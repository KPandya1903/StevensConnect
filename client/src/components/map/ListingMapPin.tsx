import { Link } from 'react-router-dom';
import type { Listing } from '@stevensconnect/shared';
import { formatPrice } from '../../utils/format';

interface Props {
  listing: Listing;
}

export function ListingMapPin({ listing }: Props) {
  const isHousing = listing.listingType === 'housing';

  return (
    <div className="w-52 overflow-hidden rounded-xl font-sans text-sm">
      {listing.imageUrls[0] ? (
        <img src={listing.imageUrls[0]} alt={listing.title} className="h-28 w-full object-cover" />
      ) : (
        <div className="flex h-20 w-full items-center justify-center bg-gradient-to-br from-brand-50 to-violet-100 text-3xl">
          {isHousing ? '🏠' : '🛍️'}
        </div>
      )}
      <div className="p-3">
        <p className="truncate font-semibold text-gray-900">{listing.title}</p>
        <p className={`mt-0.5 font-bold ${listing.isFree ? 'text-emerald-600' : 'text-brand-600'}`}>
          {formatPrice(listing.price, listing.isFree)}
        </p>
        {listing.locationText && (
          <p className="mt-0.5 truncate text-xs text-gray-400">{listing.locationText}</p>
        )}
        <Link
          to={`/listings/${listing.id}`}
          className="mt-2.5 block rounded-lg bg-gradient-to-r from-brand-600 to-violet-500 py-1.5 text-center text-xs font-semibold text-white hover:opacity-90"
        >
          View listing →
        </Link>
      </div>
    </div>
  );
}
