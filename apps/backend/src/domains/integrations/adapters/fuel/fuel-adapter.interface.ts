/**
 * Standard Fuel Station data format for SALLY
 * All fuel price adapters must transform vendor-specific formats to this structure
 */
export interface FuelStation {
  station_id: string;
  name: string;
  brand?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  price_per_gallon: number;
  diesel_price?: number;
  distance_miles?: number;
  amenities?: string[]; // e.g., ['truck_parking', 'showers', 'restaurant', 'atm']
  last_updated: string;
  data_source: string;
}

/**
 * Query parameters for finding fuel stations
 */
export interface FuelStationQuery {
  latitude: number;
  longitude: number;
  radius_miles?: number; // Default: 25 miles
  max_results?: number; // Default: 10
  fuel_type?: 'DIESEL' | 'GASOLINE';
  sort_by?: 'PRICE' | 'DISTANCE';
}

/**
 * Interface that all Fuel Price adapters must implement
 */
export interface IFuelAdapter {
  /**
   * Find fuel stations near a location
   * @param apiKey - Encrypted API key or credentials
   * @param query - Search parameters
   * @returns Array of fuel stations sorted by criteria
   */
  findStations(apiKey: string, query: FuelStationQuery): Promise<FuelStation[]>;

  /**
   * Get current price for a specific station
   * @param apiKey - Encrypted API key or credentials
   * @param stationId - Station ID in the external system
   * @returns Fuel station with current price
   */
  getStationPrice(apiKey: string, stationId: string): Promise<FuelStation>;

  /**
   * Test if credentials are valid and connection works
   * @param apiKey - Encrypted API key or credentials
   * @returns true if connection successful
   */
  testConnection(apiKey: string): Promise<boolean>;
}
