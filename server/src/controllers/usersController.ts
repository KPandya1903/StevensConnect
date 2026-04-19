import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRepository } from '../repositories/UserRepository';
import { ListingService } from '../services/ListingService';
import { StorageService } from '../services/StorageService';
import { AppError } from '../middleware/errorHandler';
import type { AuthUser, PublicUser } from '@stevensconnect/shared';

export const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(100).trim().optional(),
  bio: z.string().max(500).trim().nullable().optional(),
  gradYear: z.coerce.number().int().min(2000).max(2100).nullable().optional(),
  major: z.string().max(100).trim().nullable().optional(),
});

export const usersController = {
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserRepository.findById(req.user!.id);
      if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        isVerified: user.is_verified,
      };
      res.json({ data: authUser });
    } catch (err) {
      next(err);
    }
  },

  async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as z.infer<typeof updateProfileSchema>;
      const updated = await UserRepository.update(req.user!.id, {
        displayName: input.displayName,
        bio: input.bio,
        gradYear: input.gradYear,
        major: input.major,
      });

      const authUser: AuthUser = {
        id: updated.id,
        email: updated.email,
        username: updated.username,
        displayName: updated.display_name,
        avatarUrl: updated.avatar_url,
        isVerified: updated.is_verified,
      };
      res.json({ data: authUser });
    } catch (err) { next(err); }
  },

  async uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = req.file as Express.Multer.File | undefined;
      if (!file) throw new AppError(422, 'No image file provided', 'NO_FILE');

      const url = await StorageService.saveImage(file.buffer, 'avatar', req.user!.id);
      const updated = await UserRepository.update(req.user!.id, { avatarUrl: url });

      const authUser: AuthUser = {
        id: updated.id,
        email: updated.email,
        username: updated.username,
        displayName: updated.display_name,
        avatarUrl: updated.avatar_url,
        isVerified: updated.is_verified,
      };
      res.json({ data: authUser });
    } catch (err) { next(err); }
  },

  async getSaves(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = req.query as Record<string, string | undefined>;
      const result = await ListingService.getSavedListings(
        req.user!.id,
        page ? parseInt(page, 10) : 1,
        limit ? parseInt(limit, 10) : 20,
      );
      res.json({ data: result });
    } catch (err) { next(err); }
  },

  async getByUsername(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserRepository.findByUsername(req.params.username);
      if (!user || !user.is_active) throw new AppError(404, 'User not found', 'NOT_FOUND');

      const publicUser: PublicUser = {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        gradYear: user.grad_year,
        major: user.major,
        createdAt: user.created_at.toISOString(),
      };
      res.json({ data: publicUser });
    } catch (err) {
      next(err);
    }
  },
};
