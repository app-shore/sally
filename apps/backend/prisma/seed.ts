/**
 * Legacy seed entry point.
 *
 * This file is kept for backward compatibility with `prisma migrate reset`
 * and `pnpm run db:seed`. It delegates to the new unified seed orchestrator.
 *
 * Preferred commands:
 *   pnpm run setup:base   — super admin + feature flags + truck stops
 *   pnpm run setup:demo   — base + sample alerts + notifications
 *   pnpm run setup:status — show what's been seeded
 */

// Delegate to the orchestrator with --profile base
process.argv.push('--profile', 'base');
require('./seeds/index');
