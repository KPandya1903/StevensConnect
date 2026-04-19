import { api } from './index';
import type {
  Listing,
  ListingsPage,
  CreateListingInput,
  ListingType,
  HousingSubtype,
  MarketplaceCategory,
} from '@stevensconnect/shared';

export interface ListingsQuery {
  type?: ListingType;
  housingSubtype?: HousingSubtype;
  category?: MarketplaceCategory;
  minPrice?: number;
  maxPrice?: number;
  free?: boolean;
  search?: string;
  sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc';
  page?: number;
  limit?: number;
}

export type UpdateListingInput = Partial<Omit<CreateListingInput, 'listingType'>>;

export const listingsApi = {
  getAll: (params?: ListingsQuery) =>
    api.get<{ data: ListingsPage }>('/listings', { params }),

  getById: (id: string) =>
    api.get<{ data: Listing }>(`/listings/${id}`),

  create: (input: CreateListingInput) =>
    api.post<{ data: Listing }>('/listings', input),

  update: (id: string, input: UpdateListingInput) =>
    api.put<{ data: Listing }>(`/listings/${id}`, input),

  setStatus: (id: string, status: 'sold' | 'closed') =>
    api.patch<{ data: { message: string } }>(`/listings/${id}/status`, { status }),

  uploadImages: (id: string, files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append('images', f));
    return api.post<{ data: { imageUrls: string[] } }>(`/listings/${id}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  removeImage: (id: string, url: string) =>
    api.delete<{ data: { imageUrls: string[] } }>(`/listings/${id}/images`, { data: { url } }),

  toggleSave: (id: string) =>
    api.post<{ data: { saved: boolean } }>(`/listings/${id}/save`),

  report: (id: string, reason: string, details?: string) =>
    api.post<{ data: { message: string } }>(`/listings/${id}/report`, { reason, details }),

};
