import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CredentialsService } from '../credentials/credentials.service';
import { AdapterFactoryService } from '../adapters/adapter-factory.service';
import { VENDOR_REGISTRY } from '../vendor-registry';

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
          fuelCapacityGallons: 150,
          equipmentType: 'DRY_VAN',
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

  /**
   * Sync loads from TMS API
   */
  async syncLoads(integrationId: number): Promise<void> {
    this.logger.log(
      `Starting TMS load sync for integration: ${integrationId}`,
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

    // Fetch loads from TMS using adapter
    const tmsLoads = await adapter.getActiveLoads(
      credentials.primary,
      credentials.secondary,
    );

    // Upsert each load
    for (const tmsLoad of tmsLoads) {
      // Find or create stops from TMS load data
      const stopIds: number[] = [];

      // Process all stops if available
      if (tmsLoad.stops && tmsLoad.stops.length > 0) {
        for (const tmsStop of tmsLoad.stops) {
          const stop = await this.findOrCreateStop(
            tmsStop.address,
            tmsStop.city,
            tmsStop.state,
            tmsStop.zip,
            tmsStop.latitude,
            tmsStop.longitude,
          );
          stopIds.push(stop.id);
        }
      } else {
        // Fallback to pickup/delivery locations
        const pickupStop = await this.findOrCreateStop(
          tmsLoad.pickup_location.address,
          tmsLoad.pickup_location.city,
          tmsLoad.pickup_location.state,
          tmsLoad.pickup_location.zip,
          tmsLoad.pickup_location.latitude,
          tmsLoad.pickup_location.longitude,
        );
        stopIds.push(pickupStop.id);

        const deliveryStop = await this.findOrCreateStop(
          tmsLoad.delivery_location.address,
          tmsLoad.delivery_location.city,
          tmsLoad.delivery_location.state,
          tmsLoad.delivery_location.zip,
          tmsLoad.delivery_location.latitude,
          tmsLoad.delivery_location.longitude,
        );
        stopIds.push(deliveryStop.id);
      }

      // Upsert load
      const load = await this.prisma.load.upsert({
        where: {
          externalLoadId: tmsLoad.load_id,
        },
        update: {
          loadNumber: tmsLoad.load_number,
          customerName: tmsLoad.customer_name,
          weightLbs: tmsLoad.weight_lbs ?? 0,
          commodityType: tmsLoad.commodity_type ?? 'general',
          specialRequirements: tmsLoad.special_requirements || null,
          status: this.mapLoadStatus(tmsLoad.status),
          externalSource: vendor,
          lastSyncedAt: new Date(),
        },
        create: {
          loadId: `LOAD-${tmsLoad.load_number}`,
          loadNumber: tmsLoad.load_number,
          customerName: tmsLoad.customer_name,
          weightLbs: tmsLoad.weight_lbs ?? 0,
          commodityType: tmsLoad.commodity_type ?? 'general',
          specialRequirements: tmsLoad.special_requirements || null,
          status: this.mapLoadStatus(tmsLoad.status),
          externalLoadId: tmsLoad.load_id,
          externalSource: vendor,
          lastSyncedAt: new Date(),
          tenantId,
          isActive: true,
        },
      });

      // Delete existing load_stops and recreate
      await this.prisma.loadStop.deleteMany({
        where: { loadId: load.id },
      });

      // Create new load_stops
      let sequence = 1;
      for (const stopId of stopIds) {
        const isPickup = sequence === 1;
        await this.prisma.loadStop.create({
          data: {
            loadId: load.id,
            stopId: stopId,
            sequenceOrder: sequence,
            actionType: isPickup ? 'pickup' : 'delivery',
            estimatedDockHours: 1.0,
          },
        });
        sequence++;
      }
    }

    await this.prisma.integrationConfig.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    });

    this.logger.log(`Synced ${tmsLoads.length} loads from ${vendor}`);
  }

  /**
   * Find or create a stop (location) from TMS data
   */
  private async findOrCreateStop(
    address: string,
    city: string,
    state: string,
    zip: string,
    latitude: number,
    longitude: number,
  ) {
    let stop = await this.prisma.stop.findFirst({
      where: {
        address,
        city,
        state,
      },
    });

    if (!stop) {
      stop = await this.prisma.stop.create({
        data: {
          stopId: `TMS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: `${city}, ${state}`,
          address,
          city,
          state,
          lat: latitude,
          lon: longitude,
          locationType: 'customer',
          isActive: true,
        },
      });
    }

    return stop;
  }

  /**
   * Map TMS load status to SALLY load status
   */
  private mapLoadStatus(
    tmsStatus: 'UNASSIGNED' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED',
  ): string {
    const statusMap: Record<string, string> = {
      UNASSIGNED: 'pending',
      ASSIGNED: 'assigned',
      IN_TRANSIT: 'in_transit',
      DELIVERED: 'delivered',
      CANCELLED: 'cancelled',
    };
    return statusMap[tmsStatus] || 'pending';
  }

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
