import { Injectable } from '@nestjs/common';
import {
  IELDAdapter,
  ELDVehicleData,
  ELDDriverData,
  ELDVehicleLocationData,
} from './eld-adapter.interface';
import axios from 'axios';

/**
 * HOS clock data from Samsara API
 * Endpoint: GET /fleet/hos/clocks
 * Docs: https://developers.samsara.com/reference/gethosclocks
 */
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

/**
 * Samsara ELD Adapter
 *
 * Fetches vehicle, driver, HOS, and location data from Samsara ELD API.
 * Uses the recommended /fleet/vehicles/stats endpoint for GPS data
 * (the legacy /fleet/vehicles/locations endpoint is deprecated by Samsara).
 *
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

    const response = await axios.get(`${this.baseUrl}/fleet/drivers`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    return response.data.data;
  }

  /**
   * Get HOS clock data for all drivers from Samsara
   *
   * Real Samsara API response structure:
   * {
   *   data: [{
   *     driver: { id, name },
   *     currentDutyStatus: { hosStatusType: "driving" | "onDuty" | "offDuty" | "sleeperBerth" },
   *     clocks: {
   *       drive: { driveRemainingDurationMs },
   *       shift: { shiftRemainingDurationMs },
   *       cycle: { cycleRemainingDurationMs, cycleStartedAtTime, cycleTomorrowDurationMs },
   *       break: { timeUntilBreakDurationMs }
   *     },
   *     violations: { cycleViolationDurationMs, shiftDrivingViolationDurationMs }
   *   }]
   * }
   */
  async getHOSClocks(apiToken: string): Promise<HOSClockData[]> {
    const response = await axios.get(`${this.baseUrl}/fleet/hos/clocks`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    return (response.data.data || []).map((entry: any) => ({
      driverId: entry.driver?.id ?? '',
      driverName: entry.driver?.name ?? '',
      currentDutyStatus: this.mapDutyStatus(
        entry.currentDutyStatus?.hosStatusType,
      ),
      driveTimeRemainingMs: entry.clocks?.drive?.driveRemainingDurationMs ?? 0,
      shiftTimeRemainingMs: entry.clocks?.shift?.shiftRemainingDurationMs ?? 0,
      cycleTimeRemainingMs: entry.clocks?.cycle?.cycleRemainingDurationMs ?? 0,
      timeUntilBreakMs: entry.clocks?.break?.timeUntilBreakDurationMs ?? 0,
      lastUpdated: new Date().toISOString(),
    }));
  }

  /**
   * Get GPS location data for all vehicles from Samsara
   *
   * Uses GET /fleet/vehicles/stats?types=gps (Samsara's recommended endpoint).
   * The legacy /fleet/vehicles/locations endpoint is deprecated.
   *
   * Real Samsara API response:
   * {
   *   data: [{
   *     id: "vehicleId",
   *     name: "Truck-01",
   *     gps: { latitude, longitude, speedMilesPerHour, headingDegrees, time }
   *   }]
   * }
   */
  async getVehicleLocations(
    apiToken: string,
  ): Promise<ELDVehicleLocationData[]> {
    if (this.useMockData) {
      return [
        {
          vehicleId: '281474996387574',
          latitude: 32.7767,
          longitude: -96.797,
          speed: 62.5,
          heading: 180,
          timestamp: new Date().toISOString(),
        },
        {
          vehicleId: '281474996387575',
          latitude: 34.0522,
          longitude: -118.2437,
          speed: 0,
          heading: 0,
          timestamp: new Date().toISOString(),
        },
      ];
    }

    const response = await axios.get(
      `${this.baseUrl}/fleet/vehicles/stats?types=gps`,
      { headers: { Authorization: `Bearer ${apiToken}` } },
    );

    return (response.data.data || []).map((entry: any) => ({
      vehicleId: entry.id ?? '',
      vin: entry.externalIds?.['samsara.vin'] ?? undefined,
      latitude: entry.gps?.latitude ?? 0,
      longitude: entry.gps?.longitude ?? 0,
      speed: entry.gps?.speedMilesPerHour ?? 0,
      heading: entry.gps?.headingDegrees ?? 0,
      timestamp: entry.gps?.time ?? new Date().toISOString(),
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
