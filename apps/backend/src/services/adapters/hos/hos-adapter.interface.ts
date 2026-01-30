/**
 * Standard HOS data format for SALLY
 * All adapters must transform vendor-specific formats to this structure
 */
export interface HOSData {
  driver_id: string;
  hours_driven: number;
  on_duty_time: number;
  hours_since_break: number;
  duty_status: 'OFF_DUTY' | 'SLEEPER_BERTH' | 'DRIVING' | 'ON_DUTY_NOT_DRIVING';
  last_updated: string;
  data_source: string;
  cached?: boolean;
  stale?: boolean;
  cache_age_seconds?: number;
  error?: string;
}

/**
 * Interface that all HOS/ELD adapters must implement
 */
export interface IHOSAdapter {
  /**
   * Fetch current HOS data for a driver
   * @param apiKey - Encrypted API key or credentials
   * @param driverId - Driver ID in the external system
   * @returns Standardized HOS data
   */
  getDriverHOS(apiKey: string, driverId: string): Promise<HOSData>;

  /**
   * Test if credentials are valid and connection works
   * @param apiKey - Encrypted API key or credentials
   * @returns true if connection successful
   */
  testConnection(apiKey: string): Promise<boolean>;

  /**
   * Sync all drivers for a tenant
   * @param apiKey - Encrypted API key or credentials
   * @returns Array of driver IDs synced
   */
  syncAllDrivers?(apiKey: string): Promise<string[]>;
}
