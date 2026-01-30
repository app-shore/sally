import { Injectable } from '@nestjs/common';
import { ITMSAdapter, LoadData } from './tms-adapter.interface';

/**
 * Truckbase TMS Adapter
 *
 * NOTE: Currently returns MOCK data for development/testing
 * In Phase 2, this will make real API calls to Truckbase
 *
 * Real Truckbase API: https://app.truckbase.io/settings/integrations
 */
@Injectable()
export class TruckbaseTMSAdapter implements ITMSAdapter {
  private readonly useMockData = true; // Set to false when ready for real API calls

  /**
   * Get load details from Truckbase
   * Currently returns mock data - see useMockData flag
   */
  async getLoad(apiKey: string, loadId: string): Promise<LoadData> {
    if (this.useMockData) {
      return this.getMockLoad(loadId);
    }

    // Real API call (Phase 2)
    try {
      // TODO: Implement actual Truckbase API integration
      throw new Error('Real Truckbase API integration not implemented yet');
    } catch (error) {
      throw new Error(`Failed to fetch load from Truckbase: ${error.message}`);
    }
  }

  /**
   * Get all active loads from Truckbase
   * Currently returns mock data
   */
  async getActiveLoads(apiKey: string): Promise<LoadData[]> {
    if (this.useMockData) {
      return [
        this.getMockLoad('TB-LOAD-001'),
        this.getMockLoad('TB-LOAD-002'),
      ];
    }

    // Real API call (Phase 2)
    try {
      throw new Error('Real Truckbase API integration not implemented yet');
    } catch (error) {
      throw new Error(`Failed to fetch loads from Truckbase: ${error.message}`);
    }
  }

  /**
   * Test connection to Truckbase
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
   * Sync all loads from Truckbase
   * Currently returns mock load IDs
   */
  async syncAllLoads(apiKey: string): Promise<string[]> {
    if (this.useMockData) {
      return ['TB-LOAD-001', 'TB-LOAD-002'];
    }

    // Real API call (Phase 2)
    try {
      return [];
    } catch (error) {
      throw new Error(`Failed to sync loads from Truckbase: ${error.message}`);
    }
  }

  /**
   * Generate realistic mock load data for testing
   */
  private getMockLoad(loadId: string): LoadData {
    return {
      load_id: loadId,
      pickup_location: {
        address: '2000 Logistics Ave',
        city: 'Phoenix',
        state: 'AZ',
        zip: '85001',
        latitude: 33.4484,
        longitude: -112.074,
      },
      delivery_location: {
        address: '5500 Distribution Center',
        city: 'Las Vegas',
        state: 'NV',
        zip: '89101',
        latitude: 36.1699,
        longitude: -115.1398,
      },
      pickup_appointment: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      delivery_appointment: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
      assigned_driver_id: 'driver_003',
      status: 'ASSIGNED' as const,
      total_miles: 300,
      data_source: 'mock_truckbase',
    };
  }
}
