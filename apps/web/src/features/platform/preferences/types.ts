/**
 * TypeScript types for user preferences
 */

/**
 * Response from preferences reset endpoint
 * Returns the actual preferences object (type depends on scope parameter)
 */
export type PreferencesResetResponse = any; // Backend returns UserPreferences | OperationsSettings | DriverPreferences
