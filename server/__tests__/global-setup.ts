/**
 * Jest global setup — runs once before all test suites.
 *
 * Loads .env, then runs all SQL migrations against TEST_DATABASE_URL.
 * The test DB must already exist (created by docker-compose postgres_test service).
 *
 * Migrations run once here for the entire test session — individual tests
 * truncate tables in beforeEach for isolation without paying migration cost.
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { Pool } from 'pg';

// Load .env from server directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL is not set. Make sure docker-compose postgres_test is running and .env is configured.',
  );
}

const MIGRATIONS_DIR = path.resolve(__dirname, '../src/db/migrations');

export default async function globalSetup(): Promise<void> {
  console.info('\n🧪 Running migrations on test database...');

  const pool = new Pool({ connectionString: testDatabaseUrl });
  const client = await pool.connect();

  try {
    // Create tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   VARCHAR(255) PRIMARY KEY,
        run_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows } = await client.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations ORDER BY filename',
    );
    const alreadyRun = new Set(rows.map((r) => r.filename));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let ran = 0;
    for (const file of files) {
      if (alreadyRun.has(file)) continue;

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        ran++;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    console.info(
      ran === 0
        ? '  ✓ No new migrations to run.'
        : `  ✓ ${ran} migration(s) applied.`,
    );
  } finally {
    client.release();
    await pool.end();
  }
}
