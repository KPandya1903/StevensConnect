/**
 * Sentry initialisation.
 *
 * Must be imported BEFORE any other application code in index.ts so that
 * Sentry can instrument Express, pg, and other modules automatically.
 *
 * In dev/test the DSN is absent so Sentry is a no-op (no network traffic).
 */

import * as Sentry from '@sentry/node';
import { env } from './env';

export function initSentry(): void {
  if (!env.SENTRY_DSN) return;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.isProduction ? 0.2 : 0,
  });
}

export { Sentry };
