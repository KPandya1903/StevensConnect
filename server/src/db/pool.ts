/**
 * PostgreSQL connection pool.
 *
 * This is the single pg.Pool instance for the entire server.
 * All repositories import from here — never create a new Pool elsewhere.
 *
 * Pool config:
 *   max: 20 — adequate for a single-server deployment
 *   idleTimeoutMillis: 30s — reclaim idle connections
 *   connectionTimeoutMillis: 2s — fail fast if DB is unreachable
 */

import { Pool } from 'pg';
import { env } from '../config/env';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.isTest ? 5 : 20, // fewer connections in test to avoid overwhelming test DB
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

// Verify connectivity on startup (called from index.ts before server starts listening)
export async function connectDb(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.info(`✅ Database connected: ${env.DATABASE_URL.split('@')[1] ?? 'connected'}`);
  } finally {
    client.release();
  }
}

// Graceful shutdown — called on SIGTERM/SIGINT
export async function closeDb(): Promise<void> {
  await pool.end();
  console.info('Database pool closed.');
}
