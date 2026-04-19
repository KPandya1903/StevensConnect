/**
 * Jest global teardown — runs once after all test suites complete.
 *
 * Nothing needed here for now — the DB pool closes on process exit.
 * Add cleanup logic here if needed (e.g., wiping test data in CI).
 */

export default async function globalTeardown(): Promise<void> {
  // No-op for now
}
