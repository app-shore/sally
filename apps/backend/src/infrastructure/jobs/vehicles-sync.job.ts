import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { TmsSyncService } from '../../domains/integrations/sync/tms-sync.service';
import { EldSyncService } from '../../domains/integrations/sync/eld-sync.service';

@Injectable()
export class VehiclesSyncJob {
  private readonly logger = new Logger(VehiclesSyncJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tmsSyncService: TmsSyncService,
    private readonly eldSyncService: EldSyncService,
  ) {}

  @Cron(process.env.SYNC_VEHICLES_CRON || '0 */15 * * * *')
  async syncVehicles() {
    this.logger.log('Starting vehicle sync across all integrations...');

    // Step 1: Sync from TMS (source of truth - creates vehicles)
    const tmsIntegrations = await this.prisma.integrationConfig.findMany({
      where: {
        integrationType: 'TMS',
        isEnabled: true,
        status: 'ACTIVE',
      },
      select: { id: true, integrationId: true, tenantId: true, vendor: true },
    });

    for (const integration of tmsIntegrations) {
      try {
        await this.tmsSyncService.syncVehicles(integration.id);
        this.logger.log(`Synced vehicles from TMS ${integration.integrationId} (tenant ${integration.tenantId})`);
      } catch (error) {
        this.logger.error(
          `Failed to sync vehicles from TMS ${integration.integrationId} (tenant ${integration.tenantId})`,
          error.stack,
        );
      }
    }

    // Step 2: Enrich from ELD (enrichment only - updates existing vehicles)
    const eldIntegrations = await this.prisma.integrationConfig.findMany({
      where: {
        integrationType: 'HOS_ELD',
        isEnabled: true,
        status: 'ACTIVE',
      },
      select: { id: true, integrationId: true, tenantId: true, vendor: true },
    });

    for (const integration of eldIntegrations) {
      try {
        await this.eldSyncService.syncVehicles(integration.id);
        this.logger.log(`Enriched vehicles from ELD ${integration.integrationId} (tenant ${integration.tenantId})`);
      } catch (error) {
        this.logger.error(
          `Failed to enrich vehicles from ELD ${integration.integrationId} (tenant ${integration.tenantId})`,
          error.stack,
        );
      }
    }

    this.logger.log(
      `Vehicle sync complete: ${tmsIntegrations.length} TMS, ${eldIntegrations.length} ELD integrations processed`,
    );
  }
}
