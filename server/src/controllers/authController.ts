/**
 * Auth controller
 *
 * Thin layer: parse request → call AuthService → send response.
 * No business logic here. No SQL here.
 *
 * Refresh token cookie settings:
 *   httpOnly: true   — JS cannot read it (XSS protection)
 *   secure: true     — HTTPS only (set in prod)
 *   sameSite: 'strict' — no cross-site sending (CSRF protection)
 *   path: '/api/auth' — cookie only sent on auth routes
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/AuthService';
import { env } from '../config/env';

// ---- Validation schemas (imported by validate middleware via routes) ----

export const registerSchema = z.object({
  email: z
    .string()
    .email('Must be a valid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be under 100 characters'),
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(100, 'Display name must be under 100 characters')
    .trim(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be under 50 characters')
    .toLowerCase()
    .trim()
    .regex(/^[a-z0-9_]+$/, 'Username may only contain lowercase letters, numbers, and underscores'),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export const resendVerificationSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

export const googleAuthSchema = z.object({
  credential: z.string().min(1, 'Google credential is required'),
});

// ---- Cookie helpers ----

const REFRESH_COOKIE_NAME = 'refresh_token';

function setRefreshCookie(res: Response, rawToken: string): void {
  res.cookie(REFRESH_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: true,
    sameSite: env.isProduction ? 'none' : 'strict',
    path: '/api/auth',
    maxAge: env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: env.isProduction ? 'none' : 'strict',
    path: '/api/auth',
  });
}

function getRefreshToken(req: Request): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
}

// ---- Controller methods ----

export const authController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, displayName, username } = req.body as z.infer<typeof registerSchema>;
      await AuthService.register(email, password, displayName, username);
      res.status(201).json({
        data: { message: 'Account created. Check your @stevens.edu email to verify your account.' },
      });
    } catch (err) {
      next(err);
    }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body as z.infer<typeof verifyEmailSchema>;
      await AuthService.verifyEmail(token);
      res.json({ data: { message: 'Email verified successfully. You can now log in.' } });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body as z.infer<typeof loginSchema>;
      const { accessToken, rawRefreshToken, user } = await AuthService.login(email, password);

      setRefreshCookie(res, rawRefreshToken);

      res.json({ data: { accessToken, user } });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = getRefreshToken(req);
      if (!rawRefreshToken) {
        res.status(401).json({
          error: { message: 'No refresh token provided', code: 'MISSING_REFRESH_TOKEN' },
        });
        return;
      }

      const { accessToken, rawRefreshToken: newRawToken } = await AuthService.refresh(rawRefreshToken);

      setRefreshCookie(res, newRawToken);
      res.json({ data: { accessToken } });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = getRefreshToken(req);
      if (rawRefreshToken) {
        await AuthService.logout(rawRefreshToken);
      }
      clearRefreshCookie(res);
      res.json({ data: { message: 'Logged out successfully.' } });
    } catch (err) {
      next(err);
    }
  },

  async googleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { credential } = req.body as z.infer<typeof googleAuthSchema>;
      const { accessToken, rawRefreshToken, user, isNewUser } = await AuthService.loginWithGoogle(credential);

      setRefreshCookie(res, rawRefreshToken);
      res.json({ data: { accessToken, user, isNewUser } });
    } catch (err) {
      next(err);
    }
  },

  async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body as z.infer<typeof resendVerificationSchema>;
      await AuthService.resendVerification(email);
      // Always return the same message regardless of whether email exists
      res.json({
        data: { message: 'If an unverified account exists for that email, a new verification link has been sent.' },
      });
    } catch (err) {
      next(err);
    }
  },
};
