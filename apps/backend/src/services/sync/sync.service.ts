import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TmsSyncService } from './tms-sync.service';
import { EldSyncService } from './eld-sync.service';

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

    const vendor = await this.getIntegrationVendor(integrationId);

    if (vendor === 'PROJECT44_TMS') {
      await this.tmsSyncService.syncVehicles(integrationId);
      await this.tmsSyncService.syncDrivers(integrationId);
    } else if (vendor === 'SAMSARA_ELD' || vendor === 'KEEPTRUCKIN_ELD' || vendor === 'MOTIVE_ELD') {
      await this.eldSyncService.syncVehicles(integrationId);
      await this.eldSyncService.syncDrivers(integrationId);
    } else {
      throw new Error(`Unsupported vendor: ${vendor}`);
    }

    this.logger.log(`Sync complete for integration: ${integrationId}`);
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

    // Sync TMS first (source of truth)
    const tmsIntegrations = integrations.filter(i => i.vendor === 'PROJECT44_TMS');
    for (const integration of tmsIntegrations) {
      await this.syncIntegration(integration.id);
    }

    // Then sync ELD (enrichment)
    const eldIntegrations = integrations.filter(i =>
      i.vendor === 'SAMSARA_ELD' || i.vendor === 'KEEPTRUCKIN_ELD' || i.vendor === 'MOTIVE_ELD'
    );
    for (const integration of eldIntegrations) {
      await this.syncIntegration(integration.id);
    }

    this.logger.log(`Fleet sync complete for tenant: ${tenantId}`);
  }

  /**
   * Get vendor type for an integration
   */
  private async getIntegrationVendor(integrationId: number): Promise<string> {
    const integration = await this.prisma.integrationConfig.findUnique({
      where: { id: integrationId },
      select: { vendor: true },
    });

    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    return integration.vendor;
  }
}
