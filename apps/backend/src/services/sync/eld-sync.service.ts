import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VehicleMatcher } from './matching/vehicle-matcher';
import { DriverMatcher } from './matching/driver-matcher';
import { VehicleMerger } from './merging/vehicle-merger';
import { DriverMerger } from './merging/driver-merger';
import axios from 'axios';

@Injectable()
export class EldSyncService {
  private readonly logger = new Logger(EldSyncService.name);

  constructor(
    private prisma: PrismaService,
    private vehicleMatcher: VehicleMatcher,
    private driverMatcher: DriverMatcher,
    private vehicleMerger: VehicleMerger,
    private driverMerger: DriverMerger,
  ) {}

  /**
   * Sync vehicles from ELD API (enrichment only)
   */
  async syncVehicles(integrationId: number): Promise<void> {
    this.logger.log(`Starting ELD vehicle sync for integration: ${integrationId}`);

    const integration = await this.prisma.integrationConfig.findUnique({
      where: { id: integrationId },
    });

    if (!integration || integration.vendor !== 'SAMSARA_ELD') {
      throw new Error('Invalid ELD integration');
    }

    const { tenantId } = integration;

    // Fetch vehicles from ELD
    const eldVehicles = await this.fetchEldVehicles(integrationId);

    let matchedCount = 0;
    let unmatchedCount = 0;

    // Match and merge each ELD vehicle
    for (const eldVehicle of eldVehicles) {
      // Try to match to existing DB vehicle
      const dbVehicle = await this.vehicleMatcher.match(tenantId, {
        vin: eldVehicle.vin,
        licensePlate: eldVehicle.licensePlate,
      });

      if (dbVehicle) {
        // Merge TMS data (from DB) with ELD data
        const mergedData = this.vehicleMerger.merge(dbVehicle, {
          eldVendor: integration.vendor,
          eldId: eldVehicle.id,
          serial: eldVehicle.serial,
          gateway: eldVehicle.gateway,
          esn: eldVehicle.esn,
        });

        // Update vehicle with merged data (only ELD metadata)
        await this.prisma.vehicle.update({
          where: { id: dbVehicle.id },
          data: {
            eldTelematicsMetadata: mergedData.eldTelematicsMetadata,
          },
        });

        matchedCount++;
      } else {
        this.logger.warn(`No matching vehicle found for ELD vehicle: ${eldVehicle.vin}`);
        unmatchedCount++;
      }
    }

    await this.prisma.integrationConfig.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    });

    this.logger.log(
      `ELD vehicle sync complete: ${matchedCount} matched, ${unmatchedCount} unmatched`
    );
  }

  /**
   * Sync drivers from ELD API (enrichment only)
   */
  async syncDrivers(integrationId: number): Promise<void> {
    this.logger.log(`Starting ELD driver sync for integration: ${integrationId}`);

    const integration = await this.prisma.integrationConfig.findUnique({
      where: { id: integrationId },
    });

    if (!integration || integration.vendor !== 'SAMSARA_ELD') {
      throw new Error('Invalid ELD integration');
    }

    const { tenantId } = integration;

    // Fetch drivers from ELD
    const eldDrivers = await this.fetchEldDrivers(integrationId);

    let matchedCount = 0;
    let unmatchedCount = 0;

    for (const eldDriver of eldDrivers) {
      // Try to match to existing DB driver
      const dbDriver = await this.driverMatcher.match(tenantId, {
        phone: eldDriver.phone,
        licenseNumber: eldDriver.licenseNumber,
        licenseState: eldDriver.licenseState,
      });

      if (dbDriver) {
        // Merge TMS data (from DB) with ELD data
        const mergedData = this.driverMerger.merge(dbDriver, {
          eldVendor: integration.vendor,
          eldId: eldDriver.id,
          username: eldDriver.username,
          eldSettings: eldDriver.eldSettings,
          timezone: eldDriver.timezone,
        });

        // Update driver with merged data (only ELD metadata)
        await this.prisma.driver.update({
          where: { id: dbDriver.id },
          data: {
            eldMetadata: mergedData.eldMetadata,
          },
        });

        matchedCount++;
      } else {
        this.logger.warn(`No matching driver found for ELD driver: ${eldDriver.phone}`);
        unmatchedCount++;
      }
    }

    await this.prisma.integrationConfig.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    });

    this.logger.log(
      `ELD driver sync complete: ${matchedCount} matched, ${unmatchedCount} unmatched`
    );
  }

  /**
   * Fetch vehicles from ELD API
   */
  private async fetchEldVehicles(integrationId: number): Promise<any[]> {
    const integration = await this.prisma.integrationConfig.findUnique({
      where: { id: integrationId },
    });

    const { apiKey } = integration.credentials as any;

    const response = await axios.get('https://api.samsara.com/fleet/vehicles', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    return response.data.data;
  }

  /**
   * Fetch drivers from ELD API
   */
  private async fetchEldDrivers(integrationId: number): Promise<any[]> {
    const integration = await this.prisma.integrationConfig.findUnique({
      where: { id: integrationId },
    });

    const { apiKey } = integration.credentials as any;

    const response = await axios.get('https://api.samsara.com/fleet/drivers', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    return response.data.data;
  }
}
