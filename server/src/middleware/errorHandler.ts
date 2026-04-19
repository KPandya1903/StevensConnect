/**
 * Global error handler middleware.
 *
 * All thrown errors bubble up here. We distinguish between:
 *   - AppError (intentional, user-facing errors with a status code)
 *   - Everything else (unexpected server errors, logged fully)
 *
 * In production, unexpected errors return a generic message to avoid leaking
 * implementation details. In development, the full error is returned.
 */

import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
    // Maintains proper stack trace in V8
    Error.captureStackTrace(this, this.constructor);
  }
}

// Type guard
function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (isAppError(err)) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code ?? 'ERROR',
      },
    });
    return;
  }

  // Unexpected error — log the full error, send generic response
  console.error('[Unhandled Error]', err);

  const message = err instanceof Error ? err.message : 'Internal server error';

  res.status(500).json({
    error: {
      message,
      code: 'INTERNAL_ERROR',
    },
  });
}
