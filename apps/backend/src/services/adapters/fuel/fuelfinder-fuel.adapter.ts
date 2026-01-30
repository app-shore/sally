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
  private readonly useMockData = false; // Set to false when ready for real API calls
  private readonly baseUrl = process.env.FUELFINDER_API_URL || 'https://api.fuelfinder.com/v1';

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
      const { latitude, longitude, radius_miles = 25, max_results = 10 } = query;

      const response = await fetch(
        `${this.baseUrl}/stations?lat=${latitude}&lon=${longitude}&radius=${radius_miles}&limit=${max_results}`,
        {
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Fuel Finder API error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();
      const stations = data.stations || data.data || data;
      return Array.isArray(stations) ? stations.map(s => this.transformStationData(s)) : [];
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
      const response = await fetch(
        `${this.baseUrl}/stations?lat=33.4484&lon=-112.074&limit=1`,
        {
          headers: {
            'X-API-Key': apiKey,
          },
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Transform Fuel Finder API response to SALLY standard format
   */
  private transformStationData(ffData: any): FuelStation {
    return {
      station_id: ffData.id || ffData.station_id,
      name: ffData.name,
      brand: ffData.brand,
      address: ffData.address,
      city: ffData.city,
      state: ffData.state,
      zip: ffData.zip || ffData.postal_code,
      latitude: ffData.lat || ffData.latitude,
      longitude: ffData.lon || ffData.longitude,
      price_per_gallon: ffData.regular_price || ffData.price,
      diesel_price: ffData.diesel_price,
      distance_miles: ffData.distance,
      amenities: this.parseAmenities(ffData.amenities),
      last_updated: ffData.updated_at || new Date().toISOString(),
      data_source: 'fuelfinder',
    };
  }

  /**
   * Parse amenities from various formats
   */
  private parseAmenities(amenities: any): string[] {
    if (Array.isArray(amenities)) {
      return amenities;
    }
    if (typeof amenities === 'string') {
      return amenities.split(',').map(a => a.trim());
    }
    return [];
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
