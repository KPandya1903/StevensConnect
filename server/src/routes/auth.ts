/**
 * Auth routes
 *
 * All routes follow the pattern:
 *   [public middleware] → validate(schema) → controller method
 *
 * The authLimiter is applied to routes that accept credentials to prevent
 * brute-force attacks.
 */

import { Router } from 'express';
import { authController, registerSchema, loginSchema, verifyEmailSchema, resendVerificationSchema, googleAuthSchema } from '../controllers/authController';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { authLimiter } from '../middleware/rateLimiter';

export const authRouter = Router();

// POST /api/auth/google — Google OAuth sign-in / sign-up
authRouter.post('/google', authLimiter, validate(googleAuthSchema), authController.googleAuth);

// POST /api/auth/register (kept for legacy / admin use)
authRouter.post('/register', authLimiter, validate(registerSchema), authController.register);

// POST /api/auth/verify-email
authRouter.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);

// POST /api/auth/login (kept for legacy / admin use)
authRouter.post('/login', authLimiter, validate(loginSchema), authController.login);

// POST /api/auth/refresh  (no auth middleware — the refresh token cookie IS the credential)
authRouter.post('/refresh', authController.refresh);

// POST /api/auth/logout  (authenticate so we can log which user logged out)
authRouter.post('/logout', authenticate, authController.logout);

// POST /api/auth/resend-verification
authRouter.post('/resend-verification', authLimiter, validate(resendVerificationSchema), authController.resendVerification);
