/**
 * Legacy seed entry point.
 *
 * This file is kept for backward compatibility with `prisma migrate reset`
 * and `npm run db:seed`. It delegates to the new unified seed orchestrator.
 *
 * Preferred commands:
 *   npm run setup:base   — super admin + feature flags + truck stops
 *   npm run setup:demo   — base + sample alerts + notifications
 *   npm run setup:status — show what's been seeded
 */

// Delegate to the orchestrator with --profile base
process.argv.push('--profile', 'base');
require('./seeds/index');
