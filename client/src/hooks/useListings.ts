import { useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { listingsApi } from '../api/listings';
import { useListingStore } from '../store/listingStore';
import type { ListingType } from '@stevensconnect/shared';

/**
 * Fetches listings into the store and exposes helpers for the feed pages.
 *
 * @param fixedType  When provided (e.g. 'housing'), the store type filter is
 *                   locked to that value and filters cannot change it.
 */
export function useListings(fixedType?: ListingType) {
  const store = useListingStore();
  const isMounted = useRef(true);

  // Sync the locked type into the store on mount
  useEffect(() => {
    if (fixedType) {
      store.setFilters({ type: fixedType });
    }
    // Reset store when leaving the page so stale data doesn't flash on re-entry
    return () => {
      isMounted.current = false;
      store.setListings([], 0, 1, 1);
      store.resetFilters();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixedType]);

  const fetchPage = useCallback(
    async (page: number) => {
      store.setLoading(true);
      store.setError(null);
      try {
        const query = { ...store.toQuery(), page };
        if (fixedType) query.type = fixedType;
        const res = await listingsApi.getAll(query);
        const { listings, total, totalPages } = res.data.data;
        if (page === 1) {
          store.setListings(listings, total, totalPages, page);
        } else {
          store.appendListings(listings);
          store.setPage(page);
        }
      } catch {
        if (isMounted.current) {
          store.setError('Failed to load listings.');
        }
      } finally {
        if (isMounted.current) store.setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fixedType, store.filters],
  );

  // Fetch page 1 whenever filters change
  useEffect(() => {
    void fetchPage(1);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (store.page < store.totalPages && !store.isLoading) {
      void fetchPage(store.page + 1);
    }
  }, [store.page, store.totalPages, store.isLoading, fetchPage]);

  const handleToggleSave = useCallback(
    async (id: string, currentlySaved: boolean) => {
      // Optimistic update
      store.toggleSavedInStore(id, !currentlySaved);
      try {
        const res = await listingsApi.toggleSave(id);
        store.toggleSavedInStore(id, res.data.data.saved);
      } catch {
        // Revert
        store.toggleSavedInStore(id, currentlySaved);
        toast.error('Could not save listing. Please try again.');
      }
    },
    [store],
  );

  return {
    listings: store.listings,
    total: store.total,
    totalPages: store.totalPages,
    page: store.page,
    filters: store.filters,
    isLoading: store.isLoading,
    error: store.error,
    setFilters: store.setFilters,
    resetFilters: store.resetFilters,
    loadMore,
    handleToggleSave,
    hasMore: store.page < store.totalPages,
  };
}
