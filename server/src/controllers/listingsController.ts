import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ListingService } from '../services/ListingService';
import { StorageService } from '../services/StorageService';
import { AppError } from '../middleware/errorHandler';
import type { HousingSubtype, MarketplaceCategory, ItemCondition, ListingType, ListingStatus } from '@stevensconnect/shared';

// ---- Validation schemas ----

const housingSubtypes: [HousingSubtype, ...HousingSubtype[]] = ['apartment', 'roommate', 'sublet'];
const mktCategories: [MarketplaceCategory, ...MarketplaceCategory[]] = [
  'textbooks','electronics','furniture','clothing','bikes','kitchen','sports','other',
];
const conditions: [ItemCondition, ...ItemCondition[]] = ['new','like_new','good','fair','poor'];
const listingTypes: [ListingType, ...ListingType[]] = ['housing','marketplace'];

export const createListingSchema = z.object({
  listingType: z.enum(listingTypes),
  title: z.string().min(5, 'Title must be at least 5 characters').max(200).trim(),
  description: z.string().min(20, 'Description must be at least 20 characters').max(5000).trim(),
  price: z.coerce.number().min(0).optional().nullable(),
  isFree: z.boolean().optional(),
  // Housing
  housingSubtype: z.enum(housingSubtypes).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  bedrooms: z.coerce.number().int().min(0).max(20).optional().nullable(),
  bathrooms: z.coerce.number().min(0).max(20).optional().nullable(),
  availableFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  availableUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  isFurnished: z.boolean().optional().nullable(),
  petsAllowed: z.boolean().optional().nullable(),
  utilitiesIncluded: z.boolean().optional().nullable(),
  // Marketplace
  marketplaceCategory: z.enum(mktCategories).optional().nullable(),
  condition: z.enum(conditions).optional().nullable(),
  // Shared
  locationText: z.string().max(200).optional().nullable(),
});

export const updateListingSchema = createListingSchema.partial().omit({ listingType: true });

export const setStatusSchema = z.object({
  status: z.enum(['sold', 'closed'] as [ListingStatus, ListingStatus]),
});

export const reportSchema = z.object({
  reason: z.enum(['spam','inappropriate','scam','wrong_category','other']),
  details: z.string().max(500).optional(),
});

export const removeImageSchema = z.object({
  url: z.string().url('Must be a valid URL'),
});

// ---- Controller ----

export const listingsController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const listing = await ListingService.create(req.user!.id, {
        ...(req.body as z.infer<typeof createListingSchema>),
        userId: req.user!.id,
      });
      res.status(201).json({ data: listing });
    } catch (err) { next(err); }
  },

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        type, housingSubtype, category, minPrice, maxPrice, free,
        search, sort, page, limit,
      } = req.query as Record<string, string | undefined>;

      const result = await ListingService.getAll({
        listingType: type as ListingType | undefined,
        housingSubtype: housingSubtype as HousingSubtype | undefined,
        marketplaceCategory: category as MarketplaceCategory | undefined,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        isFree: free === 'true' ? true : undefined,
        search: search?.trim() || undefined,
        sort: (sort as 'newest' | 'oldest' | 'price_asc' | 'price_desc') || 'newest',
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
        viewerUserId: req.user?.id,
      });
      res.json({ data: result });
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const listing = await ListingService.getById(req.params.id, req.user?.id);
      res.json({ data: listing });
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const listing = await ListingService.update(
        req.params.id,
        req.user!.id,
        req.body as z.infer<typeof updateListingSchema>,
      );
      res.json({ data: listing });
    } catch (err) { next(err); }
  },

  async close(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await ListingService.close(req.params.id, req.user!.id);
      res.json({ data: { message: 'Listing closed.' } });
    } catch (err) { next(err); }
  },

  async setStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.body as z.infer<typeof setStatusSchema>;
      await ListingService.setStatus(req.params.id, req.user!.id, status);
      res.json({ data: { message: `Listing marked as ${status}.` } });
    } catch (err) { next(err); }
  },

  async uploadImages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        throw new AppError(422, 'At least one image is required', 'NO_FILES');
      }

      const urls: string[] = [];
      for (const file of files) {
        const url = await StorageService.saveImage(file.buffer, 'listing', req.user!.id);
        const savedUrls = await ListingService.addImage(req.params.id, req.user!.id, url);
        urls.push(...savedUrls.filter((u) => !urls.includes(u)));
      }

      res.json({ data: { imageUrls: urls } });
    } catch (err) { next(err); }
  },

  async removeImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { url } = req.body as z.infer<typeof removeImageSchema>;
      const imageUrls = await ListingService.removeImage(req.params.id, req.user!.id, url);
      await StorageService.deleteImage(url);
      res.json({ data: { imageUrls } });
    } catch (err) { next(err); }
  },

  async toggleSave(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ListingService.toggleSave(req.user!.id, req.params.id);
      res.json({ data: result });
    } catch (err) { next(err); }
  },

  async report(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reason, details } = req.body as z.infer<typeof reportSchema>;
      await ListingService.report(req.user!.id, req.params.id, reason, details);
      res.json({ data: { message: 'Report submitted. Thank you.' } });
    } catch (err) { next(err); }
  },

  async uploadVideo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = req.file;
      if (!file) throw new AppError(422, 'A video file is required', 'NO_FILE');
      const videoUrl = await ListingService.addVideo(
        req.params.id,
        req.user!.id,
        file.buffer,
        file.originalname,
        file.mimetype,
      );
      res.json({ data: { videoUrl } });
    } catch (err) { next(err); }
  },

  async removeVideo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await ListingService.removeVideo(req.params.id, req.user!.id);
      res.json({ data: { message: 'Video removed.' } });
    } catch (err) { next(err); }
  },
};
