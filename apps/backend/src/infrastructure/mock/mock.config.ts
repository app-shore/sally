/**
 * Mock Mode Configuration
 *
 * Controls whether services return mock data or query real data.
 * Default: true (everything mocked until real services come online).
 *
 * Set MOCK_MODE=false in environment when real data flows.
 * Grep for MOCK_MODE to see what's still mocked.
 */
export const MOCK_MODE = process.env.MOCK_MODE !== 'false';
