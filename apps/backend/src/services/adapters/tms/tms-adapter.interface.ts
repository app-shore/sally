/**
 * Standard Load data format for SALLY
 * All TMS adapters must transform vendor-specific formats to this structure
 */
export interface LoadData {
  load_id: string;
  pickup_location: {
    address: string;
    city: string;
    state: string;
    zip: string;
    latitude: number;
    longitude: number;
  };
  delivery_location: {
    address: string;
    city: string;
    state: string;
    zip: string;
    latitude: number;
    longitude: number;
  };
  pickup_appointment?: string; // ISO 8601 datetime
  delivery_appointment?: string; // ISO 8601 datetime
  stops?: Array<{
    sequence: number;
    address: string;
    city: string;
    state: string;
    zip: string;
    latitude: number;
    longitude: number;
    appointment_time?: string;
    type: 'PICKUP' | 'DELIVERY' | 'STOP';
  }>;
  assigned_driver_id?: string;
  assigned_vehicle_id?: string;
  status: 'UNASSIGNED' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  total_miles?: number;
  data_source: string;
}

/**
 * Interface that all TMS adapters must implement
 */
export interface ITMSAdapter {
  /**
   * Fetch load details by ID
   * @param apiKey - Encrypted API key or credentials
   * @param apiSecret - Optional API secret (for vendors like Truckbase)
   * @param loadId - Load ID in the external system
   * @returns Standardized load data
   */
  getLoad(apiKey: string, apiSecret: string, loadId: string): Promise<LoadData>;

  /**
   * Fetch all active loads for a tenant
   * @param apiKey - Encrypted API key or credentials
   * @param apiSecret - Optional API secret (for vendors like Truckbase)
   * @returns Array of loads
   */
  getActiveLoads(apiKey: string, apiSecret: string): Promise<LoadData[]>;

  /**
   * Test if credentials are valid and connection works
   * @param apiKey - Encrypted API key or credentials
   * @param apiSecret - Optional API secret (for vendors like Truckbase)
   * @returns true if connection successful
   */
  testConnection(apiKey: string, apiSecret?: string): Promise<boolean>;

  /**
   * Sync all loads for a tenant
   * @param apiKey - Encrypted API key or credentials
   * @param apiSecret - Optional API secret (for vendors like Truckbase)
   * @returns Array of load IDs synced
   */
  syncAllLoads?(apiKey: string, apiSecret?: string): Promise<string[]>;
}
