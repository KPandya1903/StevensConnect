/**
 * Authentication middleware.
 *
 * authenticate: Verifies the Bearer JWT. Attaches req.user.
 *   - Used on all protected routes.
 *
 * requireVerified: Requires req.user.isVerified === true.
 *   - Used on routes where the user must have confirmed their email.
 *   - Always applied after authenticate.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './errorHandler';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  isVerified: boolean;
}

// Extend Express Request to include our auth user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  isVerified: boolean;
  iat: number;
  exp: number;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      isVerified: payload.isVerified,
    };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'Token expired', 'TOKEN_EXPIRED');
    }
    throw new AppError(401, 'Invalid token', 'INVALID_TOKEN');
  }
}

export function requireVerified(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  }
  if (!req.user.isVerified) {
    throw new AppError(403, 'Email verification required', 'EMAIL_NOT_VERIFIED');
  }
  next();
}
