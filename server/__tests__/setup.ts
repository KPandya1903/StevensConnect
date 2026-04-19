/**
 * Jest setup — runs before each test file.
 *
 * Loads .env so TEST_DATABASE_URL is available, then
 * truncates all tables in dependency-safe order so each test
 * starts from a clean state without re-running migrations.
 */

import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Override NODE_ENV to test so env.ts routes to TEST_DATABASE_URL
process.env.NODE_ENV = 'test';

const pool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL,
});

// Tables in reverse dependency order (children before parents)
const TRUNCATE_ORDER = [
  'reports',
  'listing_saves',
  'messages',
  'conversation_participants',
  'conversations',
  'listings',
  'refresh_tokens',
  'email_verifications',
  'users',
];

beforeEach(async () => {
  await pool.query(
    `TRUNCATE TABLE ${TRUNCATE_ORDER.join(', ')} RESTART IDENTITY CASCADE`,
  );
});

afterAll(async () => {
  await pool.end();
  // Close the app's own pool too (imported lazily to avoid import-order issues)
  const { closeDb } = await import('../src/db/pool');
  await closeDb();
});
