import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IntegrationManagerService } from './integration-manager.service';

/**
 * Background scheduler for automatic data synchronization
 *
 * Runs cron jobs to sync data from external systems:
 * - Every 5 minutes: HOS data from ELD systems
 * - Every 15 minutes: Driver lists from TMS
 * - Every hour: Vehicle lists
 */
@Injectable()
export class IntegrationSchedulerService {
  private readonly logger = new Logger(IntegrationSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private integrationManager: IntegrationManagerService,
  ) {}

  /**
   * Sync HOS data every 5 minutes for all active drivers
   * Only syncs for tenants with active HOS integrations
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncHOSData() {
    this.logger.log('🔄 Starting scheduled HOS sync...');

    try {
      // Get all tenants with active HOS integrations
      const activeIntegrations = await this.prisma.integrationConfig.findMany({
        where: {
          integrationType: 'HOS_ELD',
          status: 'ACTIVE',
          isEnabled: true,
        },
        select: {
          tenantId: true,
        },
        distinct: ['tenantId'],
      });

      if (activeIntegrations.length === 0) {
        this.logger.log('No active HOS integrations found, skipping sync');
        return;
      }

      this.logger.log(`Syncing HOS for ${activeIntegrations.length} tenants`);

      // Sync each tenant's drivers
      for (const integration of activeIntegrations) {
        try {
          await this.integrationManager.syncAllDriversForTenant(
            integration.tenantId,
          );
        } catch (error) {
          this.logger.error(
            `Failed to sync HOS for tenant ${integration.tenantId}:`,
            error.message,
          );
        }
      }

      this.logger.log('✅ HOS sync completed');
    } catch (error) {
      this.logger.error('Failed to run HOS sync job:', error);
    }
  }

  /**
   * Sync driver lists every 15 minutes
   * For TMS integrations that provide driver rosters
   */
  @Cron('0 */15 * * * *')
  async syncDriverLists() {
    this.logger.log('🔄 Starting scheduled driver list sync...');

    try {
      const activeIntegrations = await this.prisma.integrationConfig.findMany({
        where: {
          integrationType: 'TMS',
          status: 'ACTIVE',
          isEnabled: true,
        },
      });

      if (activeIntegrations.length === 0) {
        this.logger.log('No active TMS integrations found, skipping sync');
        return;
      }

      // TODO: Implement TMS driver sync in Phase 3
      this.logger.log('TMS driver sync not yet implemented');
    } catch (error) {
      this.logger.error('Failed to run driver list sync job:', error);
    }
  }

  /**
   * Cleanup old sync logs (keep last 30 days)
   * Runs daily at 2 AM
   */
  @Cron('0 2 * * *')
  async cleanupOldSyncLogs() {
    this.logger.log('🧹 Cleaning up old sync logs...');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deleted = await this.prisma.integrationSyncLog.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      this.logger.log(`✅ Deleted ${deleted.count} old sync logs`);
    } catch (error) {
      this.logger.error('Failed to cleanup sync logs:', error);
    }
  }
}
