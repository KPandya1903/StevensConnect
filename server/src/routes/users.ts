import { Router } from 'express';
import { authenticate, requireVerified } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { avatarUpload } from '../config/upload';
import { usersController, updateProfileSchema, completeProfileSchema } from '../controllers/usersController';

export const usersRouter = Router();

// GET  /api/users/me — current user's profile
usersRouter.get('/me', authenticate, usersController.getMe);

// PATCH /api/users/me — update bio, displayName, gradYear, major, university
usersRouter.patch('/me', authenticate, requireVerified, validate(updateProfileSchema), usersController.updateMe);

// POST /api/users/me/complete-profile — first-time profile completion after Google sign-in
usersRouter.post('/me/complete-profile', authenticate, validate(completeProfileSchema), usersController.completeProfile);

// POST /api/users/me/avatar — upload / replace avatar
usersRouter.post('/me/avatar', authenticate, requireVerified, avatarUpload.single('avatar'), usersController.uploadAvatar);

// GET /api/users/me/saves — current user's saved listings
usersRouter.get('/me/saves', authenticate, requireVerified, usersController.getSaves);

// GET /api/users/public/:id — public profile by user ID (for listing detail page)
usersRouter.get('/public/:id', authenticate, usersController.getPublicById);

// GET /api/users/:username — public profile (must come after /me routes)
usersRouter.get('/:username', authenticate, usersController.getByUsername);
