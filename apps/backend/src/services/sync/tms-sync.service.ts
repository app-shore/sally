import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CredentialsService } from '../credentials/credentials.service';
import { AdapterFactoryService } from '../adapters/adapter-factory.service';
import { VENDOR_REGISTRY } from '../../api/integrations/vendor-registry';

/**
 * TMS Sync Service
 *
 * Fetches vehicles and drivers from TMS systems (source of truth).
 * Uses AdapterFactory to get the appropriate adapter for each vendor.
 *
 * This service doesn't know about specific vendors - it delegates to adapters.
 */
@Injectable()
export class TmsSyncService {
  private readonly logger = new Logger(TmsSyncService.name);

  constructor(
    private prisma: PrismaService,
    private credentials: CredentialsService,
    private adapterFactory: AdapterFactoryService,
  ) {}

  /**
   * Sync vehicles from TMS API
   */
  async syncVehicles(integrationId: number): Promise<void> {
    this.logger.log(
      `Starting TMS vehicle sync for integration: ${integrationId}`,
    );

    const integration = await this.prisma.integrationConfig.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    const { tenantId, vendor } = integration;

    // Get adapter from factory
    const adapter = this.adapterFactory.getTMSAdapter(vendor);
    if (!adapter) {
      throw new Error(`No TMS adapter available for vendor: ${vendor}`);
    }

    // Get credentials (dynamic based on vendor's credential fields)
    const credentials = this.getVendorCredentials(
      integration.credentials,
      vendor,
    );

    // Fetch vehicles from TMS using adapter
    const tmsVehicles = await adapter.getVehicles(
      credentials.primary,
      credentials.secondary,
    );

    // Upsert each vehicle
    for (const tmsVehicle of tmsVehicles) {
      await this.prisma.vehicle.upsert({
        where: {
          externalVehicleId_tenantId: {
            externalVehicleId: tmsVehicle.vehicle_id,
            tenantId,
          },
        },
        update: {
          make: tmsVehicle.make,
          model: tmsVehicle.model,
          year: tmsVehicle.year,
          vin: tmsVehicle.vin,
          licensePlate: tmsVehicle.license_plate,
          externalSource: vendor,
          lastSyncedAt: new Date(),
        },
        create: {
          externalVehicleId: tmsVehicle.vehicle_id,
          vehicleId: tmsVehicle.vehicle_id,
          unitNumber: tmsVehicle.unit_number,
          tenantId,
          make: tmsVehicle.make,
          model: tmsVehicle.model,
          year: tmsVehicle.year,
          vin: tmsVehicle.vin,
          licensePlate: tmsVehicle.license_plate,
          externalSource: vendor,
          lastSyncedAt: new Date(),
        },
      });
    }

    await this.prisma.integrationConfig.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    });

    this.logger.log(`Synced ${tmsVehicles.length} vehicles from ${vendor}`);
  }

  /**
   * Sync drivers from TMS API
   */
  async syncDrivers(integrationId: number): Promise<void> {
    this.logger.log(
      `Starting TMS driver sync for integration: ${integrationId}`,
    );

    const integration = await this.prisma.integrationConfig.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    const { tenantId, vendor } = integration;

    // Get adapter from factory
    const adapter = this.adapterFactory.getTMSAdapter(vendor);
    if (!adapter) {
      throw new Error(`No TMS adapter available for vendor: ${vendor}`);
    }

    // Get credentials
    const credentials = this.getVendorCredentials(
      integration.credentials,
      vendor,
    );

    // Fetch drivers from TMS using adapter
    const tmsDrivers = await adapter.getDrivers(
      credentials.primary,
      credentials.secondary,
    );

    // Upsert each driver
    for (const tmsDriver of tmsDrivers) {
      await this.prisma.driver.upsert({
        where: {
          driverId_tenantId: {
            driverId: tmsDriver.driver_id,
            tenantId,
          },
        },
        update: {
          name: `${tmsDriver.first_name} ${tmsDriver.last_name}`,
          phone: tmsDriver.phone,
          email: tmsDriver.email,
          licenseNumber: tmsDriver.license_number,
          licenseState: tmsDriver.license_state,
          externalSource: vendor,
          lastSyncedAt: new Date(),
        },
        create: {
          externalDriverId: tmsDriver.driver_id,
          driverId: tmsDriver.driver_id,
          name: `${tmsDriver.first_name} ${tmsDriver.last_name}`,
          tenantId,
          phone: tmsDriver.phone,
          email: tmsDriver.email,
          licenseNumber: tmsDriver.license_number,
          licenseState: tmsDriver.license_state,
          externalSource: vendor,
          lastSyncedAt: new Date(),
        },
      });
    }

    await this.prisma.integrationConfig.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    });

    this.logger.log(`Synced ${tmsDrivers.length} drivers from ${vendor}`);
  }

  // TODO: Re-enable load syncing after updating Load schema to support TMS data
  // The current Load model is for route planning only and doesn't have the required fields
  // for TMS integration (pickupAddress, deliveryCity, pickupLatitude, etc.)
  //
  // async syncLoads(integrationId: number): Promise<void> { ... }

  /**
   * Get vendor credentials in the format expected by adapters
   *
   * Dynamically extracts credentials based on vendor registry configuration.
   * The first credential field is primary, second is secondary (if exists).
   */
  private getVendorCredentials(
    credentials: any,
    vendor: string,
  ): { primary: string; secondary: string } {
    // Get vendor metadata from registry
    const vendorMeta = VENDOR_REGISTRY[vendor];
    if (!vendorMeta) {
      throw new Error(`Vendor not found in registry: ${vendor}`);
    }

    // Extract credential field names from vendor registry
    const credentialFields = vendorMeta.credentialFields;
    if (!credentialFields || credentialFields.length === 0) {
      throw new Error(`No credential fields defined for vendor: ${vendor}`);
    }

    const primaryField = credentialFields[0]?.name;
    const secondaryField = credentialFields[1]?.name;

    if (!primaryField) {
      throw new Error(`Primary credential field missing for vendor: ${vendor}`);
    }

    return {
      primary: this.getCredentialField(credentials, primaryField),
      secondary: secondaryField
        ? this.getCredentialField(credentials, secondaryField)
        : '',
    };
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
