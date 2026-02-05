import { Injectable } from '@nestjs/common';
import {
  IELDAdapter,
  ELDVehicleData,
  ELDDriverData,
} from './eld-adapter.interface';
import axios from 'axios';

/**
 * Samsara ELD Adapter
 *
 * Fetches vehicle and driver data from Samsara ELD API
 * API Documentation: https://developers.samsara.com/
 */
@Injectable()
export class SamsaraELDAdapter implements IELDAdapter {
  private readonly baseUrl = 'https://api.samsara.com';
  private useMockData = false; // Using real Samsara API (keys configured)

  /**
   * Get all vehicles from Samsara ELD
   */
  async getVehicles(apiToken: string): Promise<ELDVehicleData[]> {
    if (this.useMockData) {
      // MOCK DATA - Update this to match your actual Samsara fleet
      return [
        {
          id: '281474996387574',
          vin: '1FUJGHDV9JLJY8062',
          licensePlate: 'TX R70-1836',
          serial: 'G9NP7UVUFS',
          gateway: {
            serial: 'G9NP-7UV-UFS',
            model: 'VG55NA',
          },
          esn: '471928S0565797',
        },
        {
          id: '281474996387575',
          vin: '3AKJHPDV2KSKA4482',
          licensePlate: 'CA-ABC123',
          serial: 'H1QA8VWVGT',
          gateway: {
            serial: 'H1QA-8VW-VGT',
            model: 'VG55NA',
          },
          esn: '471928S0565798',
        },
      ];
    }

    // Real API call
    const response = await axios.get(`${this.baseUrl}/fleet/vehicles`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    return response.data.data;
  }

  /**
   * Get all drivers from Samsara ELD
   */
  async getDrivers(apiToken: string): Promise<ELDDriverData[]> {
    if (this.useMockData) {
      // MOCK DATA - Update this to match your actual Samsara drivers
      return [
        {
          id: '53207939',
          username: 'John Smith',
          phone: '+19788856169',
          licenseNumber: 'NHL14227039',
          licenseState: 'NH',
          eldSettings: {
            rulesets: [
              {
                cycle: 'USA 70 hour / 8 day',
                shift: 'US Interstate Property',
                restart: '34-hour Restart',
                break: 'Property (off-duty/sleeper)',
              },
            ],
          },
          timezone: 'America/New_York',
        },
        {
          id: '53207940',
          username: 'Jane Doe',
          phone: '+15551234567',
          licenseNumber: 'CAL987654321',
          licenseState: 'CA',
          eldSettings: {
            rulesets: [
              {
                cycle: 'USA 70 hour / 8 day',
                shift: 'US Interstate Property',
                restart: '34-hour Restart',
                break: 'Property (off-duty/sleeper)',
              },
            ],
          },
          timezone: 'America/Los_Angeles',
        },
      ];
    }

    // Real API call
    const response = await axios.get(`${this.baseUrl}/fleet/drivers`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    return response.data.data;
  }

  /**
   * Test connection to Samsara API
   */
  async testConnection(apiToken: string): Promise<boolean> {
    if (this.useMockData) {
      // In mock mode, accept any non-empty token
      return !!apiToken && apiToken.length > 0;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/fleet/drivers`, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}
