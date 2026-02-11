import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { IntegrationManagerService } from '../../domains/integrations/services/integration-manager.service';

@Injectable()
export class HosSyncJob {
  private readonly logger = new Logger(HosSyncJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationManager: IntegrationManagerService,
  ) {}

  @Cron(process.env.SYNC_HOS_CRON || '0 */5 * * * *')
  async syncHos() {
    this.logger.log('Starting HOS sync across all tenants...');

    const eldIntegrations = await this.prisma.integrationConfig.findMany({
      where: {
        integrationType: 'HOS_ELD',
        isEnabled: true,
        status: 'ACTIVE',
      },
      select: { id: true, integrationId: true, tenantId: true, vendor: true },
    });

    if (eldIntegrations.length === 0) {
      return;
    }

    // Deduplicate by tenantId (a tenant may have multiple ELD integrations)
    const uniqueTenantIds = [...new Set(eldIntegrations.map((i) => i.tenantId))];

    this.logger.log(
      `Found ${eldIntegrations.length} ELD integrations across ${uniqueTenantIds.length} tenants`,
    );

    for (const tenantId of uniqueTenantIds) {
      try {
        await this.integrationManager.syncAllDriversForTenant(tenantId);
        this.logger.log(`Synced HOS for tenant ${tenantId}`);
      } catch (error) {
        this.logger.error(
          `Failed to sync HOS for tenant ${tenantId}`,
          error.stack,
        );
      }
    }

    this.logger.log(`HOS sync complete: ${uniqueTenantIds.length} tenants processed`);
  }
}
