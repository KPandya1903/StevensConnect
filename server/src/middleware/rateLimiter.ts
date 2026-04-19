/**
 * Rate limiter middleware instances.
 *
 * authLimiter: Applied to registration, login, and resend-verification.
 *   Default: 5 requests per 15 minutes per IP.
 *   Configurable via env (RATE_LIMIT_AUTH_MAX, RATE_LIMIT_AUTH_WINDOW_MS).
 */

import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_AUTH_WINDOW_MS,
  max: env.RATE_LIMIT_AUTH_MAX,
  standardHeaders: true,  // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many requests. Please try again later.',
      code: 'RATE_LIMITED',
    },
  },
  // Skip rate limiting in test environment
  skip: () => env.isTest,
});
