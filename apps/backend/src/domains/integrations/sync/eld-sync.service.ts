import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { VehicleMatcher } from './matching/vehicle-matcher';
import { DriverMatcher } from './matching/driver-matcher';
import { VehicleMerger } from './merging/vehicle-merger';
import { DriverMerger } from './merging/driver-merger';
import { CredentialsService } from '../credentials/credentials.service';
import { AdapterFactoryService } from '../adapters/adapter-factory.service';

/**
 * ELD Sync Service
 *
 * Enriches existing vehicles/drivers with ELD telematics data.
 * Uses AdapterFactory to get the appropriate adapter for each vendor.
 *
 * IMPORTANT: This is enrichment-only. ELD does NOT create vehicles/drivers.
 * TMS is the source of truth - sync TMS first, then ELD.
 */
@Injectable()
export class EldSyncService {
  private readonly logger = new Logger(EldSyncService.name);

  constructor(
    private prisma: PrismaService,
    private vehicleMatcher: VehicleMatcher,
    private driverMatcher: DriverMatcher,
    private vehicleMerger: VehicleMerger,
    private driverMerger: DriverMerger,
    private credentials: CredentialsService,
    private adapterFactory: AdapterFactoryService,
  ) {}

  /**
   * Sync vehicles from ELD API (enrichment only)
   */
  async syncVehicles(integrationId: number): Promise<void> {
    this.logger.log(
      `Starting ELD vehicle sync for integration: ${integrationId}`,
    );

    const integration = await this.prisma.integrationConfig.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    const { tenantId, vendor } = integration;

    // Get adapter from factory
    const adapter = this.adapterFactory.getELDAdapter(vendor);
    if (!adapter) {
      throw new Error(`No ELD adapter available for vendor: ${vendor}`);
    }

    // Get apiToken from credentials (all ELD vendors use apiToken)
    const apiToken = this.getCredentialField(
      integration.credentials,
      'apiToken',
    );

    // Fetch vehicles from ELD using adapter
    const eldVehicles = await adapter.getVehicles(apiToken);

    let matchedCount = 0;
    let unmatchedCount = 0;

    // Match and merge each ELD vehicle
    for (const eldVehicle of eldVehicles) {
      // Try to match to existing DB vehicle (from TMS)
      const dbVehicle = await this.vehicleMatcher.match(tenantId, {
        vin: eldVehicle.vin,
        licensePlate: eldVehicle.licensePlate,
      });

      if (dbVehicle) {
        // Merge TMS data (from DB) with ELD data
        const mergedData = this.vehicleMerger.merge(dbVehicle, {
          eldVendor: vendor,
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
        this.logger.warn(
          `No matching vehicle found for ELD vehicle: ${eldVehicle.vin || eldVehicle.id}. ` +
            `Ensure TMS is synced first.`,
        );
        unmatchedCount++;
      }
    }

    await this.prisma.integrationConfig.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    });

    this.logger.log(
      `ELD vehicle sync complete (${vendor}): ${matchedCount} matched, ${unmatchedCount} unmatched`,
    );
  }

  /**
   * Sync drivers from ELD API (enrichment only)
   */
  async syncDrivers(integrationId: number): Promise<void> {
    this.logger.log(
      `Starting ELD driver sync for integration: ${integrationId}`,
    );

    const integration = await this.prisma.integrationConfig.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    const { tenantId, vendor } = integration;

    // Get adapter from factory
    const adapter = this.adapterFactory.getELDAdapter(vendor);
    if (!adapter) {
      throw new Error(`No ELD adapter available for vendor: ${vendor}`);
    }

    // Get apiToken from credentials (all ELD vendors use apiToken)
    const apiToken = this.getCredentialField(
      integration.credentials,
      'apiToken',
    );

    // Fetch drivers from ELD using adapter
    const eldDrivers = await adapter.getDrivers(apiToken);

    let matchedCount = 0;
    let unmatchedCount = 0;

    for (const eldDriver of eldDrivers) {
      // Try to match to existing DB driver (from TMS)
      const dbDriver = await this.driverMatcher.match(tenantId, {
        phone: eldDriver.phone,
        licenseNumber: eldDriver.licenseNumber,
        licenseState: eldDriver.licenseState,
      });

      if (dbDriver) {
        // Merge TMS data (from DB) with ELD data
        const mergedData = this.driverMerger.merge(dbDriver, {
          eldVendor: vendor,
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
        this.logger.warn(
          `No matching driver found for ELD driver: ${eldDriver.phone || eldDriver.id}. ` +
            `Ensure TMS is synced first.`,
        );
        unmatchedCount++;
      }
    }

    await this.prisma.integrationConfig.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    });

    this.logger.log(
      `ELD driver sync complete (${vendor}): ${matchedCount} matched, ${unmatchedCount} unmatched`,
    );
  }

  /**
   * Extract and decrypt a specific credential field
   */
  private getCredentialField(credentials: any, fieldName: string): string {
    if (!credentials || !credentials[fieldName]) {
      throw new Error(`Invalid credentials - ${fieldName} missing`);
    }

    try {
      return this.credentials.decrypt(credentials[fieldName]);
    } catch {
      // If not encrypted, return as-is (for development)
      return credentials[fieldName];
    }
  }
}
