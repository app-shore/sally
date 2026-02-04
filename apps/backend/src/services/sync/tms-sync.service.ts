import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class TmsSyncService {
  private readonly logger = new Logger(TmsSyncService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Sync vehicles from TMS API
   */
  async syncVehicles(integrationId: number): Promise<void> {
    this.logger.log(`Starting TMS vehicle sync for integration: ${integrationId}`);

    // Get integration config
    const integration = await this.prisma.integrationConfig.findUnique({
      where: { id: integrationId },
    });

    if (!integration || integration.vendor !== 'PROJECT44_TMS') {
      throw new Error('Invalid TMS integration');
    }

    const { apiKey, baseUrl } = integration.credentials as any;
    const { tenantId } = integration;

    // Fetch vehicles from TMS
    const response = await axios.get(`${baseUrl}/api/vehicles`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const tmsVehicles = response.data;

    // Upsert each vehicle
    for (const tmsVehicle of tmsVehicles) {
      // Generate vehicleId from externalVehicleId if not present
      const vehicleId = tmsVehicle.vehicleId || `VEH-${tmsVehicle.id}`;

      await this.prisma.vehicle.upsert({
        where: {
          externalVehicleId_tenantId: {
            externalVehicleId: tmsVehicle.id,
            tenantId,
          },
        },
        update: {
          make: tmsVehicle.make,
          model: tmsVehicle.model,
          year: tmsVehicle.year,
          vin: tmsVehicle.vin,
          licensePlate: tmsVehicle.licensePlate,
          externalSource: 'PROJECT44_TMS',
          lastSyncedAt: new Date(),
        },
        create: {
          externalVehicleId: tmsVehicle.id,
          vehicleId,
          unitNumber: tmsVehicle.unitNumber || `UNIT-${tmsVehicle.id}`,
          tenantId,
          make: tmsVehicle.make,
          model: tmsVehicle.model,
          year: tmsVehicle.year,
          vin: tmsVehicle.vin,
          licensePlate: tmsVehicle.licensePlate,
          externalSource: 'PROJECT44_TMS',
          lastSyncedAt: new Date(),
        },
      });
    }

    // Update last sync timestamp
    await this.prisma.integrationConfig.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    });

    this.logger.log(`Synced ${tmsVehicles.length} vehicles from TMS`);
  }

  /**
   * Sync drivers from TMS API
   */
  async syncDrivers(integrationId: number): Promise<void> {
    this.logger.log(`Starting TMS driver sync for integration: ${integrationId}`);

    const integration = await this.prisma.integrationConfig.findUnique({
      where: { id: integrationId },
    });

    if (!integration || integration.vendor !== 'PROJECT44_TMS') {
      throw new Error('Invalid TMS integration');
    }

    const { apiKey, baseUrl } = integration.credentials as any;
    const { tenantId } = integration;

    // Fetch drivers from TMS
    const response = await axios.get(`${baseUrl}/api/drivers`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const tmsDrivers = response.data;

    // Upsert each driver
    for (const tmsDriver of tmsDrivers) {
      // Generate driverId from externalDriverId if not present
      const driverId = tmsDriver.driverId || `DRV-${tmsDriver.id}`;

      await this.prisma.driver.upsert({
        where: {
          driverId_tenantId: {
            driverId,
            tenantId,
          },
        },
        update: {
          name: tmsDriver.name,
          phone: tmsDriver.phone,
          email: tmsDriver.email,
          licenseNumber: tmsDriver.licenseNumber,
          licenseState: tmsDriver.licenseState,
          externalSource: 'PROJECT44_TMS',
          lastSyncedAt: new Date(),
        },
        create: {
          externalDriverId: tmsDriver.id,
          driverId,
          name: tmsDriver.name,
          tenantId,
          phone: tmsDriver.phone,
          email: tmsDriver.email,
          licenseNumber: tmsDriver.licenseNumber,
          licenseState: tmsDriver.licenseState,
          externalSource: 'PROJECT44_TMS',
          lastSyncedAt: new Date(),
        },
      });
    }

    await this.prisma.integrationConfig.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    });

    this.logger.log(`Synced ${tmsDrivers.length} drivers from TMS`);
  }
}
