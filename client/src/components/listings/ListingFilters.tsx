import { useCallback } from 'react';
import type { ListingType, MarketplaceCategory, HousingSubtype } from '@stevensconnect/shared';
import type { ListingFilters } from '../../store/listingStore';

interface ListingFiltersProps {
  filters: ListingFilters;
  onChange: (filters: Partial<ListingFilters>) => void;
  onReset: () => void;
  /** Which type context this filter bar lives in (null = all) */
  fixedType?: ListingType;
}

const MARKETPLACE_CATEGORIES: { value: MarketplaceCategory; label: string }[] = [
  { value: 'textbooks', label: 'Textbooks' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'bikes', label: 'Bikes' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'sports', label: 'Sports' },
  { value: 'other', label: 'Other' },
];

const HOUSING_SUBTYPES: { value: HousingSubtype; label: string }[] = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'roommate', label: 'Roommate' },
  { value: 'sublet', label: 'Sublet' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
] as const;

export function ListingFilters({ filters, onChange, onReset, fixedType }: ListingFiltersProps) {
  const effectiveType = fixedType ?? filters.type;

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ search: e.target.value || undefined });
    },
    [onChange],
  );

  const isDefault =
    !filters.search &&
    !filters.category &&
    !filters.housingSubtype &&
    !filters.minPrice &&
    !filters.maxPrice &&
    filters.sort === 'newest' &&
    (!filters.type || !!fixedType);

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803a7.5 7.5 0 0 0 10.607 0Z" />
        </svg>
        <input
          type="text"
          placeholder="Search listings…"
          value={filters.search ?? ''}
          onChange={handleSearch}
          className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {/* Type selector — only shown when not in a fixed-type context */}
        {!fixedType && (
          <select
            value={filters.type ?? ''}
            onChange={(e) => onChange({ type: (e.target.value as ListingType) || undefined })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none sm:w-auto"
          >
            <option value="">All types</option>
            <option value="marketplace">Marketplace</option>
            <option value="housing">Housing</option>
          </select>
        )}

        {/* Category (marketplace) */}
        {(effectiveType === 'marketplace' || !effectiveType) && (
          <select
            value={filters.category ?? ''}
            onChange={(e) =>
              onChange({ category: (e.target.value as MarketplaceCategory) || undefined })
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none sm:w-auto"
          >
            <option value="">All categories</option>
            {MARKETPLACE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        )}

        {/* Housing subtype */}
        {(effectiveType === 'housing') && (
          <select
            value={filters.housingSubtype ?? ''}
            onChange={(e) =>
              onChange({ housingSubtype: (e.target.value as HousingSubtype) || undefined })
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none sm:w-auto"
          >
            <option value="">All subtypes</option>
            {HOUSING_SUBTYPES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        )}

        {/* Price range */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            placeholder="Min $"
            min={0}
            value={filters.minPrice ?? ''}
            onChange={(e) =>
              onChange({ minPrice: e.target.value ? parseFloat(e.target.value) : undefined })
            }
            className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none sm:w-24"
          />
          <span className="shrink-0 text-gray-400">–</span>
          <input
            type="number"
            placeholder="Max $"
            min={0}
            value={filters.maxPrice ?? ''}
            onChange={(e) =>
              onChange({ maxPrice: e.target.value ? parseFloat(e.target.value) : undefined })
            }
            className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none sm:w-24"
          />
        </div>

        {/* Sort */}
        <select
          value={filters.sort}
          onChange={(e) =>
            onChange({ sort: e.target.value as ListingFilters['sort'] })
          }
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none sm:w-auto"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Reset — only shown when something non-default is active */}
        {!isDefault && (
          <button
            onClick={onReset}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
