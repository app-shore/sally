import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CredentialsService } from './credentials/credentials.service';
import { IntegrationManagerService } from './services/integration-manager.service';
import { SyncService } from './sync/sync.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { VENDOR_REGISTRY } from './vendor-registry';
import { randomUUID } from 'crypto';

@Injectable()
export class IntegrationsService {
  constructor(
    private prisma: PrismaService,
    private credentials: CredentialsService,
    private integrationManager: IntegrationManagerService,
    private syncService: SyncService,
  ) {}

  /**
   * List all integrations for a tenant
   */
  async listIntegrations(tenantId: number | string) {
    // If tenantId is a string (from JWT), look up the numeric ID
    let numericTenantId: number;
    if (typeof tenantId === 'string') {
      const tenant = await this.prisma.tenant.findUnique({
        where: { tenantId },
        select: { id: true },
      });
      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }
      numericTenantId = tenant.id;
    } else {
      numericTenantId = tenantId;
    }

    const integrations = await this.prisma.integrationConfig.findMany({
      where: { tenantId: numericTenantId },
      select: {
        integrationId: true,
        integrationType: true,
        vendor: true,
        displayName: true,
        isEnabled: true,
        status: true,
        syncIntervalSeconds: true,
        lastSyncAt: true,
        lastSuccessAt: true,
        lastErrorAt: true,
        lastErrorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return integrations.map((i) => ({
      id: i.integrationId,
      integration_type: i.integrationType,
      vendor: i.vendor,
      display_name: i.displayName,
      is_enabled: i.isEnabled,
      status: i.status,
      sync_interval_seconds: i.syncIntervalSeconds,
      last_sync_at: i.lastSyncAt?.toISOString(),
      last_success_at: i.lastSuccessAt?.toISOString(),
      last_error_at: i.lastErrorAt?.toISOString(),
      last_error_message: i.lastErrorMessage,
      created_at: i.createdAt.toISOString(),
      updated_at: i.updatedAt.toISOString(),
    }));
  }

  /**
   * Get a specific integration
   */
  async getIntegration(integrationId: string) {
    const integration = await this.prisma.integrationConfig.findUnique({
      where: { integrationId },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    return {
      id: integration.integrationId,
      integration_type: integration.integrationType,
      vendor: integration.vendor,
      display_name: integration.displayName,
      is_enabled: integration.isEnabled,
      status: integration.status,
      sync_interval_seconds: integration.syncIntervalSeconds,
      last_sync_at: integration.lastSyncAt?.toISOString(),
      last_success_at: integration.lastSuccessAt?.toISOString(),
      last_error_at: integration.lastErrorAt?.toISOString(),
      last_error_message: integration.lastErrorMessage,
      created_at: integration.createdAt.toISOString(),
      updated_at: integration.updatedAt.toISOString(),
    };
  }

  /**
   * Create new integration
   */
  async createIntegration(
    tenantId: number | string,
    dto: CreateIntegrationDto,
  ) {
    // Validate vendor exists in registry
    const vendorMeta = VENDOR_REGISTRY[dto.vendor];
    if (!vendorMeta) {
      throw new BadRequestException(`Unsupported vendor: ${dto.vendor}`);
    }

    // Validate required credentials provided
    const missingFields = vendorMeta.credentialFields.filter(
      (f) => f.required && !dto.credentials?.[f.name],
    );
    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Missing required credentials: ${missingFields.map((f) => f.name).join(', ')}`,
      );
    }

    // If tenantId is a string (from JWT), look up the numeric ID
    let numericTenantId: number;
    if (typeof tenantId === 'string') {
      const tenant = await this.prisma.tenant.findUnique({
        where: { tenantId },
        select: { id: true },
      });
      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }
      numericTenantId = tenant.id;
    } else {
      numericTenantId = tenantId;
    }

    // Check if integration already exists
    const existing = await this.prisma.integrationConfig.findFirst({
      where: {
        tenantId: numericTenantId,
        integrationType: dto.integration_type,
        vendor: dto.vendor,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Integration already exists for ${vendorMeta.displayName}. Please edit the existing integration instead.`,
      );
    }

    // Encrypt credentials if provided (dynamically encrypt all credential fields)
    let encryptedCredentials = null;
    if (dto.credentials) {
      encryptedCredentials = {};
      for (const [key, value] of Object.entries(dto.credentials)) {
        encryptedCredentials[key] = value
          ? this.credentials.encrypt(value)
          : value;
      }
    }

    const integration = await this.prisma.integrationConfig.create({
      data: {
        integrationId: `int_${randomUUID()}`,
        tenantId: numericTenantId,
        integrationType: dto.integration_type,
        vendor: dto.vendor,
        displayName: dto.display_name,
        credentials: encryptedCredentials,
        syncIntervalSeconds: dto.sync_interval_seconds || 300,
        isEnabled: true,
        status: 'CONFIGURED',
      },
    });

    return {
      id: integration.integrationId,
      integration_type: integration.integrationType,
      vendor: integration.vendor,
      display_name: integration.displayName,
      is_enabled: integration.isEnabled,
      status: integration.status,
      created_at: integration.createdAt.toISOString(),
      updated_at: integration.updatedAt.toISOString(),
    };
  }

  /**
   * Update integration
   */
  async updateIntegration(integrationId: string, dto: UpdateIntegrationDto) {
    const existing = await this.prisma.integrationConfig.findUnique({
      where: { integrationId },
    });

    if (!existing) {
      throw new NotFoundException('Integration not found');
    }

    // Encrypt credentials if provided (dynamically encrypt all credential fields)
    let encryptedCredentials = existing.credentials;
    if (dto.credentials) {
      encryptedCredentials = { ...(existing.credentials as any) };
      for (const [key, value] of Object.entries(dto.credentials)) {
        if (value) {
          encryptedCredentials[key] = this.credentials.encrypt(value);
        }
      }
    }

    const updated = await this.prisma.integrationConfig.update({
      where: { integrationId },
      data: {
        displayName: dto.display_name,
        credentials: encryptedCredentials,
        syncIntervalSeconds: dto.sync_interval_seconds,
        isEnabled: dto.is_enabled,
      },
    });

    return {
      id: updated.integrationId,
      integration_type: updated.integrationType,
      vendor: updated.vendor,
      display_name: updated.displayName,
      is_enabled: updated.isEnabled,
      status: updated.status,
      updated_at: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Delete integration
   */
  async deleteIntegration(integrationId: string) {
    await this.prisma.integrationConfig.delete({
      where: { integrationId },
    });

    return { success: true };
  }

  /**
   * Test connection
   */
  async testConnection(integrationId: string) {
    const success = await this.integrationManager.testConnection(integrationId);

    return {
      success,
      message: success
        ? 'Connection successful'
        : 'Connection failed - check credentials',
    };
  }

  /**
   * Trigger manual sync
   */
  async triggerSync(integrationId: string) {
    const integration = await this.prisma.integrationConfig.findUnique({
      where: { integrationId },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    // Use new SyncService for TMS/ELD sync
    await this.syncService.syncIntegration(integration.id);

    return {
      success: true,
      message: 'Sync completed',
    };
  }

  /**
   * Get sync history for an integration
   */
  async getSyncHistory(
    integrationId: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    const integration = await this.prisma.integrationConfig.findUnique({
      where: { integrationId },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    const logs = await this.prisma.integrationSyncLog.findMany({
      where: { integrationId: integration.id },
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return logs.map((log) => ({
      id: log.logId,
      sync_type: log.syncType,
      status: log.status,
      started_at: log.startedAt.toISOString(),
      completed_at: log.completedAt?.toISOString(),
      duration_ms: log.completedAt
        ? log.completedAt.getTime() - log.startedAt.getTime()
        : null,
      records_processed: log.recordsProcessed,
      records_created: log.recordsCreated,
      records_updated: log.recordsUpdated,
    }));
  }

  /**
   * Get sync statistics for an integration
   */
  async getSyncStats(integrationId: string) {
    const integration = await this.prisma.integrationConfig.findUnique({
      where: { integrationId },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    const [total, successful, failed] = await Promise.all([
      this.prisma.integrationSyncLog.count({
        where: { integrationId: integration.id },
      }),
      this.prisma.integrationSyncLog.count({
        where: { integrationId: integration.id, status: 'success' },
      }),
      this.prisma.integrationSyncLog.count({
        where: { integrationId: integration.id, status: 'failed' },
      }),
    ]);

    return {
      total_syncs: total,
      successful_syncs: successful,
      failed_syncs: failed,
      success_rate: total > 0 ? (successful / total) * 100 : 0,
    };
  }
}
