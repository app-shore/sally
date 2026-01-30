import { Injectable } from '@nestjs/common';
import { IHOSAdapter, HOSData } from './hos-adapter.interface';

/**
 * Samsara ELD Adapter
 *
 * NOTE: Currently returns MOCK data for development/testing
 * In Phase 2, this will make real API calls to Samsara
 *
 * Real Samsara API: https://api.samsara.com
 * Docs: https://developers.samsara.com/docs
 */
@Injectable()
export class SamsaraHOSAdapter implements IHOSAdapter {
  private readonly baseUrl = 'https://api.samsara.com';
  private readonly useMockData = true; // Set to false when ready for real API calls

  /**
   * Get driver HOS data from Samsara ELD
   * Currently returns mock data - see useMockData flag
   */
  async getDriverHOS(apiKey: string, driverId: string): Promise<HOSData> {
    if (this.useMockData) {
      return this.getMockHOSData(driverId);
    }

    // Real API call (Phase 2)
    try {
      const response = await fetch(
        `${this.baseUrl}/v1/fleet/drivers/${driverId}/hos_logs`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Samsara API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform Samsara format → SALLY standard format
      return {
        driver_id: driverId,
        hours_driven: data.driveMilliseconds / (1000 * 60 * 60),
        on_duty_time: data.onDutyMilliseconds / (1000 * 60 * 60),
        hours_since_break: data.timeSinceLastBreakMilliseconds / (1000 * 60 * 60),
        duty_status: this.mapDutyStatus(data.dutyStatus),
        last_updated: data.lastUpdatedTime,
        data_source: 'samsara_eld',
      };
    } catch (error) {
      throw new Error(`Failed to fetch HOS from Samsara: ${error.message}`);
    }
  }

  /**
   * Test connection to Samsara API
   * Currently returns true for valid-looking API keys (mock mode)
   */
  async testConnection(apiKey: string): Promise<boolean> {
    if (this.useMockData) {
      // Mock validation - just check if apiKey exists and looks valid
      return apiKey && apiKey.length > 10;
    }

    // Real API test (Phase 2)
    try {
      const response = await fetch(`${this.baseUrl}/v1/fleet/drivers`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Sync all drivers from Samsara
   * Currently returns mock driver IDs
   */
  async syncAllDrivers(apiKey: string): Promise<string[]> {
    if (this.useMockData) {
      return ['driver_001', 'driver_002', 'driver_003'];
    }

    // Real API call (Phase 2)
    try {
      const response = await fetch(`${this.baseUrl}/v1/fleet/drivers`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Samsara API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.drivers?.map((d: any) => d.id) || [];
    } catch (error) {
      throw new Error(`Failed to sync drivers from Samsara: ${error.message}`);
    }
  }

  /**
   * Generate realistic mock HOS data for testing
   */
  private getMockHOSData(driverId: string): HOSData {
    // Different mock data based on driver ID for variety
    const mockData = {
      driver_001: {
        hours_driven: 8.5,
        on_duty_time: 11.2,
        hours_since_break: 7.8,
        duty_status: 'DRIVING' as const,
      },
      driver_002: {
        hours_driven: 4.3,
        on_duty_time: 6.5,
        hours_since_break: 4.2,
        duty_status: 'ON_DUTY_NOT_DRIVING' as const,
      },
      driver_003: {
        hours_driven: 0.0,
        on_duty_time: 0.5,
        hours_since_break: 10.0,
        duty_status: 'OFF_DUTY' as const,
      },
    };

    const data = mockData[driverId] || mockData.driver_001;

    return {
      driver_id: driverId,
      ...data,
      last_updated: new Date().toISOString(),
      data_source: 'mock_samsara',
    };
  }

  /**
   * Map Samsara duty status to SALLY standard format
   */
  private mapDutyStatus(samsaraStatus: string): HOSData['duty_status'] {
    const mapping: Record<string, HOSData['duty_status']> = {
      off_duty: 'OFF_DUTY',
      sleeper_berth: 'SLEEPER_BERTH',
      driving: 'DRIVING',
      on_duty_not_driving: 'ON_DUTY_NOT_DRIVING',
    };
    return mapping[samsaraStatus] || 'OFF_DUTY';
  }
}
