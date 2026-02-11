import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { AdapterFactoryService } from '../../domains/integrations/adapters/adapter-factory.service';
import { CredentialsService } from '../../domains/integrations/credentials/credentials.service';

@Injectable()
export class TelematicsSyncJob {
  private readonly logger = new Logger(TelematicsSyncJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapterFactory: AdapterFactoryService,
    private readonly credentials: CredentialsService,
  ) {}

  @Cron(process.env.SYNC_TELEMATICS_CRON || '0 */2 * * * *')
  async syncTelematics() {
    this.logger.log('Starting telematics sync...');

    const eldIntegrations = await this.prisma.integrationConfig.findMany({
      where: {
        integrationType: 'HOS_ELD',
        isEnabled: true,
        status: 'ACTIVE',
      },
      select: { id: true, integrationId: true, tenantId: true, vendor: true, credentials: true },
    });

    if (eldIntegrations.length === 0) {
      return;
    }

    for (const integration of eldIntegrations) {
      try {
        const adapter = this.adapterFactory.getELDAdapter(integration.vendor);
        if (!adapter) {
          this.logger.warn(`No ELD adapter for vendor: ${integration.vendor}`);
          continue;
        }

        const apiToken = this.getCredentialField(integration.credentials, 'apiToken');
        const locations = await adapter.getVehicleLocations(apiToken);

        for (const location of locations) {
          // Match by VIN first, then by ELD ID in metadata
          const vehicle = await this.prisma.vehicle.findFirst({
            where: {
              tenantId: integration.tenantId,
              OR: [
                ...(location.vin ? [{ vin: location.vin }] : []),
                {
                  eldTelematicsMetadata: {
                    path: ['eldId'],
                    equals: location.vehicleId,
                  },
                },
              ],
            },
          });

          if (!vehicle) {
            continue;
          }

          await this.prisma.vehicleTelematics.upsert({
            where: { vehicleId: vehicle.id },
            update: {
              latitude: location.latitude,
              longitude: location.longitude,
              speed: location.speed,
              heading: location.heading,
              timestamp: new Date(location.timestamp),
            },
            create: {
              vehicleId: vehicle.id,
              tenantId: integration.tenantId,
              latitude: location.latitude,
              longitude: location.longitude,
              speed: location.speed,
              heading: location.heading,
              timestamp: new Date(location.timestamp),
            },
          });
        }

        this.logger.log(
          `Synced telematics from ELD ${integration.integrationId} (tenant ${integration.tenantId}): ${locations.length} locations`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to sync telematics from ELD ${integration.integrationId} (tenant ${integration.tenantId})`,
          error.stack,
        );
      }
    }
  }

  private getCredentialField(credentials: any, fieldName: string): string {
    if (!credentials || !credentials[fieldName]) {
      throw new Error(`Invalid credentials - ${fieldName} missing`);
    }

    try {
      return this.credentials.decrypt(credentials[fieldName]);
    } catch {
      return credentials[fieldName];
    }
  }
}
