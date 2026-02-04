import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TmsSyncService } from './tms-sync.service';
import { EldSyncService } from './eld-sync.service';
import { VENDOR_REGISTRY } from '../../api/integrations/vendor-registry';
import { IntegrationType } from '../../api/integrations/dto/create-integration.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private prisma: PrismaService,
    private tmsSyncService: TmsSyncService,
    private eldSyncService: EldSyncService,
  ) {}

  /**
   * Sync a single integration (TMS or ELD)
   */
  async syncIntegration(integrationId: number): Promise<void> {
    this.logger.log(`Starting sync for integration: ${integrationId}`);

    const integration = await this.prisma.integrationConfig.findUnique({
      where: { id: integrationId },
      select: { vendor: true, integrationType: true, tenantId: true },
    });

    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    // Validate vendor exists in registry
    const vendorMeta = VENDOR_REGISTRY[integration.vendor];
    if (!vendorMeta) {
      throw new Error(`Unsupported vendor: ${integration.vendor}`);
    }

    // Create sync log entry
    const startTime = new Date();
    const syncType =
      vendorMeta.integrationType === IntegrationType.TMS ? 'TMS' : 'ELD';
    const logId = `log_${randomUUID()}`;

    const syncLog = await this.prisma.integrationSyncLog.create({
      data: {
        logId,
        integrationId,
        syncType,
        status: 'running',
        startedAt: startTime,
      },
    });

    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;

    try {
      // Route to appropriate sync service based on integration type
      if (vendorMeta.integrationType === IntegrationType.TMS) {
        this.logger.log(`Syncing TMS integration: ${integration.vendor}`);

        // Get counts before sync
        const vehiclesBefore = await this.prisma.vehicle.count({
          where: { tenantId: integration.tenantId },
        });
        const driversBefore = await this.prisma.driver.count({
          where: { tenantId: integration.tenantId },
        });
        const loadsBefore = await this.prisma.load.count({
          where: { tenantId: integration.tenantId },
        });

        // Sync vehicles, drivers, and loads
        await this.tmsSyncService.syncVehicles(integrationId);
        await this.tmsSyncService.syncDrivers(integrationId);
        await this.tmsSyncService.syncLoads(integrationId);

        // Get counts after sync
        const vehiclesAfter = await this.prisma.vehicle.count({
          where: { tenantId: integration.tenantId },
        });
        const driversAfter = await this.prisma.driver.count({
          where: { tenantId: integration.tenantId },
        });
        const loadsAfter = await this.prisma.load.count({
          where: { tenantId: integration.tenantId },
        });

        recordsProcessed = vehiclesAfter + driversAfter + loadsAfter;
        recordsCreated =
          vehiclesAfter -
          vehiclesBefore +
          (driversAfter - driversBefore) +
          (loadsAfter - loadsBefore);
        recordsUpdated = recordsProcessed - recordsCreated;
      } else if (vendorMeta.integrationType === IntegrationType.HOS_ELD) {
        this.logger.log(`Syncing ELD integration: ${integration.vendor}`);
        await this.eldSyncService.syncVehicles(integrationId);
        await this.eldSyncService.syncDrivers(integrationId);

        // For ELD, we're updating existing records
        recordsProcessed = await this.prisma.vehicle.count({
          where: { eldTelematicsMetadata: { not: null } },
        });
        recordsUpdated = recordsProcessed;
      } else {
        throw new Error(
          `Sync not supported for integration type: ${vendorMeta.integrationType}`,
        );
      }

      // Update sync log with success
      await this.prisma.integrationSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'success',
          completedAt: new Date(),
          recordsProcessed,
          recordsCreated,
          recordsUpdated,
        },
      });

      this.logger.log(`Sync complete for integration: ${integrationId}`);
    } catch (error) {
      // Update sync log with failure
      await this.prisma.integrationSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorDetails: {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          },
        },
      });

      this.logger.error(`Sync failed for integration: ${integrationId}`, error);
      throw error;
    }
  }

  /**
   * Sync all fleet data for a tenant (TMS first, then ELD)
   */
  async syncFleet(tenantId: number): Promise<void> {
    this.logger.log(`Starting fleet sync for tenant: ${tenantId}`);

    // Get all integrations for tenant
    const integrations = await this.prisma.integrationConfig.findMany({
      where: { tenantId, isEnabled: true },
    });

    // Sync TMS first (source of truth) - dynamically filter by integration type
    const tmsIntegrations = integrations.filter((i) => {
      const vendorMeta = VENDOR_REGISTRY[i.vendor];
      return vendorMeta && vendorMeta.integrationType === IntegrationType.TMS;
    });

    this.logger.log(`Found ${tmsIntegrations.length} TMS integrations`);
    for (const integration of tmsIntegrations) {
      await this.syncIntegration(integration.id);
    }

    // Then sync ELD (enrichment) - dynamically filter by integration type
    const eldIntegrations = integrations.filter((i) => {
      const vendorMeta = VENDOR_REGISTRY[i.vendor];
      return (
        vendorMeta && vendorMeta.integrationType === IntegrationType.HOS_ELD
      );
    });

    this.logger.log(`Found ${eldIntegrations.length} ELD integrations`);
    for (const integration of eldIntegrations) {
      await this.syncIntegration(integration.id);
    }

    this.logger.log(`Fleet sync complete for tenant: ${tenantId}`);
  }
}
