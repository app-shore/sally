/**
 * Vehicle data from ELD system
 */
export interface ELDVehicleData {
  id: string; // ELD vendor's vehicle ID
  vin?: string;
  licensePlate?: string;
  serial?: string; // ELD device serial number
  gateway?: {
    serial?: string;
    model?: string;
  };
  esn?: string; // Electronic serial number
}

/**
 * Driver data from ELD system
 */
export interface ELDDriverData {
  id: string; // ELD vendor's driver ID
  username?: string;
  phone?: string;
  licenseNumber?: string;
  licenseState?: string;
  eldSettings?: any; // Vendor-specific ELD settings
  timezone?: string;
}

/**
 * Vehicle location data from ELD system
 *
 * Matches Samsara GET /fleet/vehicles/stats?types=gps response.
 * Fields like odometer, fuelLevel, engineRunning are not available
 * from this endpoint and default to zero/null/false in the DB.
 */
export interface ELDVehicleLocationData {
  vehicleId: string;
  vin?: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: string;
}

/**
 * Interface that all ELD adapters must implement
 */
export interface IELDAdapter {
  /**
   * Fetch all vehicles from ELD system
   * @param apiToken - API token for authentication
   * @returns Array of ELD vehicle data
   */
  getVehicles(apiToken: string): Promise<ELDVehicleData[]>;

  /**
   * Fetch all drivers from ELD system
   * @param apiToken - API token for authentication
   * @returns Array of ELD driver data
   */
  getDrivers(apiToken: string): Promise<ELDDriverData[]>;

  /**
   * Fetch current vehicle locations from ELD system
   * @param apiToken - API token for authentication
   * @returns Array of vehicle location data
   */
  getVehicleLocations(apiToken: string): Promise<ELDVehicleLocationData[]>;

  /**
   * Test if credentials are valid and connection works
   * @param apiToken - API token for authentication
   * @returns true if connection successful
   */
  testConnection(apiToken: string): Promise<boolean>;
}
