import { create } from 'zustand';
import type { Listing, ListingType, MarketplaceCategory, HousingSubtype } from '@stevensconnect/shared';
import type { ListingsQuery } from '../api/listings';

export interface ListingFilters {
  type?: ListingType;
  housingSubtype?: HousingSubtype;
  category?: MarketplaceCategory;
  minPrice?: number;
  maxPrice?: number;
  free?: boolean;
  search?: string;
  sort: 'newest' | 'oldest' | 'price_asc' | 'price_desc';
}

interface ListingState {
  listings: Listing[];
  total: number;
  totalPages: number;
  page: number;
  filters: ListingFilters;
  isLoading: boolean;
  error: string | null;

  // Actions
  setListings: (listings: Listing[], total: number, totalPages: number, page: number) => void;
  appendListings: (listings: Listing[]) => void;
  setFilters: (filters: Partial<ListingFilters>) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateListing: (id: string, patch: Partial<Listing>) => void;
  removeListing: (id: string) => void;
  toggleSavedInStore: (id: string, saved: boolean) => void;
  toQuery: () => ListingsQuery;
}

const DEFAULT_FILTERS: ListingFilters = {
  sort: 'newest',
};

export const useListingStore = create<ListingState>((set, get) => ({
  listings: [],
  total: 0,
  totalPages: 1,
  page: 1,
  filters: { ...DEFAULT_FILTERS },
  isLoading: false,
  error: null,

  setListings: (listings, total, totalPages, page) =>
    set({ listings, total, totalPages, page }),

  appendListings: (listings) =>
    set((s) => ({ listings: [...s.listings, ...listings] })),

  setFilters: (filters) =>
    set((s) => ({ filters: { ...s.filters, ...filters }, page: 1, listings: [] })),

  resetFilters: () =>
    set({ filters: { ...DEFAULT_FILTERS }, page: 1, listings: [] }),

  setPage: (page) => set({ page }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  updateListing: (id, patch) =>
    set((s) => ({
      listings: s.listings.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    })),

  removeListing: (id) =>
    set((s) => ({ listings: s.listings.filter((l) => l.id !== id) })),

  toggleSavedInStore: (id, saved) =>
    set((s) => ({
      listings: s.listings.map((l) => (l.id === id ? { ...l, isSaved: saved } : l)),
    })),

  toQuery: (): ListingsQuery => {
    const { filters, page } = get();
    return {
      type: filters.type,
      housingSubtype: filters.housingSubtype,
      category: filters.category,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      free: filters.free,
      search: filters.search || undefined,
      sort: filters.sort,
      page,
      limit: 20,
    };
  },
}));
