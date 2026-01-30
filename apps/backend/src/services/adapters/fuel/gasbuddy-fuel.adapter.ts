import { Injectable } from '@nestjs/common';
import { IFuelAdapter, FuelStation, FuelStationQuery } from './fuel-adapter.interface';

/**
 * GasBuddy Fuel Price Adapter
 *
 * NOTE: Currently returns MOCK data for development/testing
 * In Phase 2, this will make real API calls to GasBuddy Business API
 *
 * Real GasBuddy API: https://www.gasbuddy.com/business
 */
@Injectable()
export class GasBuddyFuelAdapter implements IFuelAdapter {
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
      // TODO: Implement actual GasBuddy API integration
      // const response = await fetch(`${gasBuddyApiUrl}/stations`, {
      //   headers: { 'X-API-Key': apiKey },
      //   body: JSON.stringify(query)
      // });
      throw new Error('Real GasBuddy API integration not implemented yet');
    } catch (error) {
      throw new Error(`Failed to fetch fuel stations from GasBuddy: ${error.message}`);
    }
  }

  /**
   * Get current price for a specific station
   * Currently returns mock data
   */
  async getStationPrice(apiKey: string, stationId: string): Promise<FuelStation> {
    if (this.useMockData) {
      const stations = this.getMockStations({
        latitude: 32.7767,
        longitude: -96.797,
      });
      return stations.find((s) => s.station_id === stationId) || stations[0];
    }

    // Real API call (Phase 2)
    try {
      // TODO: Implement actual GasBuddy API integration
      throw new Error('Real GasBuddy API integration not implemented yet');
    } catch (error) {
      throw new Error(`Failed to fetch station from GasBuddy: ${error.message}`);
    }
  }

  /**
   * Test connection to GasBuddy API
   * Currently returns true for valid-looking API keys (mock mode)
   */
  async testConnection(apiKey: string): Promise<boolean> {
    if (this.useMockData) {
      // Mock validation - just check if apiKey exists and looks valid
      return apiKey && apiKey.length > 10;
    }

    // Real API test (Phase 2)
    try {
      // TODO: Test actual GasBuddy connection
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
        station_id: 'gb_station_001',
        name: 'Pilot Travel Center',
        brand: 'Pilot',
        address: 'Exit 45, I-35 South',
        city: 'Dallas',
        state: 'TX',
        zip: '75201',
        latitude: 32.7767,
        longitude: -96.797,
        price_per_gallon: 3.45,
        diesel_price: 3.89,
        distance_miles: 2.3,
        amenities: ['truck_parking', 'showers', 'restaurant', 'atm', 'wifi'],
        last_updated: new Date().toISOString(),
        data_source: 'mock_gasbuddy',
      },
      {
        station_id: 'gb_station_002',
        name: "Love's Travel Stop",
        brand: "Love's",
        address: '1200 Highway 67',
        city: 'Dallas',
        state: 'TX',
        zip: '75202',
        latitude: 32.7555,
        longitude: -96.8089,
        price_per_gallon: 3.42,
        diesel_price: 3.85,
        distance_miles: 3.8,
        amenities: ['truck_parking', 'showers', 'restaurant'],
        last_updated: new Date().toISOString(),
        data_source: 'mock_gasbuddy',
      },
      {
        station_id: 'gb_station_003',
        name: 'Flying J Travel Plaza',
        brand: 'Flying J',
        address: '4500 Interstate 20',
        city: 'Dallas',
        state: 'TX',
        zip: '75203',
        latitude: 32.7481,
        longitude: -96.7958,
        price_per_gallon: 3.48,
        diesel_price: 3.92,
        distance_miles: 4.2,
        amenities: ['truck_parking', 'showers', 'restaurant', 'scales'],
        last_updated: new Date().toISOString(),
        data_source: 'mock_gasbuddy',
      },
      {
        station_id: 'gb_station_004',
        name: 'TA Express',
        brand: 'TravelCenters of America',
        address: '800 Service Road',
        city: 'Dallas',
        state: 'TX',
        zip: '75204',
        latitude: 32.7912,
        longitude: -96.7856,
        price_per_gallon: 3.39,
        diesel_price: 3.82,
        distance_miles: 5.1,
        amenities: ['truck_parking', 'showers', 'restaurant', 'repair'],
        last_updated: new Date().toISOString(),
        data_source: 'mock_gasbuddy',
      },
      {
        station_id: 'gb_station_005',
        name: 'Petro Stopping Center',
        brand: 'Petro',
        address: '2100 Truck Plaza Dr',
        city: 'Dallas',
        state: 'TX',
        zip: '75205',
        latitude: 32.8067,
        longitude: -96.7689,
        price_per_gallon: 3.51,
        diesel_price: 3.95,
        distance_miles: 6.8,
        amenities: ['truck_parking', 'showers', 'restaurant', 'theater'],
        last_updated: new Date().toISOString(),
        data_source: 'mock_gasbuddy',
      },
    ];

    // Filter by radius if specified
    let filteredStations = baseStations;
    if (query.radius_miles) {
      filteredStations = baseStations.filter(
        (s) => s.distance_miles! <= query.radius_miles!,
      );
    }

    // Sort by price or distance
    if (query.sort_by === 'PRICE') {
      filteredStations.sort((a, b) => {
        const priceA = query.fuel_type === 'DIESEL' ? a.diesel_price! : a.price_per_gallon;
        const priceB = query.fuel_type === 'DIESEL' ? b.diesel_price! : b.price_per_gallon;
        return priceA - priceB;
      });
    } else {
      filteredStations.sort((a, b) => a.distance_miles! - b.distance_miles!);
    }

    // Limit results
    const maxResults = query.max_results || 10;
    return filteredStations.slice(0, maxResults);
  }
}
