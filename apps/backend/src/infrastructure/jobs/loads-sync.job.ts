import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { TmsSyncService } from '../../domains/integrations/sync/tms-sync.service';

@Injectable()
export class LoadsSyncJob {
  private readonly logger = new Logger(LoadsSyncJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tmsSyncService: TmsSyncService,
  ) {}

  @Cron(process.env.SYNC_LOADS_CRON || '0 */15 * * * *')
  async syncLoads() {
    this.logger.log('Starting loads sync across all TMS integrations...');

    const tmsIntegrations = await this.prisma.integrationConfig.findMany({
      where: {
        integrationType: 'TMS',
        isEnabled: true,
        status: 'ACTIVE',
      },
      select: { id: true, integrationId: true, tenantId: true, vendor: true },
    });

    if (tmsIntegrations.length === 0) {
      return;
    }

    for (const integration of tmsIntegrations) {
      try {
        await this.tmsSyncService.syncLoads(integration.id);
        this.logger.log(`Synced loads from TMS ${integration.integrationId} (tenant ${integration.tenantId})`);
      } catch (error) {
        this.logger.error(
          `Failed to sync loads from TMS ${integration.integrationId} (tenant ${integration.tenantId})`,
          error.stack,
        );
      }
    }

    this.logger.log(`Loads sync complete: ${tmsIntegrations.length} TMS integrations processed`);
  }
}
