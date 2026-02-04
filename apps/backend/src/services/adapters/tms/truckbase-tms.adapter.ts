import { Injectable } from '@nestjs/common';
import { ITMSAdapter, LoadData, VehicleData, DriverData } from './tms-adapter.interface';

/**
 * Truckbase TMS Adapter
 *
 * Integrates with Truckbase TMS API to fetch load data
 * Requires both API_KEY and API_SECRET for authentication
 *
 * API Documentation: https://app.truckbase.io/settings/integrations
 * Note: Truckbase API may be private/partner-only access
 */
@Injectable()
export class TruckbaseTMSAdapter implements ITMSAdapter {
  private readonly useMockData = false; // Set to false when ready for real API calls
  private readonly baseUrl = process.env.TRUCKBASE_API_URL || 'https://api.truckbase.io/v1';

  /**
   * Get load details from Truckbase by load ID
   */
  async getLoad(apiKey: string, apiSecret: string, loadId: string): Promise<LoadData> {
    if (this.useMockData) {
      return this.getMockLoad(loadId);
    }

    // Real API call (Phase 2)
    try {
      const response = await fetch(`${this.baseUrl}/loads/${loadId}`, {
        headers: {
          'X-API-Key': apiKey,
          'X-API-Secret': apiSecret,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Truckbase API error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();
      return this.transformLoadData(data);
    } catch (error) {
      throw new Error(`Failed to fetch load from Truckbase: ${error.message}`);
    }
  }

  /**
   * Get all active loads from Truckbase
   */
  async getActiveLoads(apiKey: string, apiSecret: string): Promise<LoadData[]> {
    if (this.useMockData) {
      return [
        this.getMockLoad('TB-LOAD-001'),
        this.getMockLoad('TB-LOAD-002'),
      ];
    }

    // Real API call (Phase 2)
    try {
      const response = await fetch(`${this.baseUrl}/loads?status=active`, {
        headers: {
          'X-API-Key': apiKey,
          'X-API-Secret': apiSecret,
        },
      });

      if (!response.ok) {
        throw new Error(`Truckbase API error: ${response.statusText}`);
      }

      const data = await response.json();
      const loads = data.loads || data.data || data;
      return Array.isArray(loads) ? loads.map(load => this.transformLoadData(load)) : [];
    } catch (error) {
      throw new Error(`Failed to fetch loads from Truckbase: ${error.message}`);
    }
  }

  /**
   * Test connection to Truckbase API
   */
  async testConnection(apiKey: string, apiSecret?: string): Promise<boolean> {
    if (this.useMockData) {
      // Mock validation - just check if apiKey exists and looks valid
      return apiKey && apiKey.length > 3;
    }

    // Real API test (Phase 2)
    try {
      const response = await fetch(`${this.baseUrl}/loads`, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'X-API-Secret': apiSecret || '',
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get vehicles from Truckbase TMS
   */
  async getVehicles(apiKey: string, apiSecret: string): Promise<VehicleData[]> {
    if (this.useMockData) {
      return [
        {
          vehicle_id: 'TB_VEH_001',
          unit_number: 'TRUCK-TB-001',
          make: 'Peterbilt',
          model: '579',
          year: 2023,
          vin: '1XPCD40X8TD123456',
          license_plate: 'AZ-TB-789',
          status: 'ACTIVE',
          data_source: 'truckbase_tms',
        },
      ];
    }

    // Real API call (Phase 2)
    throw new Error('Real Truckbase API integration not implemented yet');
  }

  /**
   * Get drivers from Truckbase TMS
   */
  async getDrivers(apiKey: string, apiSecret: string): Promise<DriverData[]> {
    if (this.useMockData) {
      return [
        {
          driver_id: 'TB_DRV_001',
          first_name: 'David',
          last_name: 'Wilson',
          phone: '+15551234503',
          email: 'david.w@example.com',
          license_number: 'D9876543',
          license_state: 'AZ',
          status: 'ACTIVE',
          data_source: 'truckbase_tms',
        },
      ];
    }

    // Real API call (Phase 2)
    throw new Error('Real Truckbase API integration not implemented yet');
  }

  /**
   * Sync all loads from Truckbase and return their IDs
   */
  async syncAllLoads(apiKey: string, apiSecret: string): Promise<string[]> {
    if (this.useMockData) {
      return ['TB-LOAD-001', 'TB-LOAD-002'];
    }

    // Real API call (Phase 2)
    try {
      const loads = await this.getActiveLoads(apiKey, apiSecret);
      return loads.map(load => load.load_id);
    } catch (error) {
      throw new Error(`Failed to sync loads from Truckbase: ${error.message}`);
    }
  }

  /**
   * Transform Truckbase API response to LoadData format
   */
  private transformLoadData(tbData: any): LoadData {
    return {
      load_id: tbData.id || tbData.loadId,
      pickup_location: {
        address: tbData.pickup?.address || tbData.origin?.address,
        city: tbData.pickup?.city || tbData.origin?.city,
        state: tbData.pickup?.state || tbData.origin?.state,
        zip: tbData.pickup?.zip || tbData.origin?.zip,
        latitude: tbData.pickup?.lat || tbData.origin?.latitude,
        longitude: tbData.pickup?.lon || tbData.origin?.longitude,
      },
      delivery_location: {
        address: tbData.delivery?.address || tbData.destination?.address,
        city: tbData.delivery?.city || tbData.destination?.city,
        state: tbData.delivery?.state || tbData.destination?.state,
        zip: tbData.delivery?.zip || tbData.destination?.zip,
        latitude: tbData.delivery?.lat || tbData.destination?.latitude,
        longitude: tbData.delivery?.lon || tbData.destination?.longitude,
      },
      pickup_appointment: tbData.pickupTime || tbData.pickup_appointment,
      delivery_appointment: tbData.deliveryTime || tbData.delivery_appointment,
      assigned_driver_id: tbData.driverId || tbData.driver_id,
      status: this.mapLoadStatus(tbData.status),
      total_miles: tbData.miles || tbData.distance,
      data_source: 'truckbase_tms',
    };
  }

  /**
   * Map Truckbase load status to standard LoadData status
   */
  private mapLoadStatus(status: string): LoadData['status'] {
    const mapping: Record<string, LoadData['status']> = {
      'assigned': 'ASSIGNED',
      'in_transit': 'IN_TRANSIT',
      'delivered': 'DELIVERED',
      'cancelled': 'CANCELLED',
    };
    return mapping[status?.toLowerCase()] || 'ASSIGNED';
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
