import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { SyncService } from '../../domains/integrations/sync/sync.service';

@Injectable()
export class AutoSyncJob {
  private readonly logger = new Logger(AutoSyncJob.name);

  constructor(
    private prisma: PrismaService,
    private syncService: SyncService,
  ) {}

  /**
   * Auto-sync job runs every minute
   * Checks which integrations are due for sync based on their interval
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleAutoSync() {
    this.logger.debug('Running auto-sync check');

    const now = new Date();

    // Get all active integrations
    const integrations = await this.prisma.integrationConfig.findMany({
      where: { isEnabled: true },
      select: {
        id: true,
        vendor: true,
        syncIntervalSeconds: true,
        lastSyncAt: true,
      },
    });

    for (const integration of integrations) {
      const isDue = this.isIntegrationDueForSync(integration, now);

      if (isDue) {
        this.logger.log(
          `Auto-syncing integration: ${integration.id} (${integration.vendor})`,
        );

        try {
          await this.syncService.syncIntegration(integration.id);
        } catch (error) {
          this.logger.error(`Auto-sync failed for ${integration.id}:`, error);
        }
      }
    }
  }

  /**
   * Check if integration is due for sync
   */
  private isIntegrationDueForSync(
    integration: {
      syncIntervalSeconds: number | null;
      lastSyncAt: Date | null;
    },
    now: Date,
  ): boolean {
    if (!integration.lastSyncAt) {
      return true; // Never synced before
    }

    if (!integration.syncIntervalSeconds) {
      return false; // No interval configured
    }

    const secondsSinceLastSync =
      (now.getTime() - integration.lastSyncAt.getTime()) / 1000;
    return secondsSinceLastSync >= integration.syncIntervalSeconds;
  }
}
