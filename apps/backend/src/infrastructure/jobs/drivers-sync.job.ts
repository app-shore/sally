import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { TmsSyncService } from '../../domains/integrations/sync/tms-sync.service';
import { EldSyncService } from '../../domains/integrations/sync/eld-sync.service';

@Injectable()
export class DriversSyncJob {
  private readonly logger = new Logger(DriversSyncJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tmsSyncService: TmsSyncService,
    private readonly eldSyncService: EldSyncService,
  ) {}

  @Cron(process.env.SYNC_DRIVERS_CRON || '0 */15 * * * *')
  async syncDrivers() {
    this.logger.log('Starting driver sync across all integrations...');

    // Step 1: Sync from TMS (source of truth - creates drivers)
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
        await this.tmsSyncService.syncDrivers(integration.id);
        this.logger.log(`Synced drivers from TMS ${integration.integrationId} (tenant ${integration.tenantId})`);
      } catch (error) {
        this.logger.error(
          `Failed to sync drivers from TMS ${integration.integrationId} (tenant ${integration.tenantId})`,
          error.stack,
        );
      }
    }

    // Step 2: Enrich from ELD (enrichment only - updates existing drivers)
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
        await this.eldSyncService.syncDrivers(integration.id);
        this.logger.log(`Enriched drivers from ELD ${integration.integrationId} (tenant ${integration.tenantId})`);
      } catch (error) {
        this.logger.error(
          `Failed to enrich drivers from ELD ${integration.integrationId} (tenant ${integration.tenantId})`,
          error.stack,
        );
      }
    }

    this.logger.log(
      `Driver sync complete: ${tmsIntegrations.length} TMS, ${eldIntegrations.length} ELD integrations processed`,
    );
  }
}
