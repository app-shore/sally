import { Injectable } from '@nestjs/common';
import {
  IELDAdapter,
  ELDVehicleData,
  ELDDriverData,
} from './eld-adapter.interface';
import axios from 'axios';

export interface HOSClockData {
  driverId: string;
  driverName: string;
  currentDutyStatus: 'driving' | 'onDuty' | 'offDuty' | 'sleeperBerth';
  driveTimeRemainingMs: number;
  shiftTimeRemainingMs: number;
  cycleTimeRemainingMs: number;
  timeUntilBreakMs: number;
  lastUpdated: string;
}

export interface VehicleLocationData {
  vehicleId: string;
  gps: {
    latitude: number;
    longitude: number;
    speedMilesPerHour: number;
    headingDegrees: number;
    time: string;
  };
}

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
   * Get HOS clock data for all drivers
   */
  async getHOSClocks(apiToken: string): Promise<HOSClockData[]> {
    const response = await axios.get(`${this.baseUrl}/fleet/hos/clocks`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    return (response.data.data || []).map((entry: any) => ({
      driverId: entry.driver?.id ?? '',
      driverName: entry.driver?.name ?? '',
      currentDutyStatus: this.mapDutyStatus(entry.currentDutyStatus?.type),
      driveTimeRemainingMs: entry.clocks?.drive?.remainingDurationMs ?? 0,
      shiftTimeRemainingMs: entry.clocks?.shift?.remainingDurationMs ?? 0,
      cycleTimeRemainingMs: entry.clocks?.cycle?.remainingDurationMs ?? 0,
      timeUntilBreakMs: entry.clocks?.break?.remainingDurationMs ?? 0,
      lastUpdated: new Date().toISOString(),
    }));
  }

  /**
   * Get GPS location data for all vehicles
   */
  async getVehicleLocations(apiToken: string): Promise<VehicleLocationData[]> {
    const response = await axios.get(
      `${this.baseUrl}/fleet/vehicles/stats?types=gps`,
      { headers: { Authorization: `Bearer ${apiToken}` } },
    );

    return (response.data.data || []).map((entry: any) => ({
      vehicleId: entry.id ?? '',
      gps: {
        latitude: entry.gps?.latitude ?? 0,
        longitude: entry.gps?.longitude ?? 0,
        speedMilesPerHour: entry.gps?.speedMilesPerHour ?? 0,
        headingDegrees: entry.gps?.headingDegrees ?? 0,
        time: entry.gps?.time ?? new Date().toISOString(),
      },
    }));
  }

  private mapDutyStatus(raw: string): HOSClockData['currentDutyStatus'] {
    const map: Record<string, HOSClockData['currentDutyStatus']> = {
      driving: 'driving',
      onDuty: 'onDuty',
      on_duty: 'onDuty',
      offDuty: 'offDuty',
      off_duty: 'offDuty',
      sleeperBerth: 'sleeperBerth',
      sleeper_berth: 'sleeperBerth',
    };
    return map[raw] ?? 'offDuty';
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
