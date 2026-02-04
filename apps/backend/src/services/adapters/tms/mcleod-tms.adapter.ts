import { Injectable } from '@nestjs/common';
import { ITMSAdapter, LoadData, VehicleData, DriverData } from './tms-adapter.interface';

/**
 * McLeod TMS Adapter
 *
 * NOTE: Currently returns MOCK data for development/testing
 * In Phase 2, this will make real API calls to McLeod TMS
 *
 * Real McLeod API: Contact McLeod for API documentation
 */
@Injectable()
export class McLeodTMSAdapter implements ITMSAdapter {
  private readonly useMockData = true; // Set to false when ready for real API calls

  /**
   * Get load details from McLeod TMS
   * Currently returns mock data - see useMockData flag
   */
  async getLoad(apiKey: string, apiSecret: string, loadId: string): Promise<LoadData> {
    if (this.useMockData) {
      return this.getMockLoad(loadId);
    }

    // Real API call (Phase 2)
    try {
      // TODO: Implement actual McLeod API integration
      // const response = await fetch(`${mcleodBaseUrl}/loads/${loadId}`, {
      //   headers: { Authorization: `Bearer ${apiKey}` }
      // });
      throw new Error('Real McLeod API integration not implemented yet');
    } catch (error) {
      throw new Error(`Failed to fetch load from McLeod: ${error.message}`);
    }
  }

  /**
   * Get all active loads from McLeod TMS
   * Currently returns mock data
   */
  async getActiveLoads(apiKey: string, apiSecret: string): Promise<LoadData[]> {
    if (this.useMockData) {
      return [
        this.getMockLoad('LOAD-001'),
        this.getMockLoad('LOAD-002'),
        this.getMockLoad('LOAD-003'),
      ];
    }

    // Real API call (Phase 2)
    try {
      // TODO: Implement actual McLeod API integration
      throw new Error('Real McLeod API integration not implemented yet');
    } catch (error) {
      throw new Error(`Failed to fetch loads from McLeod: ${error.message}`);
    }
  }

  /**
   * Test connection to McLeod TMS
   * Currently returns true for valid-looking API keys (mock mode)
   */
  async testConnection(apiKey: string, apiSecret?: string): Promise<boolean> {
    if (this.useMockData) {
      // Mock validation - just check if apiKey exists and looks valid
      return apiKey && apiKey.length > 10;
    }

    // Real API test (Phase 2)
    try {
      // TODO: Test actual McLeod connection
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get vehicles from McLeod TMS
   * Currently returns mock data
   */
  async getVehicles(apiKey: string, apiSecret: string): Promise<VehicleData[]> {
    if (this.useMockData) {
      return [
        {
          vehicle_id: 'MCLEOD_VEH_001',
          unit_number: 'TRUCK-ML-001',
          make: 'Freightliner',
          model: 'Cascadia',
          year: 2022,
          vin: '1FUJGBDV4KLBP7529',
          license_plate: 'TX-ML-123',
          status: 'ACTIVE',
          data_source: 'mcleod_tms',
        },
        {
          vehicle_id: 'MCLEOD_VEH_002',
          unit_number: 'TRUCK-ML-002',
          make: 'Kenworth',
          model: 'T680',
          year: 2023,
          vin: '1XKYDP9X3MR123456',
          license_plate: 'TX-ML-456',
          status: 'ACTIVE',
          data_source: 'mcleod_tms',
        },
      ];
    }

    // Real API call (Phase 2)
    throw new Error('Real McLeod API integration not implemented yet');
  }

  /**
   * Get drivers from McLeod TMS
   * Currently returns mock data
   */
  async getDrivers(apiKey: string, apiSecret: string): Promise<DriverData[]> {
    if (this.useMockData) {
      return [
        {
          driver_id: 'MCLEOD_DRV_001',
          first_name: 'Robert',
          last_name: 'Johnson',
          phone: '+15551234501',
          email: 'robert.j@example.com',
          license_number: 'D7654321',
          license_state: 'TX',
          status: 'ACTIVE',
          data_source: 'mcleod_tms',
        },
        {
          driver_id: 'MCLEOD_DRV_002',
          first_name: 'Maria',
          last_name: 'Garcia',
          phone: '+15551234502',
          email: 'maria.g@example.com',
          license_number: 'D8765432',
          license_state: 'TX',
          status: 'ACTIVE',
          data_source: 'mcleod_tms',
        },
      ];
    }

    // Real API call (Phase 2)
    throw new Error('Real McLeod API integration not implemented yet');
  }

  /**
   * Sync all loads from McLeod TMS
   * Currently returns mock load IDs
   */
  async syncAllLoads(apiKey: string, apiSecret?: string): Promise<string[]> {
    if (this.useMockData) {
      return ['LOAD-001', 'LOAD-002', 'LOAD-003'];
    }

    // Real API call (Phase 2)
    try {
      // TODO: Implement actual McLeod sync
      return [];
    } catch (error) {
      throw new Error(`Failed to sync loads from McLeod: ${error.message}`);
    }
  }

  /**
   * Generate realistic mock load data for testing
   */
  private getMockLoad(loadId: string): LoadData {
    const mockLoads = {
      'LOAD-001': {
        load_id: 'LOAD-001',
        pickup_location: {
          address: '1500 Distribution Way',
          city: 'Dallas',
          state: 'TX',
          zip: '75201',
          latitude: 32.7767,
          longitude: -96.797,
        },
        delivery_location: {
          address: '4200 Warehouse Blvd',
          city: 'Houston',
          state: 'TX',
          zip: '77002',
          latitude: 29.7604,
          longitude: -95.3698,
        },
        pickup_appointment: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        delivery_appointment: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        assigned_driver_id: 'driver_001',
        assigned_vehicle_id: 'vehicle_001',
        status: 'ASSIGNED' as const,
        total_miles: 239,
        data_source: 'mock_mcleod_tms',
      },
      'LOAD-002': {
        load_id: 'LOAD-002',
        pickup_location: {
          address: '800 Industrial Pkwy',
          city: 'Austin',
          state: 'TX',
          zip: '78701',
          latitude: 30.2672,
          longitude: -97.7431,
        },
        delivery_location: {
          address: '1200 Commerce St',
          city: 'San Antonio',
          state: 'TX',
          zip: '78205',
          latitude: 29.4241,
          longitude: -98.4936,
        },
        status: 'UNASSIGNED' as const,
        total_miles: 80,
        data_source: 'mock_mcleod_tms',
      },
      'LOAD-003': {
        load_id: 'LOAD-003',
        pickup_location: {
          address: '500 Logistics Center',
          city: 'Fort Worth',
          state: 'TX',
          zip: '76102',
          latitude: 32.7555,
          longitude: -97.3308,
        },
        delivery_location: {
          address: '3000 Distribution Dr',
          city: 'Oklahoma City',
          state: 'OK',
          zip: '73102',
          latitude: 35.4676,
          longitude: -97.5164,
        },
        assigned_driver_id: 'driver_002',
        status: 'IN_TRANSIT' as const,
        total_miles: 206,
        data_source: 'mock_mcleod_tms',
      },
    };

    return mockLoads[loadId] || mockLoads['LOAD-001'];
  }
}
