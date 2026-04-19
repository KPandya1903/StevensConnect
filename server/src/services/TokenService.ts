/**
 * TokenService
 *
 * Handles JWT signing/verification and refresh token generation.
 * All crypto lives here — nowhere else in the codebase.
 */

import crypto from 'crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  sub: string;         // user.id
  email: string;
  username: string;
  isVerified: boolean;
}

export const TokenService = {
  /**
   * Sign a short-lived access token (15 min by default).
   * Stored in memory on the client — never in localStorage.
   */
  signAccessToken(payload: JwtPayload): string {
    const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
    return jwt.sign(payload, env.JWT_SECRET, options);
  },

  /**
   * Verify an access token.
   * Returns the payload or throws (TokenExpiredError | JsonWebTokenError).
   */
  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  },

  /**
   * Generate a cryptographically random refresh token (64 bytes = 128 hex chars).
   * The raw token is sent to the client via HttpOnly cookie.
   * Only the SHA-256 hash is stored in the DB.
   */
  generateRefreshToken(): { rawToken: string; tokenHash: string } {
    const rawToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    return { rawToken, tokenHash };
  },

  /**
   * Hash a raw refresh token for DB lookup.
   */
  hashRefreshToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  },

  /**
   * Generate a cryptographically random email verification token (32 bytes).
   */
  generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  },

  /**
   * Compute the expiry Date for a refresh token.
   */
  refreshTokenExpiresAt(): Date {
    const d = new Date();
    d.setDate(d.getDate() + env.REFRESH_TOKEN_EXPIRES_DAYS);
    return d;
  },

  /**
   * Compute the expiry Date for an email verification token (24 hours).
   */
  verificationTokenExpiresAt(): Date {
    const d = new Date();
    d.setHours(d.getHours() + 24);
    return d;
  },
};
