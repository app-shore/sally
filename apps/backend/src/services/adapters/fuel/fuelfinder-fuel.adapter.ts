import { Injectable } from '@nestjs/common';
import { IFuelAdapter, FuelStation, FuelStationQuery } from './fuel-adapter.interface';

/**
 * Fuel Finder Adapter
 *
 * NOTE: Currently returns MOCK data for development/testing
 * In Phase 2, this will make real API calls to Fuel Finder
 */
@Injectable()
export class FuelFinderAdapter implements IFuelAdapter {
  private readonly useMockData = true; // Set to false when ready for real API calls

  /**
   * Find fuel stations near a location
   * Currently returns mock data - see useMockData flag
   */
  async findStations(apiKey: string, query: FuelStationQuery): Promise<FuelStation[]> {
    if (this.useMockData) {
      return this.getMockStations(query);
    }

    // Real API call (Phase 2)
    try {
      throw new Error('Real Fuel Finder API integration not implemented yet');
    } catch (error) {
      throw new Error(`Failed to fetch fuel stations from Fuel Finder: ${error.message}`);
    }
  }

  /**
   * Get current price for a specific station
   * Currently returns mock data
   */
  async getStationPrice(apiKey: string, stationId: string): Promise<FuelStation> {
    if (this.useMockData) {
      const stations = this.getMockStations({
        latitude: 33.4484,
        longitude: -112.074,
      });
      return stations.find((s) => s.station_id === stationId) || stations[0];
    }

    // Real API call (Phase 2)
    try {
      throw new Error('Real Fuel Finder API integration not implemented yet');
    } catch (error) {
      throw new Error(`Failed to fetch station from Fuel Finder: ${error.message}`);
    }
  }

  /**
   * Test connection to Fuel Finder API
   * Currently returns true for valid-looking API keys (mock mode)
   */
  async testConnection(apiKey: string): Promise<boolean> {
    if (this.useMockData) {
      // Mock validation - just check if apiKey exists and looks valid
      return apiKey && apiKey.length > 3;
    }

    // Real API test (Phase 2)
    try {
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Generate realistic mock fuel station data for testing
   */
  private getMockStations(query: FuelStationQuery): FuelStation[] {
    const baseStations: FuelStation[] = [
      {
        station_id: 'ff_station_001',
        name: 'Speedway Truck Stop',
        brand: 'Speedway',
        address: 'Exit 12, I-10 West',
        city: 'Phoenix',
        state: 'AZ',
        zip: '85001',
        latitude: 33.4484,
        longitude: -112.074,
        price_per_gallon: 3.38,
        diesel_price: 3.79,
        distance_miles: 1.5,
        amenities: ['truck_parking', 'showers', 'restaurant'],
        last_updated: new Date().toISOString(),
        data_source: 'mock_fuelfinder',
      },
      {
        station_id: 'ff_station_002',
        name: 'Circle K Truck Center',
        brand: 'Circle K',
        address: '800 Truck Route',
        city: 'Phoenix',
        state: 'AZ',
        zip: '85002',
        latitude: 33.4650,
        longitude: -112.088,
        price_per_gallon: 3.35,
        diesel_price: 3.76,
        distance_miles: 2.8,
        amenities: ['truck_parking', 'atm'],
        last_updated: new Date().toISOString(),
        data_source: 'mock_fuelfinder',
      },
    ];

    return baseStations.slice(0, query.max_results || 10);
  }
}
