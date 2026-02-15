import { Injectable } from '@nestjs/common';
import {
  ITMSAdapter,
  LoadData,
  VehicleData,
  DriverData,
} from './tms-adapter.interface';
import { MOCK_MODE } from '../../../../infrastructure/mock/mock.config';
import {
  MOCK_TMS_DRIVERS,
  MOCK_TMS_VEHICLES,
  MOCK_TMS_LOADS,
} from '../../../../infrastructure/mock/mock.dataset';

/**
 * McLeod TMS Adapter
 *
 * When MOCK_MODE=true: returns data from the unified mock dataset.
 * When MOCK_MODE=false: calls real McLeod TMS API (Phase 2/3).
 */
@Injectable()
export class McLeodTMSAdapter implements ITMSAdapter {
  async getLoad(
    apiKey: string,
    apiSecret: string,
    loadId: string,
  ): Promise<LoadData> {
    if (MOCK_MODE) {
      const load = MOCK_TMS_LOADS.find((l) => l.load_id === loadId);
      if (!load) throw new Error(`Load ${loadId} not found in mock data`);
      return load;
    }

    // Real API call (Phase 2)
    throw new Error('Real McLeod API integration not implemented yet');
  }

  async getActiveLoads(apiKey: string, apiSecret: string): Promise<LoadData[]> {
    if (MOCK_MODE) return MOCK_TMS_LOADS;

    // Real API call (Phase 2)
    throw new Error('Real McLeod API integration not implemented yet');
  }

  async testConnection(apiKey: string, apiSecret?: string): Promise<boolean> {
    if (MOCK_MODE) {
      return !!apiKey && apiKey.length > 10;
    }

    // Real API test (Phase 2)
    return false;
  }

  async getVehicles(apiKey: string, apiSecret: string): Promise<VehicleData[]> {
    if (MOCK_MODE) return MOCK_TMS_VEHICLES;

    // Real API call (Phase 2)
    throw new Error('Real McLeod API integration not implemented yet');
  }

  async getDrivers(apiKey: string, apiSecret: string): Promise<DriverData[]> {
    if (MOCK_MODE) return MOCK_TMS_DRIVERS;

    // Real API call (Phase 2)
    throw new Error('Real McLeod API integration not implemented yet');
  }

  async syncAllLoads(apiKey: string, apiSecret?: string): Promise<string[]> {
    if (MOCK_MODE) return MOCK_TMS_LOADS.map((l) => l.load_id);

    // Real API call (Phase 2)
    return [];
  }
}
