import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CredentialsService } from '../credentials/credentials.service';
import { RetryService } from '../../../infrastructure/retry/retry.service';
import { AlertService, AlertSeverity } from '../../operations/alerts/services/alert.service';
import { SamsaraELDAdapter } from '../adapters/eld/samsara-eld.adapter';
import { McLeodTMSAdapter } from '../adapters/tms/mcleod-tms.adapter';
import { Project44TMSAdapter } from '../adapters/tms/project44-tms.adapter';
import { GasBuddyFuelAdapter } from '../adapters/fuel/gasbuddy-fuel.adapter';
import { OpenWeatherAdapter } from '../adapters/weather/openweather.adapter';

/**
 * HOS Data structure (temporary placeholder until HOS adapter is implemented)
 * TODO: Define proper HOS data interface and implement HOS adapter
 */
export interface HOSData {
  cached?: boolean;
  cache_age_seconds?: number;
  data_source?: string;
  [key: string]: any;
}

/**
 * Central service for managing external system integrations
 *
 * Responsibilities:
 * - Fetch data from external systems with caching
 * - Handle manual overrides
 * - Graceful degradation when APIs are down
 * - Test connections
 * - Sync data in background
 */
@Injectable()
export class IntegrationManagerService {
  private readonly logger = new Logger(IntegrationManagerService.name);

  constructor(
    private prisma: PrismaService,
    private credentials: CredentialsService,
    private retry: RetryService,
    private alertService: AlertService,
    private samsaraAdapter: SamsaraELDAdapter,
    private mcleodAdapter: McLeodTMSAdapter,
    private project44Adapter: Project44TMSAdapter,
    private gasBuddyAdapter: GasBuddyFuelAdapter,
    private openWeatherAdapter: OpenWeatherAdapter,
  ) {}

  /**
   * Fetch driver HOS (with cache fallback strategy)
   *
   * Priority:
   * 1. Manual override → return override
   * 2. Fresh cache (<5min) → return cached
   * 3. Fetch from ELD → update cache
   * 4. Stale cache (on error) → return with warning
   */
  async getDriverHOS(tenantId: number, driverId: string): Promise<HOSData> {
    const driver = await this.prisma.driver.findFirst({
      where: { driverId, tenantId },
    });

    if (!driver) {
      throw new Error(`Driver ${driverId} not found`);
    }

    // 1. Manual override takes precedence
    if (driver.hosManualOverride && driver.hosData) {
      return {
        ...(driver.hosData as any),
        data_source: 'manual_override',
        cached: true,
      };
    }

    // 2. Check cache freshness
    const cacheAge = driver.hosDataSyncedAt
      ? Date.now() - driver.hosDataSyncedAt.getTime()
      : Infinity;
    const isCacheFresh = cacheAge < 5 * 60 * 1000; // 5 minutes

    if (isCacheFresh && driver.hosData) {
      return {
        ...(driver.hosData as any),
        cached: true,
        cache_age_seconds: Math.floor(cacheAge / 1000),
      };
    }

    // 3. Fetch from ELD with retry
    try {
      const hosData = await this.retry.withRetry(
        async () => {
          const integration = await this.prisma.integrationConfig.findFirst({
            where: {
              tenantId,
              integrationType: 'HOS_ELD',
              status: 'ACTIVE',
            },
          });

          if (!integration) {
            throw new Error('No active HOS integration configured');
          }

          const apiToken = this.getCredentialField(
            integration.credentials,
            'apiToken',
          );

          // TODO: Implement HOS data fetching via Samsara ELD API
          // The getDriverHOS method needs to be added to SamsaraELDAdapter
          // or HOS data should be retrieved differently
          this.logger.warn('HOS data fetching not yet implemented - returning mock data');

          // Return mock HOS data for now
          return {
            data_source: 'mock',
            cached: false,
            hoursRemaining: 10,
            cycleRemaining: 60,
            lastUpdate: new Date().toISOString(),
          } as HOSData;
        },
        {
          maxAttempts: 3,
          baseDelayMs: 1000,
          maxDelayMs: 10000,
          exponentialBase: 2,
        },
        `getDriverHOS(${driverId})`,
      );

      // Update cache
      await this.prisma.driver.update({
        where: { id: driver.id },
        data: {
          hosData: hosData as any,
          hosDataSyncedAt: new Date(),
          hosDataSource: hosData.data_source,
          lastSyncedAt: new Date(),
        },
      });

      return hosData;
    } catch (error) {
      // 4. Fall back to stale cache
      if (driver.hosData) {
        this.logger.warn(
          `Failed to fetch HOS for ${driverId}, using stale cache: ${error.message}`,
        );
        return {
          ...(driver.hosData as any),
          cached: true,
          stale: true,
          cache_age_seconds: Math.floor(cacheAge / 1000),
          error: error.message,
        };
      }

      throw new Error(
        `No HOS data available for driver ${driverId}: ${error.message}`,
      );
    }
  }

  /**
   * Test connection to external system
   */
  async testConnection(integrationId: string): Promise<boolean> {
    const integration = await this.prisma.integrationConfig.findUnique({
      where: { integrationId },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    try {
      let success = false;

      // Test connection based on vendor - use dynamic credential field names
      if (
        integration.vendor === 'SAMSARA_ELD' ||
        integration.vendor === 'KEEPTRUCKIN_ELD' ||
        integration.vendor === 'MOTIVE_ELD'
      ) {
        // These vendors use 'apiToken' field
        const apiToken = this.getCredentialField(
          integration.credentials,
          'apiToken',
        );
        success = await this.samsaraAdapter.testConnection(apiToken);
      } else if (
        integration.vendor === 'MCLEOD_TMS' ||
        integration.vendor === 'TMW_TMS'
      ) {
        // These vendors use 'apiKey' and 'baseUrl' fields
        const apiKey = this.getCredentialField(
          integration.credentials,
          'apiKey',
        );
        const baseUrl = this.getCredentialField(
          integration.credentials,
          'baseUrl',
        );
        success = await this.mcleodAdapter.testConnection(apiKey, baseUrl);
      } else if (integration.vendor === 'PROJECT44_TMS') {
        // This vendor uses 'clientId' and 'clientSecret' fields
        const clientId = this.getCredentialField(
          integration.credentials,
          'clientId',
        );
        const clientSecret = this.getCredentialField(
          integration.credentials,
          'clientSecret',
        );
        success = await this.project44Adapter.testConnection(
          clientId,
          clientSecret,
        );
      } else if (
        integration.vendor === 'GASBUDDY_FUEL' ||
        integration.vendor === 'FUELFINDER_FUEL' ||
        integration.vendor === 'OPENWEATHER'
      ) {
        // These vendors use 'apiKey' field
        const apiKey = this.getCredentialField(
          integration.credentials,
          'apiKey',
        );
        if (integration.vendor === 'GASBUDDY_FUEL') {
          success = await this.gasBuddyAdapter.testConnection(apiKey);
        } else if (integration.vendor === 'FUELFINDER_FUEL') {
          // FuelFinder adapter was removed (unused) - only GasBuddy is supported
          throw new Error('FuelFinder integration is not supported - use GasBuddy instead');
        } else {
          success = await this.openWeatherAdapter.testConnection(apiKey);
        }
      } else {
        throw new Error(`Unsupported vendor: ${integration.vendor}`);
      }

      // Update integration status
      await this.prisma.integrationConfig.update({
        where: { id: integration.id },
        data: {
          status: success ? 'ACTIVE' : 'ERROR',
          lastSuccessAt: success ? new Date() : integration.lastSuccessAt,
          lastErrorAt: success ? integration.lastErrorAt : new Date(),
          lastErrorMessage: success
            ? null
            : 'Connection test failed - check credentials',
        },
      });

      return success;
    } catch (error) {
      await this.prisma.integrationConfig.update({
        where: { id: integration.id },
        data: {
          status: 'ERROR',
          lastErrorAt: new Date(),
          lastErrorMessage: error.message,
        },
      });

      return false;
    }
  }

  /**
   * Sync driver HOS data (called by scheduler)
   */
  async syncDriverHOS(tenantId: number, driverId: string): Promise<void> {
    try {
      await this.getDriverHOS(tenantId, driverId);
    } catch (error) {
      // Track failure
      await this.recordSyncFailure(tenantId, 'HOS_SYNC', error);

      // Send alert on repeated failures (3+ in last 60 minutes)
      const recentFailures = await this.getRecentFailureCount(
        tenantId,
        'HOS_SYNC',
        60,
      );

      if (recentFailures >= 3) {
        try {
          await this.alertService.sendAlert(
            {
              title: 'Integration Sync Failing',
              message: `HOS sync has failed ${recentFailures} times in the last hour. Please check your integration configuration.`,
              severity: AlertSeverity.ERROR,
              context: {
                tenantId,
                driverId,
                failureCount: recentFailures,
                error: error.message,
                timestamp: new Date().toISOString(),
              },
            },
            tenantId,
          );
        } catch (alertError) {
          // Don't block on alert sending failures
          this.logger.error(`Failed to send alert: ${alertError.message}`);
        }
      }

      console.error(`Failed to sync HOS for driver ${driverId}:`, error);
      throw error;
    }
  }

  /**
   * Sync all drivers for a tenant
   */
  async syncAllDriversForTenant(tenantId: number): Promise<void> {
    const drivers = await this.prisma.driver.findMany({
      where: {
        tenantId,
        isActive: true,
        hosManualOverride: null, // Skip manually overridden drivers (null = no override)
      },
    });

    console.log(
      `Syncing HOS for ${drivers.length} drivers (tenant ${tenantId})`,
    );

    const results = await Promise.allSettled(
      drivers.map((driver) => this.syncDriverHOS(tenantId, driver.driverId)),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(
      `HOS sync complete for tenant ${tenantId}: ${succeeded} succeeded, ${failed} failed`,
    );
  }

  /**
   * Extract and decrypt a specific credential field
   */
  private getCredentialField(credentials: any, fieldName: string): string {
    if (!credentials || !credentials[fieldName]) {
      throw new Error(`Invalid credentials - ${fieldName} missing`);
    }

    try {
      return this.credentials.decrypt(credentials[fieldName]);
    } catch {
      // If not encrypted, return as-is (for development)
      return credentials[fieldName];
    }
  }

  /**
   * Extract API key from encrypted credentials JSON (legacy - kept for backward compatibility)
   */
  private getApiKeyFromCredentials(credentials: any): string {
    return this.getCredentialField(credentials, 'apiKey');
  }

  /**
   * Extract API secret from encrypted credentials JSON (legacy - kept for backward compatibility)
   */
  private getApiSecretFromCredentials(credentials: any): string {
    return this.getCredentialField(credentials, 'apiSecret');
  }

  /**
   * Record a sync failure in the integration sync log
   */
  private async recordSyncFailure(
    tenantId: number,
    syncType: string,
    error: Error,
  ): Promise<void> {
    try {
      // Find the active HOS integration for this tenant
      const integration = await this.prisma.integrationConfig.findFirst({
        where: {
          tenantId,
          integrationType: 'HOS_ELD',
          status: 'ACTIVE',
        },
      });

      if (integration) {
        // Create a sync log entry
        await this.prisma.integrationSyncLog.create({
          data: {
            logId: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            integrationId: integration.id,
            syncType,
            startedAt: new Date(),
            completedAt: new Date(),
            status: 'failed',
            recordsProcessed: 0,
            recordsCreated: 0,
            recordsUpdated: 0,
            errorDetails: {
              message: error.message,
              stack: error.stack,
            },
          },
        });
      }

      this.logger.error(
        `Sync failure: ${syncType} for tenant ${tenantId}: ${error.message}`,
      );
    } catch (logError) {
      // Don't block on logging failures
      this.logger.error(`Failed to record sync failure: ${logError.message}`);
    }
  }

  /**
   * Get count of recent sync failures for a tenant
   */
  private async getRecentFailureCount(
    tenantId: number,
    syncType: string,
    minutes: number,
  ): Promise<number> {
    const since = new Date(Date.now() - minutes * 60 * 1000);

    try {
      const count = await this.prisma.integrationSyncLog.count({
        where: {
          integration: { tenantId },
          syncType,
          status: 'failed',
          startedAt: { gte: since },
        },
      });

      return count;
    } catch (error) {
      this.logger.error(`Failed to get recent failure count: ${error.message}`);
      return 0;
    }
  }
}
