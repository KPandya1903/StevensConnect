/**
 * ListingService
 *
 * Business rules for listing operations:
 *   - Only the owner can edit, delete, or update status
 *   - Max 8 images per listing
 *   - Status transitions are constrained (active → sold/closed only)
 *   - Housing listings require housing_subtype
 *   - Marketplace listings require marketplace_category
 */

import { ListingRepository, type CreateListingInput, type UpdateListingInput, type FindAllOptions } from '../repositories/ListingRepository';
import { AppError } from '../middleware/errorHandler';
import type { Listing, ListingStatus } from '@stevensconnect/shared';

const MAX_IMAGES = 8;

// ---- Map DB row to shared Listing type ----
function toListingShape(row: import('../repositories/ListingRepository').ListingRow): Listing {
  return {
    id: row.id,
    userId: row.user_id,
    listingType: row.listing_type,
    title: row.title,
    description: row.description,
    price: row.price != null ? parseFloat(row.price) : null,
    isFree: row.is_free,
    status: row.status,
    housingSubtype: row.housing_subtype,
    address: row.address,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms != null ? parseFloat(row.bathrooms) : null,
    availableFrom: row.available_from?.toISOString().split('T')[0] ?? null,
    availableUntil: row.available_until?.toISOString().split('T')[0] ?? null,
    isFurnished: row.is_furnished,
    petsAllowed: row.pets_allowed,
    utilitiesIncluded: row.utilities_included,
    marketplaceCategory: row.marketplace_category,
    condition: row.condition,
    imageUrls: row.image_urls.filter((u) => u.startsWith('http')),
    locationText: row.location_text,
    viewsCount: row.views_count,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    // Author is present when joined
    author: row.author_id
      ? {
          id: row.author_id,
          username: row.author_username!,
          displayName: row.author_display_name!,
          avatarUrl: row.author_avatar_url ?? null,
          bio: null,
          gradYear: null,
          major: null,
          createdAt: '',
        }
      : undefined,
    isSaved: row.is_saved,
  };
}

export const ListingService = {
  async create(userId: string, input: CreateListingInput): Promise<Listing> {
    // Validate type-specific required fields
    if (input.listingType === 'housing' && !input.housingSubtype) {
      throw new AppError(422, 'Housing listings require a subtype (apartment, roommate, or sublet)', 'MISSING_HOUSING_SUBTYPE');
    }
    if (input.listingType === 'marketplace' && !input.marketplaceCategory) {
      throw new AppError(422, 'Marketplace listings require a category', 'MISSING_MARKETPLACE_CATEGORY');
    }
    if (!input.price && !input.isFree) {
      throw new AppError(422, 'Listing must have a price or be marked as free', 'MISSING_PRICE');
    }

    const row = await ListingRepository.create({ ...input, userId });
    return toListingShape(row);
  },

  async getById(id: string, viewerUserId?: string): Promise<Listing> {
    const row = await ListingRepository.findById(id, viewerUserId);
    if (!row) throw new AppError(404, 'Listing not found', 'NOT_FOUND');

    // Increment view count (fire and forget — don't block response)
    void ListingRepository.incrementViews(id);

    return toListingShape(row);
  },

  async getAll(opts: FindAllOptions) {
    const { listings, total } = await ListingRepository.findAll(opts);
    const limit = Math.min(opts.limit ?? 20, 50);
    const page = Math.max(opts.page ?? 1, 1);
    return {
      listings: listings.map(toListingShape),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },

  async update(id: string, requesterId: string, input: UpdateListingInput): Promise<Listing> {
    const existing = await ListingRepository.findById(id);
    if (!existing) throw new AppError(404, 'Listing not found', 'NOT_FOUND');
    if (existing.user_id !== requesterId) throw new AppError(403, 'You do not own this listing', 'FORBIDDEN');
    if (existing.status !== 'active') throw new AppError(409, 'Only active listings can be edited', 'LISTING_NOT_ACTIVE');

    const row = await ListingRepository.update(id, input);
    return toListingShape(row);
  },

  async setStatus(id: string, requesterId: string, status: ListingStatus): Promise<void> {
    const existing = await ListingRepository.findById(id);
    if (!existing) throw new AppError(404, 'Listing not found', 'NOT_FOUND');
    if (existing.user_id !== requesterId) throw new AppError(403, 'You do not own this listing', 'FORBIDDEN');

    // Only allow forward transitions (can't reactivate a sold listing)
    if (existing.status !== 'active') {
      throw new AppError(409, 'Only active listings can be updated', 'LISTING_NOT_ACTIVE');
    }

    await ListingRepository.setStatus(id, status);
  },

  async close(id: string, requesterId: string): Promise<void> {
    return ListingService.setStatus(id, requesterId, 'closed');
  },

  async addImage(id: string, requesterId: string, url: string): Promise<string[]> {
    const existing = await ListingRepository.findById(id);
    if (!existing) throw new AppError(404, 'Listing not found', 'NOT_FOUND');
    if (existing.user_id !== requesterId) throw new AppError(403, 'You do not own this listing', 'FORBIDDEN');
    if (existing.image_urls.length >= MAX_IMAGES) {
      throw new AppError(422, `Listings may have at most ${MAX_IMAGES} images`, 'MAX_IMAGES_REACHED');
    }

    return ListingRepository.addImage(id, url);
  },

  async removeImage(id: string, requesterId: string, url: string): Promise<string[]> {
    const existing = await ListingRepository.findById(id);
    if (!existing) throw new AppError(404, 'Listing not found', 'NOT_FOUND');
    if (existing.user_id !== requesterId) throw new AppError(403, 'You do not own this listing', 'FORBIDDEN');

    return ListingRepository.removeImage(id, url);
  },

  async toggleSave(userId: string, listingId: string): Promise<{ saved: boolean }> {
    const existing = await ListingRepository.findById(listingId);
    if (!existing || existing.status !== 'active') {
      throw new AppError(404, 'Listing not found', 'NOT_FOUND');
    }

    const saved = await ListingRepository.toggleSave(userId, listingId);
    return { saved };
  },

  async report(reporterId: string, listingId: string, reason: string, details?: string): Promise<void> {
    const existing = await ListingRepository.findById(listingId);
    if (!existing) throw new AppError(404, 'Listing not found', 'NOT_FOUND');

    await ListingRepository.createReport(reporterId, listingId, reason, details);
  },

  async getSavedListings(userId: string, page?: number, limit?: number) {
    const { listings, total } = await ListingRepository.getSavedListings(userId, page, limit);
    const effectiveLimit = Math.min(limit ?? 20, 50);
    const effectivePage = Math.max(page ?? 1, 1);
    return {
      listings: listings.map(toListingShape),
      total,
      page: effectivePage,
      totalPages: Math.ceil(total / effectiveLimit),
    };
  },
};
