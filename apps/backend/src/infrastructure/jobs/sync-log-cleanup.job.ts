import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SyncLogCleanupJob {
  private readonly logger = new Logger(SyncLogCleanupJob.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 2 * * *')
  async cleanupOldSyncLogs() {
    this.logger.log('Starting sync log cleanup...');

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const result = await this.prisma.integrationSyncLog.deleteMany({
        where: { createdAt: { lt: thirtyDaysAgo } },
      });

      this.logger.log(`Deleted ${result.count} sync logs older than 30 days`);
    } catch (error) {
      this.logger.error('Failed to cleanup sync logs', error.stack);
    }
  }
}
