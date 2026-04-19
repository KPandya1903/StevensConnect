/**
 * Migration runner.
 *
 * Reads all .sql files from migrations/ in filename order and executes them.
 * Tracks which migrations have run in a `schema_migrations` table.
 *
 * Usage:
 *   npm run migrate            -- runs against DATABASE_URL
 *   npm run migrate:test       -- runs against TEST_DATABASE_URL (via env override in package.json)
 *
 * This is intentionally simple. For more complex migration needs, switch to
 * node-pg-migrate. The interface stays the same from the app's perspective.
 */

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function migrate(): Promise<void> {
  const client = await pool.connect();

  try {
    // Create the migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   VARCHAR(255) PRIMARY KEY,
        run_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Get already-run migrations
    const { rows } = await client.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations ORDER BY filename',
    );
    const alreadyRun = new Set(rows.map((r) => r.filename));

    // Read migration files in sorted order
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let ran = 0;
    for (const file of files) {
      if (alreadyRun.has(file)) {
        continue;
      }

      console.info(`  → Running migration: ${file}`);
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

    if (ran === 0) {
      console.info('  ✓ No new migrations to run.');
    } else {
      console.info(`  ✓ ${ran} migration(s) applied.`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
